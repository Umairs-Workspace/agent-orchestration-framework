// Milestone 36 · story 00 tasks 02/03 (@manual) — the REAL supervision runtime that
// the Tauri shell (`main.rs`) drives the cargo-tested pure seams with. This is the
// wiring `aof:verify 36`'s blocker F1 named as missing: a live `mesh status --json`
// poll on a cadence, a role-driven watchdog over real `tokio::process` children with
// jittered-backoff restart + named-clean-exit handling, and a Windows Job-Object
// kill-on-close containment so Quit/crash reaps the whole child tree.
//
// It owns NO decisions of its own — every choice (which children for this role, the
// backoff curve, the crash-vs-clean-exit classification, the four render states, the
// trusted co-located `aof` path) is COMPUTED by `mesh_desktop_core` and already
// `cargo test`-covered. This module only turns those decisions into real OS effects:
// spawn/wait/kill, a timer, a Job Object, a channel. Fleet data still flows through
// exactly one command — `aof mesh status --json` (ADR-004 d1-2) — and the only other
// spawns are the {serve, ui} LOCAL supervision lifecycle (ADR-004 d3); no bare-PATH /
// shell-string spawn exists (every `Command::new` takes the RESOLVED absolute path,
// ADR-004 d4 / `acd-desktop-trusted-spawn`).

use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use mesh_desktop_core::poll::FleetDataCommand;
use mesh_desktop_core::render_state::{select_render_state, FetchOutcome, PriorGoodFrame, RenderState};
use mesh_desktop_core::resolve::{form_argv_spawn, form_child_spawn, resolve_aof, ResolveEnv, ResolvedAof};
use mesh_desktop_core::status::{parse_status, MeshStatus};
use mesh_desktop_core::supervision::{
    classify_exit, jittered_backoff_ms, notice_after_start, reconcile, JitterSource, LiveController,
    StandingNotice, SupervisedChild, MESH_SERVE_ID, MESH_UI_ID,
};

use tauri::AppHandle;
use tokio::io::AsyncReadExt;
use tokio::process::Command;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tokio::sync::Notify;

/// The web `aof mesh ui`'s real local URL (`src/mesh-ui-serve.mjs`: `http.createServer`
/// bound to `127.0.0.1`, default port 4181) — the address the tray's "Open web UI"
/// launches in the default browser.
///
/// The app is a PATH-routed SPA (milestone 45 / ADR-001, ADR-002): `/` renders the shell
/// landing, `/fleet` the fleet, `/board` the board, `/config` the config editor. The
/// warning that stood here — that the bare `/` renders BLANK and the URL therefore MUST
/// carry `?mode=fleet&scope=global` — is RETIRED: `/` is now a real address with a real
/// surface behind it. This constant still targets `/fleet` DIRECTLY rather than `/`,
/// because the tray's "Open web UI" means "show me the fleet", and landing one click away
/// from it would be a worse door, not a more honest one. The scope rides as an ordinary
/// query parameter on that path — the exact URL `aof mesh ui` itself advertises
/// (`src/commands/mesh-ui.mjs` sets `scope` on `serveMeshUi`'s `/fleet` URL; `global` is
/// the default scope for the plain `mesh ui` the supervisor spawns).
///
/// The legacy `?mode=fleet&scope=global` address a PREVIOUSLY SHIPPED build compiled into
/// this same constant still works: the entry translates it once, client-side, onto this
/// URL (ADR-003, which sets no expiry precisely because this constant is compiled).
///
/// The supervisor starts `aof mesh ui` on this port (the CLI default), so the URL is
/// known without a second data path.
pub const MESH_UI_URL: &str = "http://127.0.0.1:4181/fleet?scope=global";

/// How often the single fleet-data poll re-issues `aof mesh status --json` (DESIGN
/// §Footer "refreshed Ns ago"). One poll feeds BOTH the fleet view and the
/// `isControlNode` role decision (ADR-004 d1-2 / ADR-002 d1) — no second cadence.
const POLL_INTERVAL: Duration = Duration::from_secs(3);

