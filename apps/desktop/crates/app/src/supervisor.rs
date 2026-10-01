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
// `aof` spawns are LOCAL supervision (ADR-004 d3): the {serve, ui} daemons, the
// supplied `work loop` declarations (126/ADR-006), and — since 130/ADR-004 — a
// declaration's own `--stop`, the request a Stop on its row makes before the tree kill
// (`taskkill`, the one non-`aof` spawn, the ladder's last rung). No bare-PATH /
// shell-string spawn exists (every `aof` `Command::new` takes the RESOLVED absolute
// path, ADR-004 d4 / `acd-desktop-trusted-spawn`).

use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use mesh_desktop_core::poll::FleetDataCommand;
use mesh_desktop_core::render_state::{select_render_state, FetchOutcome, PriorGoodFrame, RenderState};
use mesh_desktop_core::resolve::{form_argv_spawn, form_child_spawn, resolve_aof, ResolveEnv, ResolvedAof};
use mesh_desktop_core::status::{parse_status, MeshStatus};
use mesh_desktop_core::supervision::{
    attaches, classify_exit, is_reserved_id, jittered_backoff_ms, notice_after_start, reconcile, stop_argv,
    stop_refusal_notice, stop_step, CleanExitReason, JitterSource, LiveController, StandingNotice, StopStep,
    SupervisedChild, MESH_SERVE_ID, MESH_UI_ID, STOP_GRACE_MS,
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
    /// The rows of the last ANSWERED declarations tick (130/ADR-004 §1) — replaced on
    /// every answered tick and never cleared by a failed poll, so a declaration's label
    /// survives the two-in-three ticks that carry no declarations answer. The view
    /// model joins `signals` on id with this for the row's `label`; the reconcile is
    /// unchanged and reads the rows it is handed, never this copy.
    pub declared: Vec<SupervisedChild>,
    /// The ONE notice standing in the window footer, carrying the id of the child it
    /// names so a sibling's restart never clears it.
    pub standing_notice: Option<StandingNotice>,
    pub window_visible: bool,
    pub ui_url: String,
}

