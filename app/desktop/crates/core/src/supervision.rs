//! Task 02 pure seams — the supervised SET, the restart/backoff + local-process state
//! machine (ARCHITECTURE 36/ADR-002 d1-2), and — from milestone 126 (ADR-006) — the
//! pure RECONCILE that makes actual match a SUPPLIED declared set.
//!
//! Nothing in this module spawns a process, sleeps, or reads a real clock — the
//! actual watchdog loop (real `tokio::process` + `win32job`) is the Tauri shell's
//! job, consuming these pure functions. `scripts/test.mjs` runs `cargo test` over
//! `app/desktop/Cargo.toml`, whose workspace EXCLUDES `crates/app`, so a decision
//! written beside the spawning code would never run — every decision lives here.

use std::collections::BTreeSet;
use std::path::PathBuf;

/// The two RESERVED ids of the statically seeded mesh daemons (126/ADR-005 §7). They
/// are seeded, never supplied: a supplied row carrying one of them is not a
/// declaration, and a seeded daemon never has a row. The reconcile is blind to them
/// in BOTH directions.
pub const MESH_SERVE_ID: &str = "mesh-serve";
pub const MESH_UI_ID: &str = "mesh-ui";

/// True when `id` names one of the two seeded daemons.
pub fn is_reserved_id(id: &str) -> bool {
    id == MESH_SERVE_ID || id == MESH_UI_ID
}

/// The ONE admitted argv prefix for a SUPPLIED row (126/ADR-006 contract-beat §5).
/// A declaration is a loop, so the runtime gate admits this and nothing else — it is
/// deliberately NARROWER than the four-verb source roster, because a supplied argv is
/// data no source sweep can see and must never be able to spawn a mesh verb however
/// the producer is wrong or compromised. This constant is the gate's ONE home; the
/// parse in `status.rs` is its only reader.
pub const DECLARATION_ARGV_PREFIX: [&str; 2] = ["work", "loop"];

/// One supervised child specification — an id, a human label, a program-relative argv
/// tail (the resolved `aof` path itself comes from `resolve.rs`) and an optional
/// working directory. OWNED, because a row from the poll has owned strings.
///
/// `cwd` is `None` for the two seeded daemons and `Some(..)` for every declaration —
/// without it a login-autostarted supervisor would hand a declaration the app's own
/// launch directory (TECH_DEBT item 4's measured `C:\WINDOWS\system32` shape), and
/// workspace identity is still partly cwd-derived (126/ADR-005 §5).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SupervisedChild {
    pub id: String,
    pub label: String,
    pub argv: Vec<String>,
    pub cwd: Option<PathBuf>,
}

impl SupervisedChild {
    pub fn mesh_serve() -> Self {
        SupervisedChild {
            id: MESH_SERVE_ID.to_string(),
            label: "aof mesh serve --serve".to_string(),
            argv: vec!["mesh".to_string(), "serve".to_string(), "--serve".to_string()],
            cwd: None,
        }
    }
    pub fn mesh_ui() -> Self {
        SupervisedChild {
            id: MESH_UI_ID.to_string(),
            label: "aof mesh ui".to_string(),
            argv: vec!["mesh".to_string(), "ui".to_string()],
            cwd: None,
        }
    }
}

/// The supervised set is COMPOSED, never matched (126/ADR-006 §1, superseding
/// 36/ADR-002 d1's `match` in the open): the two statically seeded daemons first, then
/// the rows the poll supplied, in row order.
///
/// The daemons are not themselves supplied because `mesh status` — the command the
/// rows are read through — is one of them, and a set that included the process the set
/// is read through has a bootstrap with no base case (126/ADR-005 §7). The role latch
/// in the shell remains that base case; nothing here reads a role.
pub fn compose_supervised_set(declarations: &[SupervisedChild]) -> Vec<SupervisedChild> {
    let mut set = vec![SupervisedChild::mesh_serve(), SupervisedChild::mesh_ui()];
    set.extend(declarations.iter().cloned());
    set
}

/// The named clean-exit-1 modes — special-cased, never blindly restart-looped
/// (36/ADR-002 d2, extended by 126/ADR-006 §6 with a fourth).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CleanExitReason {
    UiBuildMissing,
    AddrInUse,
    LauncherAlreadyRunning,
    /// The run store's anti-loop backstop: a second non-terminal run per item is
    /// refused (`src/run-store.mjs`). A supervised launch against a scope the operator
    /// is already driving by hand exits non-zero on a CORRECT refusal, and without
    /// this it is classified as a crash and backed off against forever.
    DuplicateRun,
}

impl CleanExitReason {
    pub fn message(&self) -> &'static str {
        match self {
            CleanExitReason::UiBuildMissing => "ui-build-missing",
            CleanExitReason::AddrInUse => "EADDRINUSE",
            CleanExitReason::LauncherAlreadyRunning => "launcher already running (pid N)",
            CleanExitReason::DuplicateRun => "duplicate-run",
        }
    }

    /// Classify a child's exit-1 by its emitted message — `None` means "not a named
    /// clean exit," i.e. a genuine crash worth the backoff-restart.
    ///
    /// `DuplicateRun` matches the store's MESSAGE, not its code (126/ADR-006
    /// contract-beat §2): a non-`--json` child's stderr carries `error.message` alone,
    /// so the code token never reaches this classifier on the exact spawn a
    /// declaration creates. The token spelling is admitted too, so a future `--json`
    /// caller is not a silent hole.
    pub fn classify(message: &str) -> Option<CleanExitReason> {
        if message.contains("ui-build-missing") {
            Some(CleanExitReason::UiBuildMissing)
        } else if message.contains("EADDRINUSE") || message.contains("is already in use") {
            // Both spellings, because the CLI never emits the token. `mesh ui` and
            // `work ui` print "Port <n> is already in use. Pass --port <n> to pick
            // another." and exit 1 (`src/commands/mesh/ui.mjs:101`,
            // `src/commands/work-ui.mjs:176`); matching only `EADDRINUSE` classified
            // that as a CRASH, so the supervisor backoff-restarted a refused start
            // every tick instead of holding it. Measured on the control node
            // 2026-09-10: `mesh ui` churned a new pid roughly every ten seconds for
            // 8h45m against a port an unrelated process held (126/VERIFICATION F-33).
            Some(CleanExitReason::AddrInUse)
        } else if message.contains("launcher is already running") || message.contains("launcher already running") {
            Some(CleanExitReason::LauncherAlreadyRunning)
        } else if message.contains("a non-terminal run already exists for this item")
            || message.contains("duplicate-run")
        {
            Some(CleanExitReason::DuplicateRun)
        } else {
            None
        }
    }
}