/// `CREATE_NO_WINDOW` — keep the supervised `aof`/Node children from flashing a
/// console window on the operator's desktop (they are ambient background processes).
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// The live supervisor state the IPC layer reads. Populated by the poll (fleet + role
/// + render state) and by the per-child watchdogs (the local-process signals). The two
/// DESIGN ramps stay separate here: `last_good_status`/`render_state` are FLEET
/// PRESENCE; `server_signal`/`ui_signal` are the LOCAL-process ramp (DESIGN
/// §Non-negotiable framing).
pub struct SupervisorState {
    pub last_good_status: Option<MeshStatus>,
    pub is_control_node: bool,
    pub render_state: RenderState,
    pub ever_populated: bool,
    /// "running" | "restarting" | "stopped" per supervised child, keyed by its id
    /// (126/ADR-006 §2). ONE map rather than a field per child: two fixed fields could
    /// only ever name the two daemons, and a third "for loops" would be the same match
    /// one level down. The two daemons hold RESERVED ids, so `server_signal()` and
    /// `ui_signal()` are accessors over this map and every existing consumer reads the
    /// value it read before.
    pub signals: BTreeMap<String, &'static str>,
    /// The ONE notice standing in the window footer, carrying the id of the child it
    /// names so a sibling's restart never clears it.
    pub standing_notice: Option<StandingNotice>,
    pub window_visible: bool,
    pub ui_url: String,
}

impl SupervisorState {
    /// One child's ramp signal — "stopped" for a child that has never reported, which
    /// is what a not-yet-started child is.
    pub fn signal(&self, id: &str) -> &'static str {
        self.signals.get(id).copied().unwrap_or("stopped")
    }
    /// The local Mesh-server ramp signal, by its reserved id.
    pub fn server_signal(&self) -> &'static str {
        self.signal(MESH_SERVE_ID)
    }
    /// The local Mesh web-UI ramp signal, by its reserved id.
    pub fn ui_signal(&self) -> &'static str {
        self.signal(MESH_UI_ID)
    }
    /// The standing notice's text, as the IPC view-model's plain-string `notice`.
    pub fn notice(&self) -> Option<String> {
        self.standing_notice.as_ref().map(|n| n.text.clone())
    }
}

impl Default for SupervisorState {
    fn default() -> Self {
        let mut signals = BTreeMap::new();
        signals.insert(MESH_SERVE_ID.to_string(), "stopped");
        signals.insert(MESH_UI_ID.to_string(), "stopped");
        SupervisorState {
            last_good_status: None,
            is_control_node: false,
            render_state: RenderState::Loading,
            ever_populated: false,
            signals,
            standing_notice: None,
            window_visible: true,
            ui_url: MESH_UI_URL.to_string(),
        }
    }
}

pub type SharedState = Arc<Mutex<SupervisorState>>;

/// The live controller map, keyed by declaration id. The two seeded daemons are its
/// two statically-seeded members; declarations are created and retired by the
/// reconcile (126/ADR-006 §3).
type Controllers = Arc<Mutex<HashMap<String, Arc<ChildController>>>>;

/// Commands the IPC layer (tray menu / window buttons) sends into the running engine.
/// Every command is LOCAL process supervision — never a fleet mutation (ADR-004 d3).
/// Addressed BY ID rather than naming two fixed children, and each places a HOLD the
/// reconcile reads (126/ADR-006 §5).
#[derive(Debug, Clone)]
pub enum SupervisorCommand {
    Start(String),
    Stop(String),
}

/// The terminal outcome of one supervised-child wait: the child exited (carrying its
/// status), or a Stop was requested (kill it).
enum WaitResult {
    Exited(std::io::Result<std::process::ExitStatus>),
    Stop,
}

/// A real system `ResolveEnv` — supplies the actual `PATH` for the dev/unpackaged
/// FALLBACK only (the packaged path is the absolute co-located sibling, resolved with
/// NO PATH search — ADR-004 d4). The pure `resolve_aof` seam owns the co-located-first
/// logic; this only feeds it the real environment.
struct SystemEnv;

impl ResolveEnv for SystemEnv {
    fn path_dirs(&self) -> Vec<PathBuf> {
        std::env::var_os("PATH")
            .map(|p| std::env::split_paths(&p).collect())
            .unwrap_or_default()
    }
}

/// Resolve the sibling `aof` binary by its ABSOLUTE co-located path (ADR-004 d4) — the
/// trusted-spawn surface. The returned path is a VARIABLE the spawns below pass to
/// `Command::new`, never a bare `"aof"` literal.
fn resolve(install_dir: &Path) -> ResolvedAof {
    resolve_aof(install_dir, &SystemEnv)
}