impl SupervisorState {
    /// The declarations this app supervises, as the window lists them (130/ADR-004 §1):
    /// one `(id, label, signal)` per NON-reserved id in the signals map, in map order,
    /// labelled by the last answered declarations tick's row of that id. A signal whose
    /// row has already gone — the instant between a retire and the watchdog's exit —
    /// is labelled by its id rather than dropped, so the list is exactly the map.
    pub fn loops(&self) -> Vec<(String, String, &'static str)> {
        self.signals
            .iter()
            .filter(|(id, _)| !is_reserved_id(id))
            .map(|(id, signal)| {
                let label = self
                    .declared
                    .iter()
                    .find(|row| &row.id == id)
                    .map(|row| row.label.clone())
                    .unwrap_or_else(|| id.clone());
                (id.clone(), label, *signal)
            })
            .collect()
    }
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
            declared: Vec::new(),
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
/// reconcile reads (126/ADR-006 §5). `Stop` of a DECLARATION id is one press on the
/// stop ladder (130/ADR-004 §2) — no new variant: the id says what it is.
#[derive(Debug, Clone)]
pub enum SupervisorCommand {
    Start(String),
    Stop(String),
}

/// The terminal outcome of one supervised-child wait: the child exited (carrying its
/// status), a daemon Stop was requested (kill it), or a declaration's stop ladder
/// reached its last rung (tree-kill it — 130/ADR-004 §3).
enum WaitResult {
    Exited(std::io::Result<std::process::ExitStatus>),
    Stop,
    Kill,
}

/// What one `--stop` spawn came back with, handed from the task that ran the verb to
/// the watchdog that asked for it. A landed answer says which rung asked — the request
/// or the cancel — because only the cancel starts the grace clock.
enum StopSpawnOutcome {
    /// Exit 0: the request, or its escalation, is on disk.
    Landed { cancel: bool },
    /// A failed spawn or a non-zero exit, with the verb's captured tail.
    Refused { tail: String },
}

/// The shell's bookkeeping for one declaration's stop ladder (130/ADR-004 §3): WHICH
/// press has been answered with a spawn, whether that spawn is still in flight, the
/// signal to restore if it is refused, and WHEN the cancel landed. The rung itself is
/// `stop_step`'s; this only remembers what the shell has already applied, so a
/// spurious wake never spawns the verb twice and two presses inside one spawn's
/// lifetime land in press order.
#[derive(Default)]
struct StopLadder {
    answered: u32,
    in_flight: bool,
    restore: Option<&'static str>,
    cancel_at: Option<Instant>,
}

impl StopLadder {
    /// Milliseconds since the cancel landed, or `None` before it has.
    fn since_cancel_ms(&self) -> Option<u64> {
        self.cancel_at.map(|at| at.elapsed().as_millis().min(u64::MAX as u128) as u64)
    }
    /// What is left of the grace — `None` before the cancel, zero at or past it.
    fn grace_left(&self) -> Option<Duration> {
        self.cancel_at.map(|at| Duration::from_millis(STOP_GRACE_MS).saturating_sub(at.elapsed()))
    }
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
    /// Stop presses on a DECLARATION (130/ADR-004 §2-§3): the desktop counts, the verb
    /// escalates. Never read for a reserved id, whose Stop is today's immediate kill.
    presses: AtomicU32,
    /// The last `--stop` spawn's answer, left here by the task that ran it for the
    /// watchdog to settle on its next wake.
    stop_outcome: Mutex<Option<StopSpawnOutcome>>,
    /// Set when this declaration's relaunch was refused because the loop is already
    /// running in another process (130/ADR-007): the row reports that loop and spawns
    /// nothing further. Like a hold, nothing clears it; it goes with the row.
    attached: AtomicBool,
    notify: Notify,
}

impl ChildController {
    fn new(spec: SupervisedChild) -> Self {
        ChildController {
            spec,
            desired: AtomicBool::new(false),
            held: AtomicBool::new(false),
            retired: AtomicBool::new(false),
            presses: AtomicU32::new(0),
            stop_outcome: Mutex::new(None),
            attached: AtomicBool::new(false),
            notify: Notify::new(),
        }
    }
    fn attach(&self) {
        self.attached.store(true, Ordering::SeqCst);
    }
    fn attached(&self) -> bool {
        self.attached.load(Ordering::SeqCst)
    }
    /// One press on the stop ladder — counted, and the watchdog woken to apply the rung.
    fn press(&self) {
        self.presses.fetch_add(1, Ordering::SeqCst);
        self.notify.notify_one();
    }
    fn presses(&self) -> u32 {
        self.presses.load(Ordering::SeqCst)
    }
    fn put_stop_outcome(&self, outcome: StopSpawnOutcome) {
        *self.stop_outcome.lock().unwrap() = Some(outcome);
        self.notify.notify_one();
    }
    fn take_stop_outcome(&self) -> Option<StopSpawnOutcome> {
        self.stop_outcome.lock().unwrap().take()
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
        // The one branch is `is_reserved_id`, the core's own predicate (130/ADR-004 §2):
        // a reserved id keeps today's immediate stop (`desired` off, the watchdog
        // kills); a declaration's Stop is one PRESS on the ladder the watchdog applies —
        // the request first, the tree kill last — and `desired` is never flipped by it,
        // because the child is to be asked before it is killed.
        let target = |id: &str| controllers.lock().unwrap().get(id).cloned();
        match cmd {
            SupervisorCommand::Start(id) => {
                if let Some(ctl) = target(&id) {
                    ctl.hold();
                    ctl.set_desired(true);
                }
            }
            SupervisorCommand::Stop(id) => {
                if let Some(ctl) = target(&id) {
                    ctl.hold();
                    if is_reserved_id(&id) {
                        ctl.set_desired(false);
                    } else {
                        ctl.press();
                    }
                }
            }
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
            // The last ANSWERED declarations tick's rows, kept for the view model's
            // labels (130/ADR-004 §1) — replaced only by an answer, so a failed poll and
            // the ticks that carry no declarations flag leave every row's label standing.
            if let Some(rows) = &supplied {
                g.declared = rows.clone();
            }
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
    let reserved = is_reserved_id(&id);
    let mut attempt: u32 = 0;
    let mut jitter = SystemJitter::new(seed_for(&id));
    // A declaration's stop ladder (130/ADR-004 §3). The rung is `stop_step`'s, a pure
    // function `cargo test` reaches; this is only what the shell has applied so far.
    let mut ladder = StopLadder::default();

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
        // AN ATTACHED ROW (130/ADR-007): the loop runs in another process — a console's
        // foreground loop — so there is no child to spawn, wait on or kill. Each press
        // drives the verb against that loop, one spawn per press, and the verb escalates
        // the level it finds on disk (drain, then cancel). There is no grace and no kill
        // rung: the cancel is carried out by the loop's own stop bracket, and a tree kill
        // would need a child this row does not hold. The pill reads `stopping` from the
        // first landed press until the reconcile retires the row — the loop's halt, whose
        // honoured mark drops it on the next declarations tick.
        if !reserved && ctl.attached() {
            if ladder.answered < ctl.presses() {
                ladder.answered += 1;
                if let Some(argv) = stop_argv(&ctl.spec) {
                    let cancel = matches!(stop_step(ladder.answered, None, STOP_GRACE_MS, false), StopStep::Cancel);
                    let restore = get_signal(&shared, &id);
                    set_signal(&shared, &id, "stopping");
                    refresh_tray(&app, &shared);
                    if let StopSpawnOutcome::Refused { tail } = run_stop_verb(&install_dir, &ctl, argv, cancel).await {
                        raise_notice(&shared, &ctl, &tail);
                        set_signal(&shared, &id, restore);
                    }
                    refresh_tray(&app, &shared);
                }
                continue;
            }
            while ladder.answered >= ctl.presses() && !ctl.retired() {
                ctl.notify.notified().await;
            }
            continue;
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

        // A press on a declaration whose child is NOT running — a backoff, or the gap
        // before a relaunch (130/ADR-004 §3; DESIGN §Surface 2's rung 1 from
        // `restarting`). The press is a `Request`, never "already exited": the verb is
        // spawned, and only then is the bracket closed as `Done`, because there is no
        // child to wait for — the verb marks a not-live loop's request honoured at once
        // (ADR-002 §3f), and that mark is what keeps the next tick from relaunching it.
        // Relaunching it HERE would be the supervisor fighting the operator.
        if !reserved && ladder.answered < ctl.presses() {
            let presses = ctl.presses();
            ladder.answered = presses;
            let step = stop_step(presses, ladder.since_cancel_ms(), STOP_GRACE_MS, false);
            if matches!(step, StopStep::Request | StopStep::Cancel) {
                if let Some(argv) = stop_argv(&ctl.spec) {
                    let restore = get_signal(&shared, &id);
                    set_signal(&shared, &id, "stopping");
                    refresh_tray(&app, &shared);
                    match run_stop_verb(&install_dir, &ctl, argv, matches!(step, StopStep::Cancel)).await {
                        StopSpawnOutcome::Landed { .. } => {
                            if let StopStep::Done = stop_step(presses, ladder.since_cancel_ms(), STOP_GRACE_MS, true) {
                                ctl.desired.store(false, Ordering::SeqCst);
                                set_signal(&shared, &id, "stopped");
                            }
                        }
                        StopSpawnOutcome::Refused { tail } => {
                            raise_notice(&shared, &ctl, &tail);
                            set_signal(&shared, &id, restore);
                        }
                    }
                    refresh_tray(&app, &shared);
                }
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
        //
        // A DECLARATION's wake is a rung of the stop ladder (130/ADR-004 §3), applied
        // here because this is the task that holds the child: a press spawns the verb
        // (`Request`, then `Cancel`), the verb's answer settles the signal and the grace
        // clock, and the grace's end is the tree kill. A retire while the child is alive
        // changes nothing here — the row went because the loop is halting (its honoured
        // mark) or its record is terminal, so its own exit is waited for, and the
        // watchdog leaves at the top of the outer loop once it has.
        let result = loop {
            let grace_left = ladder.grace_left();
            tokio::select! {
                status = child.wait() => break WaitResult::Exited(status),
                _ = ctl.notify.notified() => {
                    if reserved {
                        if !ctl.desired() {
                            break WaitResult::Stop;
                        }
                        continue;
                    }
                    // Settle a returned spawn first. A refused REQUEST is a footer
                    // notice and the pill keeps the child's true signal; a refused
                    // CANCEL keeps `stopping` (the drain stands) and starts no grace.
                    // The grace counts from the cancel LANDING — the instant the level-2
                    // request is on disk for the loop to read — so a second press inside
                    // the first spawn's lifetime is answered after it, in press order.
                    if let Some(outcome) = ctl.take_stop_outcome() {
                        ladder.in_flight = false;
                        match outcome {
                            StopSpawnOutcome::Landed { cancel } => {
                                if cancel && ladder.cancel_at.is_none() {
                                    ladder.cancel_at = Some(Instant::now());
                                }
                            }
                            StopSpawnOutcome::Refused { tail } => {
                                raise_notice(&shared, &ctl, &tail);
                                if let Some(signal) = ladder.restore.take() {
                                    set_signal(&shared, &id, signal);
                                }
                            }
                        }
                        refresh_tray(&app, &shared);
                    }
                    // Then the next unanswered press — one spawn at a time.
                    if !ladder.in_flight && ladder.answered < ctl.presses() {
                        ladder.answered += 1;
                        match stop_step(ladder.answered, ladder.since_cancel_ms(), STOP_GRACE_MS, false) {
                            step @ (StopStep::Request | StopStep::Cancel) => {
                                if let Some(argv) = stop_argv(&ctl.spec) {
                                    ladder.in_flight = true;
                                    ladder.restore = Some(get_signal(&shared, &id));
                                    set_signal(&shared, &id, "stopping");
                                    refresh_tray(&app, &shared);
                                    spawn_stop_verb(&install_dir, &ctl, argv, matches!(step, StopStep::Cancel));
                                }
                            }
                            StopStep::Kill => break WaitResult::Kill,
                            StopStep::Wait | StopStep::Done => {}
                        }
                    }
                }
                _ = tokio::time::sleep(grace_left.unwrap_or(Duration::ZERO)), if grace_left.is_some() => {
                    if stop_step(ctl.presses(), ladder.since_cancel_ms(), STOP_GRACE_MS, false) == StopStep::Kill {
                        break WaitResult::Kill;
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
                let reason = handle_exit(
                    &shared,
                    &ctl,
                    status.map(|s| s.success()).unwrap_or(false),
                    &msg,
                    &mut attempt,
                );
                if attaches(&id, ctl.presses(), reason) {
                    // The loop answered that it is running elsewhere (130/ADR-007): the row
                    // reports it, and the `duplicate-run` notice the exit raised is not a
                    // fault to stand in the footer. The hold `handle_exit` placed stays, so
                    // no tick relaunches against the live loop.
                    ctl.attach();
                    set_signal(&shared, &id, "running");
                    let mut g = shared.lock().unwrap();
                    let next = notice_after_start(g.standing_notice.as_ref(), &id);
                    g.standing_notice = next;
                } else if !reserved && ctl.presses() > 0 {
                    // The exit that follows a press closes the bracket: `Done`, whatever
                    // the code (130/ADR-004 §3). A loop the operator stopped is never
                    // classified as a crash and backed off against — the relaunch would
                    // be `--resume`, which CLEARS the standing request (ADR-001 §4), the
                    // supervisor fighting the operator. An exit 0 has already surfaced
                    // its halt line — the stop id, ref and resume command — above.
                    ctl.desired.store(false, Ordering::SeqCst);
                    set_signal(&shared, &id, "stopped");
                } else if matches!(get_signal(&shared, &id), "restarting") {
                    let backoff = jittered_backoff_ms(attempt, &mut jitter);
                    refresh_tray(&app, &shared);
                    sleep_or_wake(&ctl, backoff).await;
                }
            }
            WaitResult::Stop => {
                // The two daemons' immediate stop — theirs alone (130/ADR-004 §3 names
                // it out of scope); a declaration never reaches this arm.
                out_handle.abort();
                err_handle.abort();
                let _ = child.start_kill();
                let _ = child.wait().await;
                set_signal(&shared, &id, "stopped");
            }
            WaitResult::Kill => {
                // The ladder's last rung: the loop did not answer the cancel inside the
                // grace, so its whole tree goes. No notice — the fallback is the designed
                // rung, not a fault (DESIGN §Surface 2 "Error — the footer, never the bar").
                out_handle.abort();
                err_handle.abort();
                if let Some(pid) = child.id() {
                    tree_kill(pid).await;
                }
                let _ = child.wait().await;
                ctl.desired.store(false, Ordering::SeqCst);
                set_signal(&shared, &id, "stopped");
            }
        }
        refresh_tray(&app, &shared);
    }
}

/// Spawn `aof work loop <scope> --stop` for a declaration whose child this watchdog
/// holds — as the app spawns its other verbs (the resolved absolute `aof`, a shell-less
/// argv, `CREATE_NO_WINDOW`) and from the row's own cwd — on a task of its own, so the
/// wait on the child is never blocked by the verb. The answer comes back through the
/// controller and wakes the watchdog. The argv is `stop_argv`'s, formed in core; this
/// spells no verb.
fn spawn_stop_verb(install_dir: &Path, ctl: &Arc<ChildController>, argv: Vec<String>, cancel: bool) {
    let install_dir = install_dir.to_path_buf();
    let ctl = ctl.clone();
    tokio::spawn(async move {
        let outcome = run_stop_verb(&install_dir, &ctl, argv, cancel).await;
        ctl.put_stop_outcome(outcome);
    });
}

/// Run the stop verb to its exit and classify the answer: exit 0 landed the request;
/// anything else — a spawn failure, a refusal — is the verb's tail for the notice.
async fn run_stop_verb(install_dir: &Path, ctl: &ChildController, argv: Vec<String>, cancel: bool) -> StopSpawnOutcome {
    let resolved = resolve(install_dir);
    let spawn = form_argv_spawn(&resolved, &argv, ctl.spec.cwd.clone());
    let mut cmd = Command::new(&spawn.program);
    cmd.args(&spawn.args);
    if let Some(dir) = &spawn.cwd {
        cmd.current_dir(dir);
    }
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    match cmd.output().await {
        Ok(out) if out.status.success() => StopSpawnOutcome::Landed { cancel },
        Ok(out) => StopSpawnOutcome::Refused {
            tail: format!("{}\n{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr)),
        },
        Err(error) => StopSpawnOutcome::Refused { tail: error.to_string() },
    }
}

/// Raise the standing notice for a refused stop request, keyed to the child so a
/// daemon's restart never clears it (126/ADR-006 contract-beat §3). The text is the
/// core's (`stop_refusal_notice`): the child's label and the verb's last non-empty line.
fn raise_notice(shared: &SharedState, ctl: &ChildController, tail: &str) {
    shared.lock().unwrap().standing_notice = Some(StandingNotice {
        id: ctl.spec.id.clone(),
        text: stop_refusal_notice(&ctl.spec.label, tail),
    });
}

/// The tree kill — the ladder's last rung (130/ADR-004 §3): `taskkill /PID <pid> /T /F`,
/// the driver's own primitive (`agent-session-driver.mjs`), which takes the Node tree
/// under the child with it. Never `child.start_kill()`, which signals the direct child
/// only and orphans that tree (36/RESEARCH §2). The ONE place `taskkill` is reached.
#[cfg(windows)]
async fn tree_kill(pid: u32) {
    let mut cmd = Command::new("taskkill");
    cmd.args(["/PID", &pid.to_string(), "/T", "/F"]);
    cmd.creation_flags(CREATE_NO_WINDOW);
    let _ = cmd.output().await;
}

// A non-Windows build has no `taskkill` — the neutral seam a later macOS/Linux tray
// fills with a process-group kill, the posture `assign_to_job` already takes. Until
// then the direct child is signalled, and its tree is not reaped.
#[cfg(not(windows))]
async fn tree_kill(pid: u32) {
    let mut cmd = Command::new("kill");
    cmd.args(["-KILL", &pid.to_string()]);
    let _ = cmd.output().await;
}

/// Apply the core's exit classification (36/ADR-002 d2, 126/ADR-006 §6-§7). The
/// DECISION — the named reason, the ramp signal, the notice to raise, and whether a
/// HOLD is placed — is `classify_exit`, a pure function `cargo test` reaches; this only
/// applies it. It is handed `success`, never an exit code: a code here would be the
/// exit-code rule ADR-006 §4 forbids, one seam over from the reconcile that reads the
/// hold this places.
fn handle_exit(shared: &SharedState, ctl: &ChildController, success: bool, msg: &str, attempt: &mut u32) -> Option<CleanExitReason> {
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
    // The named reason, handed back for `attaches` (130/ADR-007) to read beside it.
    outcome.reason
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