/// A notice standing in the desktop window's footer, carrying the id of the child it
/// names so one child's restart never clears another's (126/ADR-006 contract-beat §3).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StandingNotice {
    pub id: String,
    pub text: String,
}

/// What a child's exit means: the named reason (or none), the ramp signal, the notice
/// to raise (or none), and whether a HOLD is placed.
///
/// The input is `success: bool` and never an exit code — a code here is the exit-code
/// rule ADR-006 §4 forbids, one seam over. The hold rule lives HERE and is only READ
/// by the reconcile: a named clean exit places the same hold an operator Stop places;
/// an exit-0 child is a clean exit with no NAME, places none, and is started again
/// while its row persists.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExitClassification {
    pub reason: Option<CleanExitReason>,
    pub signal: &'static str,
    pub notice: Option<String>,
    pub hold: bool,
}

/// The last non-empty line of a child's captured tail. `handle_exit` joins stdout and
/// stderr with a newline, so a child that printed only to stdout hands us a tail
/// ENDING in a blank line — the halt sentence is the last line with content in it,
/// never simply the last line.
fn last_non_empty_line(tail: &str) -> Option<&str> {
    tail.lines().map(str::trim).filter(|line| !line.is_empty()).next_back()
}

/// Classify one child's exit (126/ADR-006 §6-§7). Exit 0 surfaces the child's last
/// output line — for a halting loop that is its stop id, ref and exact resume command,
/// the most important sentence the operator can receive and the one place it would
/// otherwise vanish.
pub fn classify_exit(label: &str, success: bool, tail: &str) -> ExitClassification {
    if success {
        return ExitClassification {
            reason: None,
            signal: "stopped",
            notice: last_non_empty_line(tail).map(|line| format!("{label}: {line}")),
            hold: false,
        };
    }
    match CleanExitReason::classify(tail) {
        Some(reason) => ExitClassification {
            reason: Some(reason),
            signal: "stopped",
            notice: Some(format!("{}: {}", label, reason.message())),
            hold: true,
        },
        None => ExitClassification {
            reason: None,
            signal: "restarting",
            notice: None,
            hold: false,
        },
    }
}

/// What stands after `starting_id` starts: the standing notice, or nothing when the
/// starting id is the one it names (126/ADR-006 contract-beat §3). This replaces the
/// blanket clear-on-restart, which N children make routine — one child's start must
/// never wipe another child's halt line.
pub fn notice_after_start(standing: Option<&StandingNotice>, starting_id: &str) -> Option<StandingNotice> {
    match standing {
        Some(notice) if notice.id == starting_id => None,
        Some(notice) => Some(notice.clone()),
        None => None,
    }
}

/// One live controller, as the reconcile sees it. It is told whether the child is
/// DESIRED and whether it is HELD, and NOTHING about why it stopped — no exit code, no
/// failure reason, no scope. That is 126/ADR-006 §4 made observable: two inputs
/// differing only in "did it exit 0" are the same value here, so an exit-code rule
/// cannot be added without changing this type.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LiveController {
    pub id: String,
    pub desired: bool,
    pub held: bool,
}

/// What a tick does to each id. Ids are sorted, so a plan is a pure function of its
/// input as a SET — a different row order yields an equal plan.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Plan {
    pub start: Vec<String>,
    pub stop: Vec<String>,
    pub retain: Vec<String>,
}

impl Plan {
    /// Every id this plan names, in any outcome — the "the plan names no other id"
    /// assertion's subject.
    pub fn ids(&self) -> Vec<String> {
        let mut all: Vec<String> = self
            .start
            .iter()
            .chain(self.stop.iter())
            .chain(self.retain.iter())
            .cloned()
            .collect();
        all.sort();
        all
    }
}

/// The reconcile: rows plus live controllers in, start/stop/retain out (126/ADR-006
/// §3-§5). Make actual match declared, level-triggered, and nothing else — no `kind`,
/// no exit-code policy, no scope knowledge, no clock, no file, no spawn.
///
/// * a row with no controller ⇒ **start**
/// * a controller with no row ⇒ **stop** (its hold is released with its row)
/// * both, and the controller is HELD ⇒ **retain** (the operator, or a named clean
///   exit, has spoken; a tick never drives it)
/// * both, not held, and the child is running ⇒ **retain**
/// * both, not held, and the child is NOT running ⇒ **start** — the level-triggered
///   property: aof still says run it, so starting it is right, whether or not it
///   exited 0
///
/// The two reserved daemon ids are named in NEITHER direction.
pub fn reconcile(rows: &[SupervisedChild], live: &[LiveController]) -> Plan {
    let declared: BTreeSet<&str> = rows
        .iter()
        .map(|row| row.id.as_str())
        .filter(|id| !is_reserved_id(id))
        .collect();

    let mut plan = Plan::default();

    for controller in live.iter().filter(|c| !is_reserved_id(&c.id)) {
        if !declared.contains(controller.id.as_str()) {
            plan.stop.push(controller.id.clone());
        } else if controller.held || controller.desired {
            plan.retain.push(controller.id.clone());
        } else {
            plan.start.push(controller.id.clone());
        }
    }

    let running: BTreeSet<&str> = live
        .iter()
        .map(|c| c.id.as_str())
        .filter(|id| !is_reserved_id(id))
        .collect();
    for id in declared.iter().filter(|id| !running.contains(*id)) {
        plan.start.push((*id).to_string());
    }

    plan.start.sort();
    plan.stop.sort();
    plan.retain.sort();
    plan
}