/// A per-child watchdog controller: its desired running-state (flipped by Start/Stop
/// or by a reconcile), the HOLD that stops a tick driving it, and a notify to wake the
/// supervised loop on a state change.
struct ChildController {
    spec: SupervisedChild,
    desired: AtomicBool,
    /// Once something has SPOKEN for this child — an operator Start/Stop, or a named
    /// clean exit — a tick no longer drives its `desired` (126/ADR-006 §5, the role
    /// latch's `role_started` property given a name). Nothing clears a hold; it is
    /// released with the row, when the reconcile retires the controller.
    held: AtomicBool,
    /// Set when the reconcile retires this controller so its watchdog task ends rather
    /// than parking forever on a child nobody declares any more.
    retired: AtomicBool,
    notify: Notify,
}

impl ChildController {
    fn new(spec: SupervisedChild) -> Self {
        ChildController {
            spec,
            desired: AtomicBool::new(false),
            held: AtomicBool::new(false),
            retired: AtomicBool::new(false),
            notify: Notify::new(),
        }
    }
    fn set_desired(&self, on: bool) {
        self.desired.store(on, Ordering::SeqCst);
        self.notify.notify_one();
    }
    fn desired(&self) -> bool {
        self.desired.load(Ordering::SeqCst)
    }
    fn hold(&self) {
        self.held.store(true, Ordering::SeqCst);
    }
    fn held(&self) -> bool {
        self.held.load(Ordering::SeqCst)
    }
    fn retire(&self) {
        self.retired.store(true, Ordering::SeqCst);
        self.set_desired(false);
    }
    fn retired(&self) -> bool {
        self.retired.load(Ordering::SeqCst)
    }
    /// This controller as the reconcile sees it — its id, whether it is desired and
    /// whether it is held, and nothing about why it stopped.
    fn live(&self) -> LiveController {
        LiveController { id: self.spec.id.clone(), desired: self.desired(), held: self.held() }
    }
}

// ------------------------------------------------------------------------------------
// Windows Job Object — the child-tree reaper (ADR-002 d3 / RESEARCH §2).
// ------------------------------------------------------------------------------------

/// A shareable owner of the kill-on-close Job Object. The handle is a plain `isize`
/// wrapped by `win32job`; sharing it across watchdog tasks is sound (the Win32
/// AssignProcessToJobObject call is thread-safe), so a manual Send/Sync is safe here.
#[cfg(windows)]
struct SharedJob(win32job::Job);
#[cfg(windows)]
unsafe impl Send for SharedJob {}
#[cfg(windows)]
unsafe impl Sync for SharedJob {}

/// Create the containment Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` set, so
/// closing/dropping the handle — on Quit OR on the supervisor's OWN crash/exit (the OS
/// closes every handle on process termination) — reaps every process in the job
/// transitively (`aof`, its Node child, grandchildren). `None` on failure degrades to
/// "supervise without containment" rather than refusing to run.
#[cfg(windows)]
fn create_job() -> Option<Arc<SharedJob>> {
    let job = win32job::Job::create().ok()?;
    let mut info = job.query_extended_limit_info().ok()?;
    info.limit_kill_on_job_close();
    job.set_extended_limit_info(&info).ok()?;
    Some(Arc::new(SharedJob(job)))
}

/// Assign a freshly-spawned child to the kill-on-close job so it (and its whole tree)
/// is reaped when the job handle drops. A bare `child.kill()` would signal only the
/// direct child, orphaning the Node process's descendants (RESEARCH §2) — the Job
/// Object is the correct Windows primitive.
#[cfg(windows)]
fn assign_to_job(job: &Option<Arc<SharedJob>>, child: &tokio::process::Child) {
    if let (Some(job), Some(handle)) = (job.as_ref(), child.raw_handle()) {
        let _ = job.0.assign_process(handle as isize);
    }
}

// A non-Windows build (ADR-001 portable-core posture) supervises without the Win32
// Job Object — a later macOS/Linux tray swaps a process-group/cgroup behind the same
// neutral "reap the supervised tree" seam.
#[cfg(not(windows))]
type SharedJob = ();
#[cfg(not(windows))]
fn create_job() -> Option<Arc<SharedJob>> {
    None
}
#[cfg(not(windows))]
fn assign_to_job(_job: &Option<Arc<SharedJob>>, _child: &tokio::process::Child) {}

// ------------------------------------------------------------------------------------
// Jitter — a real, non-fixed jitter source for the restart backoff (ADR-002 d2).
// ------------------------------------------------------------------------------------

/// A small xorshift jitter source seeded from the wall clock — the RUN-TIME jitter the
/// pure `jittered_backoff_ms` seam consumes, so successive restart delays are never a
/// fixed value (the deterministic `FixedJitter` is the test seam; this is production).
struct SystemJitter {
    state: u64,
}

impl SystemJitter {
    fn new(seed: u64) -> Self {
        SystemJitter { state: seed | 1 }
    }
}

impl JitterSource for SystemJitter {
    fn next_unit(&mut self) -> f64 {
        // xorshift64 → a value in [0.0, 1.0).
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        ((x >> 11) as f64) / ((1u64 << 53) as f64)
    }
}

fn seed_for(id: &str) -> u64 {
    let base = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0x9E37_79B9_7F4A_7C15);
    // A cheap FNV-1a over the id, so two children never share a jitter sequence.
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in id.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x0000_0100_0000_01B3);
    }
    base ^ hash
}

// ------------------------------------------------------------------------------------
// The engine.
// ------------------------------------------------------------------------------------

/// Spawn the supervisor engine on its OWN dedicated multi-thread tokio runtime (a
/// background OS thread), returning the command channel the IPC layer drives it with.
/// A dedicated runtime keeps full control of the process + timer drivers `tokio::process`
/// needs, independent of Tauri's own event loop.
pub fn spawn_engine(app: AppHandle, install_dir: PathBuf, shared: SharedState) -> UnboundedSender<SupervisorCommand> {
    let (tx, rx) = unbounded_channel();
    std::thread::Builder::new()
        .name("mesh-supervisor".into())
        .spawn(move || {
            let rt = tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()
                .expect("build the supervisor tokio runtime");
            rt.block_on(engine_main(app, install_dir, shared, rx));
        })
        .expect("spawn the supervisor thread");
    tx
}

async fn engine_main(
    app: AppHandle,
    install_dir: PathBuf,
    shared: SharedState,
    mut rx: UnboundedReceiver<SupervisorCommand>,
) {
    let job = create_job();

    // The two mesh daemons are the supervised set's two STATICALLY SEEDED members
    // (126/ADR-005 §7): they are not supplied, because `mesh status` — the command the
    // supplied rows are read through — is one of them, and a set that included the
    // process the set is read through has a bootstrap with no base case. `mesh ui` runs
    // on every node (started immediately, per SPEC/RESEARCH §3); `mesh serve --serve`
    // only on a control node (started by the poll's role latch once `isControlNode` is
    // confirmed). Declarations are created and retired by the reconcile, never here.
    let controllers: Controllers = Arc::new(Mutex::new(HashMap::new()));
    let ui = Arc::new(ChildController::new(SupervisedChild::mesh_ui()));
    let server = Arc::new(ChildController::new(SupervisedChild::mesh_serve()));
    ui.desired.store(true, Ordering::SeqCst);
    {
        let mut map = controllers.lock().unwrap();
        map.insert(ui.spec.id.clone(), ui.clone());
        map.insert(server.spec.id.clone(), server.clone());
    }

    tokio::spawn(supervise_child(app.clone(), install_dir.clone(), job.clone(), ui.clone(), shared.clone()));
    tokio::spawn(supervise_child(app.clone(), install_dir.clone(), job.clone(), server.clone(), shared.clone()));
    tokio::spawn(poll_loop(
        app.clone(),
        install_dir.clone(),
        job.clone(),
        shared.clone(),
        controllers.clone(),
    ));

    while let Some(cmd) = rx.recv().await {
        // Start and Stop are addressed by id, and each places a HOLD — the flag the
        // reconcile reads, so a tick never drives a child the operator has spoken for.
        let (id, on) = match cmd {
            SupervisorCommand::Start(id) => (id, true),
            SupervisorCommand::Stop(id) => (id, false),
        };
        let target = controllers.lock().unwrap().get(&id).cloned();
        if let Some(ctl) = target {
            ctl.hold();
            ctl.set_desired(on);
        }
    }
}