/// The grace between the CANCEL's spawn and the tree kill (130/ADR-004 §3, DEFAULT
/// DECISION): measured against the loop's own poll (≤ 2 s) plus the driver's stop
/// bracket (seconds). It is counted from the cancel and never from the drain — a drain
/// is an hour long by design, and a kill at ITS grace would take a live drive down from
/// under the loop and re-create the leaked `running` row the stop exists to close.
pub const STOP_GRACE_MS: u64 = 30_000;

/// The rung a declaration's stop is on — what the shell applies next and nothing about
/// how (130/ADR-004 §3). `Request` and `Cancel` both spawn the verb; the desktop
/// counts presses only, and the VERB escalates the request it finds on disk.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StopStep {
    /// The first press: spawn `aof work loop <scope> --stop` and report `stopping`.
    Request,
    /// A second press with no cancel yet: spawn the verb again; the grace starts here.
    Cancel,
    /// Cancelled, inside the grace: nothing to do but wait for the child or the clock.
    Wait,
    /// The grace has elapsed: `taskkill /PID <child> /T /F`, then wait the child.
    Kill,
    /// The child has exited — by its own halt or by the kill: report `stopped`.
    Done,
}

/// The stop ladder, PURE (130/ADR-004 §3; FF-13007's cargo half). `exited` wins over
/// everything; one press is a request; two or more with no cancel clock yet is the
/// cancel; a cancel clock at or past the grace is the kill; anything else waits. The
/// clock is COMPARED, never added to or subtracted from, so no input panics — a
/// `since_cancel_ms` of `u64::MAX` against a grace of `u64::MAX` is a kill, not an
/// overflow. The clock is read only once there are two presses: a drain press with a
/// stale cancel clock is never a kill, because a drain is never given a grace.
pub fn stop_step(presses: u32, since_cancel_ms: Option<u64>, grace_ms: u64, exited: bool) -> StopStep {
    if exited {
        return StopStep::Done;
    }
    match presses {
        0 => StopStep::Wait,
        1 => StopStep::Request,
        _ => match since_cancel_ms {
            None => StopStep::Cancel,
            Some(since) if since >= grace_ms => StopStep::Kill,
            Some(_) => StopStep::Wait,
        },
    }
}

/// The verb a declaration's stop spawns, formed HERE and never in the shell
/// (130/ADR-004 §3): the row's own admitted prefix `["work", "loop", <scope>]` —
/// `argv[0..3]`, composed at one home (`declarations.mjs` through `argvFor`) — plus
/// `--stop`. The tail after the scope (`--level`, `--resume`) is dropped: the stop
/// resolves the scope's loop from its run records and takes no level. `None` for a
/// reserved id (the daemons keep their immediate kill) and for an argv shorter than
/// three, which carries no scope to stop. The scope itself is never inspected — an
/// empty `argv[2]` still forms the verb, and the verb's refusal is what the shell
/// surfaces.
pub fn stop_argv(child: &SupervisedChild) -> Option<Vec<String>> {
    if is_reserved_id(&child.id) {
        return None;
    }
    let prefix = child.argv.get(0..3)?;
    if prefix.iter().zip(DECLARATION_ARGV_PREFIX.iter()).any(|(got, want)| got != want) {
        return None;
    }
    let mut argv = prefix.to_vec();
    argv.push("--stop".to_string());
    Some(argv)
}

/// The footer notice for a stop request the verb refused (130/ADR-004 §3): the child's
/// label and the verb's last non-empty line — the refusal's own sentence, which names
/// its code — or a fixed sentence when it printed nothing at all (an unspawnable
/// binary). Keyed to the child by the shell, so a daemon's restart never clears it.
pub fn stop_refusal_notice(label: &str, tail: &str) -> String {
    match last_non_empty_line(tail) {
        Some(line) => format!("{label}: {line}"),
        None => format!("{label}: stop request failed"),
    }
}

/// The live id set that RESULTS from applying `plan` to `live` — a started id joins it,
/// a stopped id leaves it, a retained id stays. This is the SET arithmetic of a tick,
/// which the shell mirrors in its controller map; the DECISION is `reconcile` alone, and
/// this reads its answer rather than re-deriving one.
pub fn apply_plan_to(live: &[LiveController], plan: &Plan) -> Vec<String> {
    let mut ids: BTreeSet<String> = live.iter().map(|c| c.id.clone()).collect();
    for id in &plan.stop {
        ids.remove(id);
    }
    for id in &plan.start {
        ids.insert(id.clone());
    }
    ids.into_iter().collect()
}

/// The local-process state machine (36/ADR-002 Consequences → DESIGN's local-process
/// ramp): `Running | Restarting(backoff) | Stopped | CleanExit(reason)`.
#[derive(Debug, Clone, PartialEq)]
pub enum LocalProcessState {
    Running,
    Restarting { attempt: u32, backoff_ms: u64 },
    Stopped,
    CleanExit { reason: CleanExitReason },
}

impl LocalProcessState {
    /// The DESIGN local-process ramp signal this state maps to (`DESIGN §UI
    /// behaviour`): `restarting` for a crash-triggered restart, `stopped` for a
    /// named clean exit.
    pub fn design_ramp_signal(&self) -> &'static str {
        match self {
            LocalProcessState::Running => "running",
            LocalProcessState::Restarting { .. } => "restarting",
            LocalProcessState::Stopped => "stopped",
            LocalProcessState::CleanExit { .. } => "stopped",
        }
    }
}

/// A pure jitter source seam — injected so backoff timing is deterministically
/// testable (STORY.md "Build notes": "inject the jitter/seed so it's deterministically
/// testable"). Returns a value in `[0.0, 1.0)`.
pub trait JitterSource {
    fn next_unit(&mut self) -> f64;
}

/// A fixed-sequence jitter source for tests — cycles through a provided list of
/// `[0.0, 1.0)` values.
pub struct FixedJitter {
    values: Vec<f64>,
    idx: usize,
}

impl FixedJitter {
    pub fn new(values: Vec<f64>) -> Self {
        assert!(!values.is_empty(), "FixedJitter needs at least one value");
        FixedJitter { values, idx: 0 }
    }
}

impl JitterSource for FixedJitter {
    fn next_unit(&mut self) -> f64 {
        let v = self.values[self.idx % self.values.len()];
        self.idx += 1;
        v
    }
}