/// Apply ONE reconcile plan to the live controller map: start what is declared and not
/// running, stop what is running and no longer declared, leave everything else alone.
/// The decision itself is `mesh_desktop_core::supervision::reconcile` — a pure function
/// `cargo test` reaches; this only turns its answer into real controllers and tasks.
fn apply_plan(
    app: &AppHandle,
    install_dir: &Path,
    job: &Option<Arc<SharedJob>>,
    shared: &SharedState,
    controllers: &Controllers,
    rows: &[SupervisedChild],
) {
    let live: Vec<LiveController> = controllers.lock().unwrap().values().map(|c| c.live()).collect();
    let plan = reconcile(rows, &live);

    for id in &plan.stop {
        let retired = controllers.lock().unwrap().remove(id);
        if let Some(ctl) = retired {
            ctl.retire();
        }
        shared.lock().unwrap().signals.remove(id);
    }

    for id in &plan.start {
        let existing = controllers.lock().unwrap().get(id).cloned();
        match existing {
            // Already supervised, merely not running — the level-triggered restart.
            Some(ctl) => ctl.set_desired(true),
            None => {
                let Some(row) = rows.iter().find(|row| &row.id == id) else { continue };
                let ctl = Arc::new(ChildController::new(row.clone()));
                ctl.set_desired(true);
                controllers.lock().unwrap().insert(id.clone(), ctl.clone());
                tokio::spawn(supervise_child(
                    app.clone(),
                    install_dir.to_path_buf(),
                    job.clone(),
                    ctl,
                    shared.clone(),
                ));
            }
        }
    }
    // `plan.retain` is the steady state and is deliberately not acted on.
}

/// The single fleet-data poll (ADR-004 d1-2): re-issue `aof mesh status --json` once
/// per cadence tick, feeding `last_good_status` + `render_state` (keep-last-good on a
/// miss) and latching the control-node server start off the SAME poll's `isControlNode`.
async fn poll_loop(
    app: AppHandle,
    install_dir: PathBuf,
    job: Option<Arc<SharedJob>>,
    shared: SharedState,
    controllers: Controllers,
) {
    let mut interval = tokio::time::interval(POLL_INTERVAL);
    let mut tick: u32 = 0;
    loop {
        interval.tick().await;
        tick = tick.saturating_add(1);

        // ONE interval, ONE command, two freshnesses (126/ADR-005 §2): the declarations
        // answer rides every tenth tick of this same poll as a FLAG on the same verb —
        // never a second cadence and never a second data-bearing command.
        let command = FleetDataCommand::for_tick(tick);

        let resolved = resolve(&install_dir);
        let spawn = form_argv_spawn(&resolved, &command.argv, None);
        let mut cmd = Command::new(&spawn.program);
        cmd.args(&spawn.args);
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let parsed: Option<MeshStatus> = match cmd.output().await {
            Ok(out) if out.status.success() => parse_status(&String::from_utf8_lossy(&out.stdout)).ok(),
            _ => None,
        };

        // Read the supplied rows out of the SAME parsed document, before it is moved
        // into `last_good_status` — one poll, one parse, one answer.
        // A reconcile runs only on an ANSWER (126/ADR-005 §6, AMENDED): a poll that failed,
        // a document from an older aof that carries no `declarations` key, and one whose
        // resolver could not open the store all leave `supplied` as `None`, and the
        // supervisor changes nothing that tick. An unreadable store must never read as
        // "this node declares nothing", which a reconcile would turn into "stop everything".
        let supplied: Option<Vec<SupervisedChild>> = match (command.carries_declarations(), parsed.as_ref()) {
            (true, Some(status)) if status.declarations_answered() => Some(status.declaration_children()),
            _ => None,
        };

        // Read the role decision out of the SAME locked update — no second lock (one
        // poll feeds both the render state and the isControlNode role, ADR-004 d1-2).
        let is_control = {
            let mut g = shared.lock().unwrap();
            let prior = if g.ever_populated { PriorGoodFrame::Populated } else { PriorGoodFrame::None };
            match parsed {
                Some(status) => {
                    let n = status.nodes.len() as u32;
                    g.render_state = select_render_state(FetchOutcome::Ok { node_count: n }, prior);
                    if n > 0 {
                        g.ever_populated = true;
                    }
                    g.is_control_node = status.is_control_node();
                    g.last_good_status = Some(status);
                }
                None => {
                    g.render_state = select_render_state(FetchOutcome::Failed, prior);
                }
            }
            g.is_control_node
        };

        // Role latch (36/ADR-002 d1) — the ONE admitted use of `is_control_node` in this
        // crate, and the base case 126/ADR-005 §7 keeps: once the poll confirms this is
        // a control node, start the server ONCE. After that it is HELD, so only an
        // explicit Start/Stop touches it and a manual Stop is never overridden by the
        // next poll. It selects no supervised SET.
        if is_control {
            let server = controllers.lock().unwrap().get(MESH_SERVE_ID).cloned();
            if let Some(server) = server {
                if !server.held() {
                    server.hold();
                    server.set_desired(true);
                }
            }
        }

        if let Some(rows) = supplied {
            apply_plan(&app, &install_dir, &job, &shared, &controllers, &rows);
        }

        refresh_tray(&app, &shared);
    }
}