const BASE_BACKOFF_MS: u64 = 500;
const MAX_BACKOFF_MS: u64 = 30_000;

/// Jittered exponential backoff as a pure function of the attempt count (1-indexed)
/// plus an injected jitter source — `base * 2^(attempt-1)`, capped at
/// `MAX_BACKOFF_MS`, with jitter applied as `delay * (0.5 + jitter/2)` so successive
/// delays are never a fixed value (RESEARCH §2 / ADR-002 d2 "restart is delayed by a
/// backoff … successive crashes grow the delay … jitter … not a fixed value").
pub fn jittered_backoff_ms(attempt: u32, jitter: &mut dyn JitterSource) -> u64 {
    assert!(attempt >= 1, "attempt is 1-indexed");
    let exp = attempt.saturating_sub(1).min(6); // cap growth before saturating u64 math
    let raw = BASE_BACKOFF_MS.saturating_mul(1u64 << exp).min(MAX_BACKOFF_MS);
    let factor = 0.5 + jitter.next_unit() / 2.0; // in [0.5, 1.0)
    ((raw as f64) * factor) as u64
}

/// The events the local-process state machine reacts to.
#[derive(Debug, Clone)]
pub enum ChildEvent {
    /// An unexpected exit — a genuine crash, not a named clean-exit-1 message.
    Crashed,
    /// The child's own clean-exit-1 message matched a named reason.
    ExitedCleanly(CleanExitReason),
    /// A restart attempt actually launched the child again successfully.
    RestartLaunched,
}

/// Transition the local-process state machine on one event (ADR-002 Consequences).
/// A crash transitions `Running -> Restarting(backoff)`; a subsequent successful
/// relaunch transitions `Restarting -> Running`; a named clean exit transitions
/// `Running -> CleanExit(reason)` and STAYS there (never tight-loop-restarted).
pub fn transition(
    state: &LocalProcessState,
    event: &ChildEvent,
    attempt: u32,
    jitter: &mut dyn JitterSource,
) -> LocalProcessState {
    match (state, event) {
        (LocalProcessState::Running, ChildEvent::Crashed) => LocalProcessState::Restarting {
            attempt,
            backoff_ms: jittered_backoff_ms(attempt, jitter),
        },
        (LocalProcessState::Restarting { .. }, ChildEvent::RestartLaunched) => LocalProcessState::Running,
        (_, ChildEvent::ExitedCleanly(reason)) => LocalProcessState::CleanExit { reason: *reason },
        // A clean exit is never tight-loop-restarted (no transition to Restarting
        // for ExitedCleanly, matched above) — otherwise stay in place; callers that
        // want to model `Stop` explicitly do so via `LocalProcessState::Stopped`
        // directly rather than through this event set.
        (other, _) => other.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn declaration(id: &str) -> SupervisedChild {
        SupervisedChild {
            id: id.to_string(),
            label: format!("loop {id}"),
            argv: vec!["work".to_string(), "loop".to_string(), id.to_string()],
            cwd: Some(PathBuf::from("C:/Source/umami/aof")),
        }
    }

    fn controller(id: &str, desired: bool, held: bool) -> LiveController {
        LiveController { id: id.to_string(), desired, held }
    }

    // ── 126/03 task 00 — a child carries an id, owned strings and an optional cwd.

    #[test]
    fn the_two_daemon_constructors_return_owned_children_with_reserved_ids_and_no_cwd() {
        let serve = SupervisedChild::mesh_serve();
        assert_eq!(serve.id, "mesh-serve", "its reserved id");
        assert_eq!(serve.label, "aof mesh serve --serve", "its existing label");
        assert_eq!(serve.argv, vec!["mesh", "serve", "--serve"], "its existing argv");
        assert_eq!(serve.cwd, None, "a seeded daemon carries no working directory");

        let ui = SupervisedChild::mesh_ui();
        assert_eq!(ui.id, "mesh-ui", "its reserved id");
        assert_eq!(ui.label, "aof mesh ui", "its existing label");
        assert_eq!(ui.argv, vec!["mesh", "ui"], "its existing argv");
        assert_eq!(ui.cwd, None);
    }

    #[test]
    fn a_child_built_from_a_declaration_row_carries_its_id_label_argv_and_cwd() {
        let child = declaration("loop-124-a");
        assert_eq!(child.id, "loop-124-a");
        assert_eq!(child.label, "loop loop-124-a");
        assert_eq!(child.argv, vec!["work", "loop", "loop-124-a"]);
        assert_eq!(child.cwd, Some(PathBuf::from("C:/Source/umami/aof")));
    }

    // Scenario: the set is composed, not matched.
    #[test]
    fn the_set_is_composed_daemons_first_then_the_rows_in_row_order() {
        let rows = vec![declaration("a"), declaration("b"), declaration("c")];
        let set = compose_supervised_set(&rows);

        assert_eq!(set.len(), 5, "the two seeded daemons plus the three supplied rows");
        assert_eq!(set[0], SupervisedChild::mesh_serve(), "the daemons come first");
        assert_eq!(set[1], SupervisedChild::mesh_ui());
        assert_eq!(
            set[2..].iter().map(|c| c.id.as_str()).collect::<Vec<_>>(),
            vec!["a", "b", "c"],
            "the three declarations follow, in row order"
        );
    }

    #[test]
    fn composing_no_rows_still_yields_the_two_seeded_daemons() {
        let set = compose_supervised_set(&[]);
        assert_eq!(set.len(), 2);
        assert!(set.iter().all(|c| is_reserved_id(&c.id)), "both members are reserved daemons");
    }

    // ── 126/03 task 01 — the reconcile is a pure plan.

    /// Scenario Outline: the plan for one id — a supplied declaration id.
    ///
    /// The `exited 0` column of the contract's table is DELIBERATELY not an input
    /// here: `LiveController` carries `desired` and `held` and nothing about why the
    /// child stopped, which is what makes an exit-code rule unaddable. The two rows
    /// that differ only in it are asserted equal at the bottom of this test.
    #[test]
    fn the_plan_for_one_supplied_declaration_id() {
        let a = declaration("a");
        let rows_present = vec![a.clone()];
        let rows_absent: Vec<SupervisedChild> = vec![];

        // | absent  | absent  | none   |
        assert_eq!(reconcile(&rows_absent, &[]), Plan::default(), "nothing declared and nothing running");

        // | present | absent  | start  |
        assert_eq!(
            reconcile(&rows_present, &[]),
            Plan { start: vec!["a".into()], ..Plan::default() },
            "a row with no child starts"
        );

        // | absent  | present | stop   | — for every desired/held combination
        for (desired, held) in [(true, false), (false, false), (true, true), (false, true)] {
            assert_eq!(
                reconcile(&rows_absent, &[controller("a", desired, held)]),
                Plan { stop: vec!["a".into()], ..Plan::default() },
                "a child with no row stops (desired={desired}, held={held}) — the hold is released with the row"
            );
        }

        // | present | present | yes | no  | retain | — the steady state
        assert_eq!(
            reconcile(&rows_present, &[controller("a", true, false)]),
            Plan { retain: vec!["a".into()], ..Plan::default() },
            "both present and running — the steady state"
        );

        // | present | present | no  | no  | start | — the level-triggered property
        assert_eq!(
            reconcile(&rows_present, &[controller("a", false, false)]),
            Plan { start: vec!["a".into()], ..Plan::default() },
            "aof still says run it, so starting it is right"
        );

        // | present | present | *   | yes | retain | — a hold is never driven by a tick
        for desired in [true, false] {
            assert_eq!(
                reconcile(&rows_present, &[controller("a", desired, true)]),
                Plan { retain: vec!["a".into()], ..Plan::default() },
                "a held declaration is neither started nor stopped by a tick (desired={desired})"
            );
        }

        // Every plan above named exactly one id and no other.
        assert_eq!(reconcile(&rows_present, &[controller("a", true, false)]).ids(), vec!["a".to_string()]);
    }

    /// THE PAIR THAT REFUSES AN EXIT-CODE RULE (ADR-006 §4): two cases differing only
    /// in "did it exit 0" produce the same outcome. They are the same VALUE here, so
    /// the property is structural rather than merely asserted.
    #[test]
    fn a_child_that_exited_zero_and_one_that_did_not_reconcile_identically() {
        let rows = vec![declaration("a")];
        let exited_zero = controller("a", false, false);
        let did_not_exit_zero = controller("a", false, false);
        assert_eq!(
            reconcile(&rows, &[exited_zero.clone()]),
            reconcile(&rows, &[did_not_exit_zero.clone()]),
            "an exit-code rule cannot be added without changing LiveController itself"
        );
        assert_eq!(exited_zero, did_not_exit_zero, "the reconcile is handed no way to tell them apart");
    }

    /// Scenario Outline: a reserved daemon id, which the reconcile drives in neither
    /// direction.
    #[test]
    fn a_reserved_daemon_id_is_named_in_neither_direction() {
        let serve_row = SupervisedChild::mesh_serve();
        let ui_row = SupervisedChild::mesh_ui();

        // A supplied row cannot address a seeded daemon…
        assert_eq!(
            reconcile(&[serve_row.clone()], &[controller(MESH_SERVE_ID, true, false)]),
            Plan::default()
        );
        // …nor can it create one.
        assert_eq!(reconcile(&[serve_row], &[]), Plan::default());
        // A daemon never has a row, and must never be stopped for want of one…
        assert_eq!(reconcile(&[], &[controller(MESH_UI_ID, true, false)]), Plan::default());
        // …including one the role latch has not started yet.
        assert_eq!(reconcile(&[ui_row], &[controller(MESH_SERVE_ID, false, false)]), Plan::default());
    }

    // Scenario: one plan carries every outcome, and a hold on one id does not reach
    // its sibling.
    #[test]
    fn one_plan_carries_every_outcome_and_a_hold_does_not_reach_a_sibling() {
        let rows = vec![declaration("a"), declaration("b"), declaration("d")];
        let live = vec![
            controller("b", true, false),  // running
            controller("c", true, false),  // no row
            controller("d", false, true),  // held by an operator Stop
        ];

        let plan = reconcile(&rows, &live);

        assert_eq!(plan.start, vec!["a".to_string()], "`a` is to be started");
        assert_eq!(plan.stop, vec!["c".to_string()], "`c` is to be stopped");
        assert_eq!(plan.retain, vec!["b".to_string(), "d".to_string()], "`b` and `d` are retained");
        assert!(
            !plan.start.is_empty() && !plan.stop.is_empty() && plan.retain.len() == 2,
            "all four outcomes occur in this one plan"
        );
        assert_eq!(plan.ids(), vec!["a".to_string(), "b".to_string(), "c".to_string(), "d".to_string()], "nothing else appears in it");
    }

    // Scenario: a hold survives every tick until its row goes.
    #[test]
    fn a_hold_survives_every_tick_until_its_row_goes() {
        let rows = vec![declaration("a")];
        let live = vec![controller("a", false, true)];

        for tick in 1..=10 {
            let plan = reconcile(&rows, &live);
            assert_eq!(plan.retain, vec!["a".to_string()], "tick {tick} retains it");
            assert!(plan.start.is_empty(), "tick {tick} does not start it");
        }

        let plan = reconcile(&[], &live);
        assert_eq!(plan.stop, vec!["a".to_string()], "the eleventh plan stops it once its row disappears");
    }

    // Scenario: the plan is a pure function of what it is handed.
    #[test]
    fn the_plan_is_a_pure_function_of_what_it_is_handed() {
        let forward = vec![declaration("a"), declaration("b"), declaration("d")];
        let reversed: Vec<SupervisedChild> = forward.iter().rev().cloned().collect();
        let live = vec![controller("b", true, false), controller("c", true, false), controller("d", false, true)];
        let live_reversed: Vec<LiveController> = live.iter().rev().cloned().collect();

        assert_eq!(
            reconcile(&forward, &live),
            reconcile(&reversed, &live_reversed),
            "the two plans are equal as sets"
        );
    }


    // Scenario: controllers come and go with rows across successive ticks (task 02).
    #[test]
    fn controllers_come_and_go_with_rows_across_successive_ticks() {
        // A live set holding only the two seeded daemons.
        let daemons = vec![
            controller(MESH_SERVE_ID, true, true),
            controller(MESH_UI_ID, true, false),
        ];

        // A tick supplying one declaration row.
        let rows = vec![declaration("a")];
        let first = reconcile(&rows, &daemons);
        assert_eq!(first.start, vec!["a".to_string()], "the plan started it");
        let after_first = apply_plan_to(&daemons, &first);
        assert!(after_first.contains(&"a".to_string()), "the resulting live set holds that id");

        // A following tick supplying no rows.
        let live_now: Vec<LiveController> = after_first
            .iter()
            .map(|id| controller(id, true, is_reserved_id(id)))
            .collect();
        let second = reconcile(&[], &live_now);
        assert_eq!(second.stop, vec!["a".to_string()], "the plan stops that id");
        let after_second = apply_plan_to(&live_now, &second);
        assert!(!after_second.contains(&"a".to_string()), "the resulting live set holds it no longer");

        // The two daemon ids are in the live set unchanged after both ticks, named by
        // neither plan.
        for id in [MESH_SERVE_ID, MESH_UI_ID] {
            assert!(after_first.contains(&id.to_string()), "{id} survives the first tick");
            assert!(after_second.contains(&id.to_string()), "{id} survives the second tick");
            assert!(!first.ids().contains(&id.to_string()), "{id} is named by neither plan (first)");
            assert!(!second.ids().contains(&id.to_string()), "{id} is named by neither plan (second)");
        }
    }

    // ── 126/03 task 03 — the classifier, the hold it places, and the standing notice.

    #[test]
    fn the_three_existing_named_clean_exits_are_unchanged_but_for_the_hold_they_now_place() {
        for (tail, reason) in [
            ("ui-build-missing", CleanExitReason::UiBuildMissing),
            ("listen EADDRINUSE: address already in use 127.0.0.1:4182", CleanExitReason::AddrInUse),
            ("AOF mesh launcher is already running (pid 4242).", CleanExitReason::LauncherAlreadyRunning),
        ] {
            let out = classify_exit("aof mesh ui", false, tail);
            assert_eq!(out.reason, Some(reason), "{tail}");
            assert_eq!(out.signal, "stopped");
            assert_eq!(out.notice, Some(format!("aof mesh ui: {}", reason.message())), "the child's label and reason");
            assert!(out.hold, "a named clean exit places a hold");
        }
    }

    #[test]
    fn duplicate_run_is_the_fourth_named_clean_exit_in_both_spellings() {
        for tail in [
            "a non-terminal run already exists for this item",
            r#"{"ok":false,"error":"a non-terminal run already exists for this item","code":"duplicate-run"}"#,
        ] {
            let out = classify_exit("loop 124", false, tail);
            assert_eq!(out.reason, Some(CleanExitReason::DuplicateRun), "{tail}");
            assert_eq!(out.signal, "stopped");
            assert_eq!(out.notice, Some("loop 124: duplicate-run".to_string()));
            assert!(out.hold, "the refusal is surfaced once, never re-attempted every thirtieth second");
        }
    }

    #[test]
    fn a_crash_is_not_named_raises_no_notice_and_places_no_hold() {
        for tail in ["segmentation fault", ""] {
            let out = classify_exit("loop 124", false, tail);
            assert_eq!(out.reason, None, "not named — a crash ({tail:?})");
            assert_eq!(out.signal, "restarting", "a backoff is scheduled only when the signal is restarting");
            assert_eq!(out.notice, None);
            assert!(!out.hold);
        }
    }

    #[test]
    fn an_exit_zero_surfaces_its_last_non_empty_line_and_places_no_hold() {
        let halt = "124 — halted on session-needs-input at 124/00 (producer driver:needs-input). Resume with: aof work loop 124 --resume";
        for tail in [
            halt.to_string(),
            // `handle_exit` joins stdout and stderr with a newline, so a child that
            // printed only to stdout hands us a tail ENDING in a blank line.
            format!("{halt}\n"),
            format!("earlier chatter\nmore chatter\n{halt}\n"),
        ] {
            let out = classify_exit("loop 124", true, &tail);
            assert_eq!(out.reason, None, "a clean exit, unnamed");
            assert_eq!(out.signal, "stopped");
            assert_eq!(out.notice, Some(format!("loop 124: {halt}")), "the last NON-EMPTY line, labelled — one line, never the whole tail");
            assert!(!out.hold, "an exit-0 child places no hold, so a persisting row starts it again");
        }

        let done = classify_exit("loop 124", true, "124 — loop done.");
        assert_eq!(done.notice, Some("loop 124: 124 — loop done.".to_string()));
        assert!(!done.hold);
    }

    #[test]
    fn an_exit_zero_with_no_output_raises_no_notice() {
        for tail in ["", "\n", "   \n\t\n  "] {
            let out = classify_exit("loop 124", true, tail);
            assert_eq!(out.notice, None, "nothing to surface ({tail:?})");
            assert_eq!(out.signal, "stopped");
            assert!(!out.hold);
        }
    }

    // Scenario: a notice names one child, and only that child's start clears it.
    #[test]
    fn only_the_child_a_notice_names_clears_it_when_it_starts() {
        let standing = StandingNotice {
            id: "loop-124-a".to_string(),
            text: "loop 124: 124 — halted on session-needs-input".to_string(),
        };

        assert_eq!(
            notice_after_start(Some(&standing), MESH_UI_ID),
            Some(standing.clone()),
            "another child starting leaves the standing notice unaltered"
        );
        assert_eq!(
            notice_after_start(Some(&standing), "loop-126-b"),
            Some(standing.clone()),
            "so does a sibling declaration starting"
        );
        assert_eq!(
            notice_after_start(Some(&standing), "loop-124-a"),
            None,
            "the child the notice names starting clears it"
        );
        assert_eq!(notice_after_start(None, "loop-124-a"), None, "nothing stands over nothing");
    }

    // ── 130/04 task 00 — the stop ladder is pure and lives in core (ADR-004 §3-§4).

    /// A declaration whose argv is stated literally — the test module's `declaration(id)`
    /// carries exactly three tokens, and a longer or shorter argv is spelled in its row.
    fn declaration_with_argv(id: &str, argv: &[&str]) -> SupervisedChild {
        SupervisedChild {
            id: id.to_string(),
            label: format!("loop {id}"),
            argv: argv.iter().map(|s| s.to_string()).collect(),
            cwd: Some(PathBuf::from("C:/Source/umami/aof")),
        }
    }

    /// Scenario Outline: stop_step decides the rung from presses, the cancel clock, the
    /// grace and the exit — every row of the contract's table, stated as the table.
    #[test]
    fn stop_step_decides_the_rung_from_presses_the_cancel_clock_the_grace_and_the_exit() {
        use StopStep::*;
        let rows: [(u32, Option<u64>, u64, bool, StopStep); 22] = [
            (0, None, 30_000, false, Wait),
            (1, None, 30_000, false, Request),
            (2, None, 30_000, false, Cancel),
            (3, None, 30_000, false, Cancel),
            (u32::MAX, None, 30_000, false, Cancel),
            (2, Some(0), 30_000, false, Wait),
            (2, Some(29_999), 30_000, false, Wait),
            (2, Some(30_000), 30_000, false, Kill),
            (5, Some(90_000), 30_000, false, Kill),
            (2, Some(u64::MAX), 30_000, false, Kill),
            (1, Some(90_000), 30_000, false, Request),
            (1, Some(u64::MAX), 30_000, false, Request),
            (0, Some(30_000), 30_000, false, Wait),
            (2, None, 0, false, Cancel),
            (2, Some(0), 0, false, Kill),
            (2, Some(0), u64::MAX, false, Wait),
            (2, Some(u64::MAX), u64::MAX, false, Kill),
            (0, None, 30_000, true, Done),
            (1, None, 30_000, true, Done),
            (1, Some(90_000), 30_000, true, Done),
            (2, Some(0), 30_000, true, Done),
            (2, Some(30_000), 30_000, true, Done),
        ];
        for (presses, since, grace, exited, step) in rows {
            assert_eq!(
                stop_step(presses, since, grace, exited),
                step,
                "stop_step({presses}, {since:?}, {grace}, {exited})"
            );
        }
    }

    /// Scenario: the grace is a named constant, and its boundary is stated through it.
    #[test]
    fn the_grace_is_a_named_constant_and_its_boundary_is_stated_through_it() {
        assert_eq!(STOP_GRACE_MS, 30_000);
        assert_eq!(stop_step(2, Some(STOP_GRACE_MS - 1), STOP_GRACE_MS, false), StopStep::Wait, "one ms inside the grace waits");
        assert_eq!(stop_step(2, Some(STOP_GRACE_MS), STOP_GRACE_MS, false), StopStep::Kill, "at the grace, the kill");
        assert_eq!(
            stop_step(1, Some(STOP_GRACE_MS), STOP_GRACE_MS, false),
            StopStep::Request,
            "a drain press with a stale cancel clock is never a kill"
        );
    }

    /// Scenario Outline: stop_argv forms the verb from the row's own admitted prefix.
    #[test]
    fn stop_argv_forms_the_verb_from_the_rows_own_admitted_prefix() {
        let some = |argv: &[&str]| Some(argv.iter().map(|s| s.to_string()).collect::<Vec<_>>());

        assert_eq!(stop_argv(&declaration("L1")), some(&["work", "loop", "L1", "--stop"]), "exactly three, plus --stop");
        assert_eq!(
            stop_argv(&declaration_with_argv("L2", &["work", "loop", "129", "--level", "L2", "--resume"])),
            some(&["work", "loop", "129", "--stop"]),
            "the tail after the scope is dropped"
        );
        assert_eq!(
            stop_argv(&declaration_with_argv("L3", &["work", "loop", ""])),
            some(&["work", "loop", "", "--stop"]),
            "the scope is never inspected"
        );
        assert_eq!(stop_argv(&SupervisedChild::mesh_serve()), None, "a reserved id");
        assert_eq!(stop_argv(&SupervisedChild::mesh_ui()), None, "the other reserved id");
        assert_eq!(
            stop_argv(&declaration_with_argv(MESH_UI_ID, &["work", "loop", "129"])),
            None,
            "the id decides, whatever the argv"
        );
        assert_eq!(stop_argv(&declaration_with_argv("short", &["work", "loop"])), None, "two tokens carry no scope");
        assert_eq!(stop_argv(&declaration_with_argv("shorter", &["work"])), None);
        assert_eq!(stop_argv(&declaration_with_argv("empty", &[])), None);
        assert_eq!(
            stop_argv(&declaration_with_argv("daemonish", &["mesh", "serve", "--serve"])),
            None,
            "not the admitted loop prefix"
        );
    }

    /// Scenario: the ladder is total — every combination answers one of the five
    /// variants and none panics.
    #[test]
    fn the_ladder_is_total() {
        let mut answered = 0;
        for presses in [0, 1, 2, u32::MAX] {
            for since in [None, Some(0), Some(u64::MAX)] {
                for grace in [0, 30_000, u64::MAX] {
                    for exited in [false, true] {
                        let step = stop_step(presses, since, grace, exited);
                        assert!(
                            matches!(step, StopStep::Request | StopStep::Cancel | StopStep::Wait | StopStep::Kill | StopStep::Done),
                            "({presses}, {since:?}, {grace}, {exited}) answered {step:?}"
                        );
                        answered += 1;
                    }
                }
            }
        }
        assert_eq!(answered, 4 * 3 * 3 * 2, "every combination was asked");
    }

    /// Scenario: reconcile retains a held id whether or not it is desired — the hold
    /// placed at press 1 is what keeps a tick from driving the child.
    #[test]
    fn reconcile_retains_a_held_id_whether_or_not_it_is_desired() {
        let rows = vec![declaration("L1")];
        for desired in [true, false] {
            let plan = reconcile(&rows, &[controller("L1", desired, true)]);
            assert_eq!(plan.retain, vec!["L1".to_string()], "retained (desired={desired})");
            assert!(plan.start.is_empty(), "a held child that exited is never started by a tick (desired={desired})");
            assert!(plan.stop.is_empty(), "nor stopped (desired={desired})");
            assert_eq!(plan.ids(), vec!["L1".to_string()], "and named nowhere else");
        }
    }

    /// Scenario: a declaration whose row has gone is stopped, hold or no hold.
    #[test]
    fn a_declaration_whose_row_has_gone_is_stopped_hold_or_no_hold() {
        for held in [true, false] {
            let plan = reconcile(&[], &[controller("L1", false, held)]);
            assert_eq!(plan.stop, vec!["L1".to_string()], "the hold is released with the row (held={held})");
            assert!(plan.retain.is_empty() && plan.start.is_empty());
        }
    }

    #[test]
    fn a_refused_stop_request_is_the_labelled_last_non_empty_line_or_a_fixed_sentence() {
        let refusal = "stop refused: loop-stop-no-declaration";
        for tail in [refusal.to_string(), format!("{refusal}\n"), format!("chatter\n{refusal}\n\n")] {
            assert_eq!(stop_refusal_notice("loop 129", &tail), format!("loop 129: {refusal}"), "{tail:?}");
        }
        for tail in ["", "\n", "  \n\t"] {
            assert_eq!(stop_refusal_notice("loop 129", tail), "loop 129: stop request failed", "{tail:?}");
        }
    }

    // ── 36/ADR-002's delivered engine — unchanged.

    #[test]
    fn crash_transitions_running_to_restarting_with_a_nonzero_delayed_backoff() {
        let mut jitter = FixedJitter::new(vec![0.4]);
        let next = transition(&LocalProcessState::Running, &ChildEvent::Crashed, 1, &mut jitter);
        match next {
            LocalProcessState::Restarting { backoff_ms, .. } => {
                assert!(backoff_ms > 0, "the restart is delayed by a backoff, not immediate");
            }
            other => panic!("expected Restarting, got {other:?}"),
        }
    }

    #[test]
    fn successive_crashes_grow_the_backoff_delay_and_carry_jitter() {
        let mut jitter = FixedJitter::new(vec![0.5, 0.5, 0.5]);
        let d1 = jittered_backoff_ms(1, &mut jitter);
        let d2 = jittered_backoff_ms(2, &mut jitter);
        let d3 = jittered_backoff_ms(3, &mut jitter);
        assert!(d2 > d1, "successive crashes grow the backoff delay (attempt 2 > attempt 1)");
        assert!(d3 > d2, "successive crashes grow the backoff delay (attempt 3 > attempt 2)");

        // Jitter: same attempt number, different jitter samples ⇒ different delays.
        let mut jitter_a = FixedJitter::new(vec![0.1]);
        let mut jitter_b = FixedJitter::new(vec![0.9]);
        let a = jittered_backoff_ms(2, &mut jitter_a);
        let b = jittered_backoff_ms(2, &mut jitter_b);
        assert_ne!(a, b, "the backoff carries jitter — successive delays are not a fixed value");
    }

    #[test]
    fn named_clean_exit_reasons_classify_from_their_message() {
        assert_eq!(CleanExitReason::classify("ui-build-missing"), Some(CleanExitReason::UiBuildMissing));
        assert_eq!(CleanExitReason::classify("EADDRINUSE"), Some(CleanExitReason::AddrInUse));
        // THE MESSAGE THE CLI ACTUALLY EMITS. Neither `mesh ui` nor `work ui` ever prints the
        // token `EADDRINUSE`; both print this sentence and exit 1. Matching the token alone read
        // a refused start as a crash, and the supervisor restarted it every tick for as long as
        // the port stayed held (126/VERIFICATION F-33, measured over 8h45m on the control node).
        assert_eq!(
            CleanExitReason::classify("Port 4181 is already in use. Pass --port <n> to pick another."),
            Some(CleanExitReason::AddrInUse),
            "the port-busy refusal is a NAMED clean exit, so it places a hold rather than being restarted"
        );
        assert_eq!(
            CleanExitReason::classify("Port 4180 is already in use. Pass --port <n> to pick another."),
            Some(CleanExitReason::AddrInUse),
            "the board's twin refusal classifies the same way"
        );
        assert_eq!(
            CleanExitReason::classify("AOF mesh launcher is already running (pid 4242)."),
            Some(CleanExitReason::LauncherAlreadyRunning)
        );
        assert_eq!(CleanExitReason::classify("segmentation fault"), None, "an unrecognized exit message is NOT a named clean exit (a genuine crash)");
    }

    #[test]
    fn named_clean_exit_transitions_to_clean_exit_state_and_is_not_restarting() {
        let mut jitter = FixedJitter::new(vec![0.5]);
        let next = transition(
            &LocalProcessState::Running,
            &ChildEvent::ExitedCleanly(CleanExitReason::UiBuildMissing),
            1,
            &mut jitter,
        );
        assert_eq!(next, LocalProcessState::CleanExit { reason: CleanExitReason::UiBuildMissing });
        assert_ne!(
            std::mem::discriminant(&next),
            std::mem::discriminant(&LocalProcessState::Restarting { attempt: 1, backoff_ms: 0 }),
            "it does not tight-loop-restart the child"
        );
        assert_eq!(next.design_ramp_signal(), "stopped");
    }

    #[test]
    fn crash_then_restart_maps_to_the_restarting_design_ramp_signal() {
        let mut jitter = FixedJitter::new(vec![0.5]);
        let restarting = transition(&LocalProcessState::Running, &ChildEvent::Crashed, 1, &mut jitter);
        assert_eq!(restarting.design_ramp_signal(), "restarting", "Running -> Restarting(backoff) maps to DESIGN's restarting local-process signal");
        let running_again = transition(&restarting, &ChildEvent::RestartLaunched, 1, &mut jitter);
        assert_eq!(running_again, LocalProcessState::Running, "Restarting(backoff) -> Running once relaunched");
    }

    #[test]
    fn clean_exit_with_named_reason_maps_to_the_stopped_design_ramp_signal() {
        let mut jitter = FixedJitter::new(vec![0.5]);
        let stopped = transition(
            &LocalProcessState::Running,
            &ChildEvent::ExitedCleanly(CleanExitReason::AddrInUse),
            1,
            &mut jitter,
        );
        assert_eq!(stopped.design_ramp_signal(), "stopped", "Running -> CleanExit(reason) maps to DESIGN's stopped local-process signal");
    }
}