/// One supervised child's watchdog loop (ADR-002 d2): keep it running while desired,
/// restart a genuine crash under jittered exponential backoff, and SURFACE — never
/// tight-loop — a named clean-exit-1. Every spawn is the resolved absolute `aof` path
/// assigned to the kill-on-close Job Object.
async fn supervise_child(
    app: AppHandle,
    install_dir: PathBuf,
    job: Option<Arc<SharedJob>>,
    ctl: Arc<ChildController>,
    shared: SharedState,
) {
    let id = ctl.spec.id.clone();
    let mut attempt: u32 = 0;
    let mut jitter = SystemJitter::new(seed_for(&id));

    loop {
        if ctl.retired() {
            // Take this declaration's ramp signal out with it. The reconcile removed the
            // entry when it retired the controller, but the watchdog writes "stopped" on
            // its way out of the wait — so without this the map keeps one dead entry per
            // finished loop, forever, in a process that runs for days.
            shared.lock().unwrap().signals.remove(&id);
            refresh_tray(&app, &shared);
            return;
        }
        if !ctl.desired() {
            set_signal(&shared, &id, "stopped");
            refresh_tray(&app, &shared);
            // Park until a Start (or a reconcile) flips desired true — or until this
            // controller is retired, when there is nothing left to supervise.
            while !ctl.desired() && !ctl.retired() {
                ctl.notify.notified().await;
            }
            continue;
        }

        let resolved = resolve(&install_dir);
        // The spawn FORM is the core's (126/ADR-006 contract-beat §6): the resolved
        // absolute path, a shell-less argv, and the working directory from THIS CHILD'S
        // OWN `cwd` and from nowhere else — `None` for the two seeded daemons, the row's
        // own `projectRoot` for a declaration, so identity comes from the workspace and
        // never from the supervisor's launch directory.
        let spawn = form_child_spawn(&resolved, &ctl.spec);
        let mut cmd = Command::new(&spawn.program);
        cmd.args(&spawn.args);
        if let Some(dir) = &spawn.cwd {
            cmd.current_dir(dir);
        }
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let mut child = match cmd.spawn() {
            Ok(child) => child,
            Err(_) => {
                // Could not spawn (aof not resolvable in a dev/unpackaged run) — back
                // off like a crash rather than a tight loop.
                attempt += 1;
                let backoff = jittered_backoff_ms(attempt, &mut jitter);
                set_signal(&shared, &id, "restarting");
                refresh_tray(&app, &shared);
                sleep_or_wake(&ctl, backoff).await;
                continue;
            }
        };
        assign_to_job(&job, &child);
        attempt = 0;
        set_signal(&shared, &id, "running");
        // A successful (re)start clears only THIS child's notice — the reason is stale
        // once it is running again, but a sibling's halt line is not (126/ADR-006
        // contract-beat §3; the blanket clear this replaces would wipe it, and N
        // children make that routine).
        {
            let mut g = shared.lock().unwrap();
            let next = notice_after_start(g.standing_notice.as_ref(), &id);
            g.standing_notice = next;
        }
        refresh_tray(&app, &shared);

        // Drain both pipes continuously (bounded tail) so a long-lived child never
        // deadlocks on a full pipe buffer, while still capturing the message a fast
        // exit-1 prints for classification.
        let out_handle = tokio::spawn(read_tail(child.stdout.take()));
        let err_handle = tokio::spawn(read_tail(child.stderr.take()));

        // Wait for the child to exit OR a Stop to be requested. A spurious wake (e.g.
        // Start while already running) re-enters the wait rather than abandoning the
        // running child — the reader handles are consumed exactly once, after the loop.
        let result = loop {
            tokio::select! {
                status = child.wait() => break WaitResult::Exited(status),
                _ = ctl.notify.notified() => {
                    if !ctl.desired() {
                        break WaitResult::Stop;
                    }
                }
            }
        };

        match result {
            WaitResult::Exited(status) => {
                let msg = format!(
                    "{}\n{}",
                    out_handle.await.unwrap_or_default(),
                    err_handle.await.unwrap_or_default()
                );
                handle_exit(
                    &shared,
                    &ctl,
                    status.map(|s| s.success()).unwrap_or(false),
                    &msg,
                    &mut attempt,
                );
                if matches!(get_signal(&shared, &id), "restarting") {
                    let backoff = jittered_backoff_ms(attempt, &mut jitter);
                    refresh_tray(&app, &shared);
                    sleep_or_wake(&ctl, backoff).await;
                }
            }
            WaitResult::Stop => {
                out_handle.abort();
                err_handle.abort();
                let _ = child.start_kill();
                let _ = child.wait().await;
                set_signal(&shared, &id, "stopped");
            }
        }
        refresh_tray(&app, &shared);
    }
}

/// Apply the core's exit classification (36/ADR-002 d2, 126/ADR-006 §6-§7). The
/// DECISION — the named reason, the ramp signal, the notice to raise, and whether a
/// HOLD is placed — is `classify_exit`, a pure function `cargo test` reaches; this only
/// applies it. It is handed `success`, never an exit code: a code here would be the
/// exit-code rule ADR-006 §4 forbids, one seam over from the reconcile that reads the
/// hold this places.
fn handle_exit(shared: &SharedState, ctl: &ChildController, success: bool, msg: &str, attempt: &mut u32) {
    let outcome = classify_exit(&ctl.spec.label, success, msg);

    if outcome.hold {
        ctl.hold();
    }
    if outcome.signal == "restarting" {
        // A genuine crash — mark restarting; the caller applies the backoff.
        *attempt += 1;
    } else {
        ctl.desired.store(false, Ordering::SeqCst);
    }
    set_signal(shared, &ctl.spec.id, outcome.signal);

    // A raised notice replaces the standing one; raising none leaves it alone.
    if let Some(text) = outcome.notice {
        shared.lock().unwrap().standing_notice =
            Some(StandingNotice { id: ctl.spec.id.clone(), text });
    }
}

/// Sleep for `backoff_ms`, waking early if the child's desired-state changes (so a Stop
/// during a backoff window doesn't wait out the whole delay before parking).
async fn sleep_or_wake(ctl: &ChildController, backoff_ms: u64) {
    tokio::select! {
        _ = tokio::time::sleep(Duration::from_millis(backoff_ms)) => {}
        _ = ctl.notify.notified() => {}
    }
}

/// Read a child pipe to EOF keeping only a bounded tail — drains continuously (no pipe
/// deadlock) and bounds memory for a long-lived child, while retaining the last lines a
/// fast exit-1 prints for `CleanExitReason::classify`.
async fn read_tail<R: tokio::io::AsyncRead + Unpin>(pipe: Option<R>) -> String {
    let mut tail = String::new();
    if let Some(mut r) = pipe {
        let mut chunk = [0u8; 1024];
        loop {
            match r.read(&mut chunk).await {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    tail.push_str(&String::from_utf8_lossy(&chunk[..n]));
                    if tail.len() > 8192 {
                        let cut = tail.len() - 4096;
                        tail = tail.split_off(cut);
                    }
                }
            }
        }
    }
    tail
}

fn set_signal(shared: &SharedState, id: &str, sig: &'static str) {
    shared.lock().unwrap().signals.insert(id.to_string(), sig);
}

fn get_signal(shared: &SharedState, id: &str) -> &'static str {
    shared.lock().unwrap().signal(id)
}

/// Rebuild the tray menu + icon from the current supervisor state, on the main thread
/// (the only thread that may touch the native tray on Windows). Called after every
/// state change (poll tick, child signal change) so the tray header/labels/icon reflect
/// reality, not a build-time snapshot.
pub fn refresh_tray(app: &AppHandle, shared: &SharedState) {
    let app = app.clone();
    let shared = shared.clone();
    let _ = app.clone().run_on_main_thread(move || {
        crate::rebuild_tray(&app, &shared);
    });
}
