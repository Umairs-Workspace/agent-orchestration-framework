//! Milestone 167 · story 05 — the desktop guard (167/ADR-006): judges each supervised daemon's
//! CPU, sampled from the OS by the shell, against the budget the status read hands it, and calls
//! it an overrun only once it has stayed over budget for [`SUSTAINED_MS`].
//!
//! A daemon that burns a core may stop writing its own cost snapshot (ADR-001), so the sample is
//! the operating system's cumulative CPU time for the child, never the daemon's own report. This
//! module is pure: no OS call, no clock, no I/O. The shell (`apps/desktop/crates/app`) feeds it a
//! reading per daemon on each 3 s poll tick, and turns what it answers into the tray state, the
//! footer's one notice and one degrade-log line per transition.
//!
//! It holds NO budget number (FF-16702): the budget arrives with the `cost` block of
//! `aof mesh status --json`, and without one nothing is judged. It has no path to stop, restart
//! or kill anything (FF-16704) — an overrun is something the operator decides about.

use serde::Serialize;

use crate::supervision::{MESH_SERVE_ID, MESH_UI_ID};

/// How long a daemon must stay over budget before it is an overrun: the operator's answer to
/// 167/05 Q1 (2026-10-20), five minutes. No normal spike lasts that long; a runaway shows inside it.
pub const SUSTAINED_MS: u64 = 5 * 60 * 1000;

/// The two degrade-log codes, one line as an overrun starts and one as it ends.
pub const OVER_BUDGET_CODE: &str = "daemon-over-budget";
pub const BACK_WITHIN_BUDGET_CODE: &str = "daemon-back-within-budget";

/// The budget the status read hands the guard (`cost.budget`): a share of ONE core, in percent,
/// for each state a daemon reports, and the window the share is judged over. Built only from the
/// status document — never from a literal.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Budget {
    idle: f64,
    viewer_open: f64,
    window_ms: u64,
}

impl Budget {
    pub fn new(idle: f64, viewer_open: f64, window_ms: u64) -> Self {
        Budget { idle, viewer_open, window_ms: window_ms.max(1) }
    }
    /// The budget a daemon in `state` is judged against. A daemon that stopped reporting has no
    /// known state, so it is held to the LOOSER viewer-open budget: one too busy to report is
    /// still caught, and one that is merely quiet is not accused on the stricter number.
    pub fn for_state(&self, state: DaemonState) -> f64 {
        match state {
            DaemonState::Idle => self.idle,
            DaemonState::ViewerOpen | DaemonState::NotReporting => self.viewer_open,
        }
    }
    pub fn window_ms(&self) -> u64 {
        self.window_ms
    }
}

/// What a daemon's own snapshot says it is doing, as `cost.daemons[].status` carries it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DaemonState {
    Idle,
    ViewerOpen,
    NotReporting,
}

impl DaemonState {
    /// The state as the footer names the budget it was judged in.
    pub fn as_str(&self) -> &'static str {
        match self {
            DaemonState::Idle => "idle",
            DaemonState::ViewerOpen | DaemonState::NotReporting => "viewer-open",
        }
    }
}

/// What one observation changed.
#[derive(Debug, Clone, PartialEq)]
pub enum Transition {
    /// The daemon has now been over budget for [`SUSTAINED_MS`].
    Entered { share: f64, budget: f64, state: DaemonState },
    /// The daemon has been back under budget for one full window.
    Left,
    Unchanged,
}

#[derive(Debug, Clone, Copy)]
struct Sample {
    at_ms: u64,
    cpu_100ns: u64,
}

/// One daemon's judgement. The share is taken over a sliding window of samples (the budget's own
/// window), so a daemon that alternates bursts and rests is judged on its average. A regime —
/// over, or back under while in overrun — starts at the BASE of the window that first showed it,
/// which is when the load that window measured began.
#[derive(Debug, Default)]
pub struct Guard {
    samples: Vec<Sample>,
    over_since: Option<u64>,
    under_since: Option<u64>,
    in_overrun: bool,
    share: Option<f64>,
}

impl Guard {
    pub fn new() -> Self {
        Guard::default()
    }

    pub fn in_overrun(&self) -> bool {
        self.in_overrun
    }

    /// The last share of one core this guard computed, in percent.
    pub fn share(&self) -> Option<f64> {
        self.share
    }

    /// Feed one reading: the child's cumulative CPU time in 100 ns units (the OS's own unit on
    /// Windows), or `None` when the OS could not sample it. `budget` is `None` when the status
    /// read failed or carried no budget. Either absence judges nothing.
    pub fn observe(&mut self, cpu_100ns: Option<u64>, at_ms: u64, budget: Option<&Budget>, state: DaemonState) -> Transition {
        let Some(cpu_100ns) = cpu_100ns else {
            // A daemon the OS cannot sample is never judged, and its old samples say nothing
            // about the next one it can.
            self.samples.clear();
            self.over_since = None;
            self.under_since = None;
            self.share = None;
            return Transition::Unchanged;
        };
        // A counter that went backwards is a different process behind the same id: start over.
        if self.samples.last().map_or(false, |last| cpu_100ns < last.cpu_100ns || at_ms <= last.at_ms) {
            self.samples.clear();
        }
        self.samples.push(Sample { at_ms, cpu_100ns });
        let Some(budget) = budget else {
            self.over_since = None;
            self.under_since = None;
            return Transition::Unchanged;
        };
        let window = budget.window_ms();
        // Keep the newest sample at or before the window's start as its base, and nothing older.
        let horizon = at_ms.saturating_sub(window);
        if let Some(base_index) = self.samples.iter().rposition(|s| s.at_ms <= horizon) {
            self.samples.drain(..base_index);
        }
        let base = self.samples[0];
        if base.at_ms >= at_ms {
            return Transition::Unchanged; // the first reading has nothing to be measured against
        }
        let cpu_ms = (cpu_100ns - base.cpu_100ns) as f64 / 10_000.0;
        let share = cpu_ms / (at_ms - base.at_ms) as f64 * 100.0;
        self.share = Some(share);
        let limit = budget.for_state(state);
        let over = share > limit;

        if !self.in_overrun {
            if !over {
                self.over_since = None;
                return Transition::Unchanged;
            }
            let since = *self.over_since.get_or_insert(base.at_ms);
            if at_ms - since >= SUSTAINED_MS {
                self.in_overrun = true;
                self.over_since = None;
                self.under_since = None;
                return Transition::Entered { share, budget: limit, state };
            }
            return Transition::Unchanged;
        }
        if over {
            self.under_since = None;
            return Transition::Unchanged;
        }
        let since = *self.under_since.get_or_insert(base.at_ms);
        if at_ms - since >= window {
            self.in_overrun = false;
            self.under_since = None;
            return Transition::Left;
        }
        Transition::Unchanged
    }
}

/// What a daemon's snapshot says about it this tick, read off the status's `cost` block.
#[derive(Debug, Clone, PartialEq)]
pub struct DaemonReport {
    pub state: DaemonState,
    /// The snapshot's top cause and the label it carries (a workspace, a route or a code), when it
    /// names one.
    pub top_cause: Option<(String, Option<String>)>,
}

/// The footer text for a daemon in overrun (167/DESIGN, the binding checklist): its label, its
/// share rounded to a whole percent, the budget and the state it was judged in, then what it is
/// spending its time on — or, for a daemon that stopped reporting, that it has.
pub fn overrun_notice(label: &str, share: f64, budget: f64, state: DaemonState, top_cause: Option<&(String, Option<String>)>) -> String {
    let head = format!("{label} is using {}% of a core ({} budget {}%)", share.round() as i64, state.as_str(), percent(budget));
    match (state, top_cause) {
        (DaemonState::NotReporting, _) => format!("{head} — it has stopped reporting what it is doing"),
        (_, Some((cause, Some(subject)))) => format!("{head} — mostly {cause} on {subject}"),
        (_, Some((cause, None))) => format!("{head} — mostly {cause}"),
        (_, None) => head,
    }
}

/// A budget percent as the operator wrote it: `2`, `10`, or `2.5`, never `2.0`.
fn percent(value: f64) -> String {
    if value.fract() == 0.0 { format!("{}", value as i64) } else { format!("{value}") }
}

/// The footer's ONE notice slot (167/ADR-006): a standing exit notice outranks an overrun.
pub fn footer_notice(exit_notice: Option<&str>, overrun_notice: Option<&str>) -> Option<String> {
    exit_notice.or(overrun_notice).map(str::to_string)
}

/// One line the guard logs as an overrun starts or ends.
#[derive(Debug, Clone, PartialEq)]
pub struct GuardEvent {
    pub code: &'static str,
    pub message: String,
}

/// The two supervised daemons the guard watches, each with its label as the footer names it and
/// the `cost.daemons[].daemon` name its snapshot carries.
pub const WATCHED_DAEMONS: [(&str, &str, &str); 2] = [(MESH_SERVE_ID, "mesh serve", "serve"), (MESH_UI_ID, "mesh ui", "ui")];

/// Both daemons' guards, and the one notice an overrun puts in the footer.
#[derive(Debug, Default)]
pub struct OverrunWatch {
    guards: [Guard; 2],
    notices: [Option<String>; 2],
}

impl OverrunWatch {
    pub fn new() -> Self {
        OverrunWatch::default()
    }

    /// Feed one poll tick: each watched daemon's OS reading by its child id, the budget the status
    /// read handed over (`None` when there was none), and each daemon's report by its snapshot
    /// name. Answers the lines to log, one per transition.
    pub fn observe(
        &mut self,
        reading: impl Fn(&str) -> Option<u64>,
        budget: Option<&Budget>,
        report: impl Fn(&str) -> Option<DaemonReport>,
        at_ms: u64,
    ) -> Vec<GuardEvent> {
        let mut events = Vec::new();
        for (index, (id, label, daemon)) in WATCHED_DAEMONS.iter().enumerate() {
            // A daemon with no snapshot in the cost block is one that is not reporting.
            let report = report(daemon).unwrap_or(DaemonReport { state: DaemonState::NotReporting, top_cause: None });
            match self.guards[index].observe(reading(id), at_ms, budget, report.state) {
                Transition::Entered { share, budget, state } => {
                    let text = overrun_notice(label, share, budget, state, report.top_cause.as_ref());
                    events.push(GuardEvent { code: OVER_BUDGET_CODE, message: text.clone() });
                    self.notices[index] = Some(text);
                }
                Transition::Left => {
                    self.notices[index] = None;
                    events.push(GuardEvent { code: BACK_WITHIN_BUDGET_CODE, message: format!("{label} is back within its budget") });
                }
                Transition::Unchanged => {}
            }
        }
        events
    }

    pub fn any_overrun(&self) -> bool {
        self.guards.iter().any(Guard::in_overrun)
    }

    /// The overrun notice for the footer: the first watched daemon in overrun.
    pub fn notice(&self) -> Option<&str> {
        self.notices.iter().flatten().next().map(String::as_str)
    }
}

/// One line of the shared degrade log (`~/.aof/mesh/logs/degrade.log`), in the JSONL sink's own
/// field order: `{ at, proc, level, code, message }`, with `proc` the desktop.
pub fn degrade_log_line(at_ms: u64, event: &GuardEvent) -> String {
    #[derive(Serialize)]
    struct Line<'a> {
        at: String,
        proc: &'a str,
        level: &'a str,
        code: &'a str,
        message: &'a str,
    }
    let line = Line { at: iso_utc(at_ms), proc: "desktop", level: "degrade", code: event.code, message: &event.message };
    let mut text = serde_json::to_string(&line).unwrap_or_default();
    text.push('\n');
    text
}

/// Epoch milliseconds as an ISO-8601 UTC instant (`2026-10-21T09:00:00.000Z`), the sink's `at`.
pub fn iso_utc(at_ms: u64) -> String {
    let days = (at_ms / 86_400_000) as i64;
    let ms_of_day = at_ms % 86_400_000;
    // Civil-from-days (Howard Hinnant's algorithm), valid for every date after 1970.
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + if month <= 2 { 1 } else { 0 };
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{:03}Z",
        ms_of_day / 3_600_000,
        (ms_of_day / 60_000) % 60,
        (ms_of_day / 1_000) % 60,
        ms_of_day % 1_000
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::status::parse_status;

    const TICK_MS: u64 = 3_000;
    const CORE_100NS_PER_MS: u64 = 10_000;

    // The budget the status read hands over: parsed from a status document, never a literal here.
    fn handed_budget() -> Budget {
        let status = parse_status(r#"{"nodes":[],"isControlNode":true,"cost":{"budget":{"idlePercent":2,"viewerOpenPercent":10,"windowSeconds":60},"daemons":[]}}"#).unwrap();
        status.cost().and_then(|cost| cost.budget).expect("the status read hands a budget")
    }

    // A fake daemon on an injected clock: its cumulative CPU advances by `percent` of one core
    // for each 3 s tick, and the guard is fed a sample every tick.
    struct Feed {
        guard: Guard,
        at_ms: u64,
        cpu: u64,
        transitions: Vec<(u64, Transition)>,
    }

    impl Feed {
        fn new() -> Self {
            let mut feed = Feed { guard: Guard::new(), at_ms: 1_000_000, cpu: 0, transitions: Vec::new() };
            feed.sample(Some(&handed_budget()), DaemonState::Idle);
            feed
        }
        fn sample(&mut self, budget: Option<&Budget>, state: DaemonState) {
            let t = self.guard.observe(Some(self.cpu), self.at_ms, budget, state);
            if t != Transition::Unchanged {
                self.transitions.push((self.at_ms, t));
            }
        }
        fn run(&mut self, percent: f64, span_ms: u64, budget: Option<&Budget>, state: DaemonState) {
            let mut elapsed = 0;
            while elapsed < span_ms {
                let step = TICK_MS.min(span_ms - elapsed);
                self.at_ms += step;
                self.cpu += (step as f64 * CORE_100NS_PER_MS as f64 * percent / 100.0) as u64;
                elapsed += step;
                self.sample(budget, state);
            }
        }
        fn entered(&self) -> Option<&Transition> {
            self.transitions.iter().map(|(_, t)| t).find(|t| matches!(t, Transition::Entered { .. }))
        }
    }

    // E1 · five minutes over the idle budget is an overrun
    #[test]
    fn e1_five_minutes_over_the_idle_budget_is_an_overrun() {
        let budget = handed_budget();
        let mut feed = Feed::new();
        feed.run(60.0, SUSTAINED_MS, Some(&budget), DaemonState::Idle);
        match feed.entered() {
            Some(Transition::Entered { share, budget, state }) => {
                assert_eq!(share.round(), 60.0);
                assert_eq!(*budget, 2.0);
                assert_eq!(*state, DaemonState::Idle);
            }
            other => panic!("expected an overrun, got {other:?}"),
        }
        assert!(feed.guard.in_overrun());
    }

    // E2 · a forty-second spike is not an overrun
    #[test]
    fn e2_a_forty_second_spike_is_not_an_overrun() {
        let budget = handed_budget();
        let mut feed = Feed::new();
        feed.run(90.0, 40_000, Some(&budget), DaemonState::Idle);
        feed.run(1.0, SUSTAINED_MS, Some(&budget), DaemonState::Idle);
        assert!(feed.transitions.is_empty(), "{:?}", feed.transitions);
    }

    // E3 · a minute back under budget ends the overrun
    #[test]
    fn e3_a_minute_back_under_budget_ends_the_overrun() {
        let budget = handed_budget();
        let mut feed = Feed::new();
        feed.run(60.0, SUSTAINED_MS, Some(&budget), DaemonState::Idle);
        assert!(feed.guard.in_overrun(), "entered overrun (non-vacuous)");
        feed.run(1.0, 57_000, Some(&budget), DaemonState::Idle);
        assert!(feed.guard.in_overrun(), "not yet a full minute under");
        feed.run(1.0, 3_000, Some(&budget), DaemonState::Idle);
        assert_eq!(feed.transitions.last().map(|(_, t)| t.clone()), Some(Transition::Left));
    }

    // Scenario Outline: the sustained duration's edges
    #[test]
    fn the_sustained_durations_edges() {
        for (span_ms, enters) in [(4 * 60_000 + 57_000, false), (5 * 60_000, true)] {
            let budget = handed_budget();
            let mut feed = Feed::new();
            feed.run(60.0, span_ms, Some(&budget), DaemonState::Idle);
            assert_eq!(feed.entered().is_some(), enters, "after {span_ms} ms");
        }
    }

    // E4 · with no budget from the status read, nothing is judged
    #[test]
    fn e4_with_no_budget_nothing_is_judged() {
        let mut feed = Feed::new();
        feed.run(100.0, 10 * 60_000, None, DaemonState::Idle);
        assert!(feed.transitions.is_empty());
        for document in [r#"{"nodes":[],"isControlNode":true}"#, r#"{"nodes":[],"isControlNode":true,"cost":{"daemons":[]}}"#, r#"{"nodes":[],"isControlNode":true,"cost":"garbled"}"#] {
            let status = parse_status(document).expect("a document with an absent or odd cost block still parses");
            assert_eq!(status.cost().and_then(|cost| cost.budget), None, "{document}");
        }
    }

    // E5 · a daemon that stopped reporting is judged against the looser budget
    #[test]
    fn e5_a_daemon_that_stopped_reporting_is_judged_against_the_looser_budget() {
        let budget = handed_budget();
        let mut feed = Feed::new();
        feed.run(100.0, SUSTAINED_MS, Some(&budget), DaemonState::NotReporting);
        match feed.entered() {
            Some(Transition::Entered { share, budget, state }) => {
                assert_eq!(share.round(), 100.0);
                assert_eq!(*budget, 10.0);
                assert_eq!(state.as_str(), "viewer-open");
            }
            other => panic!("expected an overrun, got {other:?}"),
        }
    }

    // a daemon the OS cannot sample is never judged
    #[test]
    fn a_daemon_the_os_cannot_sample_is_never_judged() {
        let budget = handed_budget();
        let mut guard = Guard::new();
        for tick in 0..200u64 {
            assert_eq!(guard.observe(None, 1_000_000 + tick * TICK_MS, Some(&budget), DaemonState::Idle), Transition::Unchanged);
        }
        assert!(!guard.in_overrun());
    }

    // ------------------------------------------------- task 01 · shown and logged, never acted on

    const SERVE_IDLE_TOP_CAUSE: &str = r#"{"nodes":[],"isControlNode":true,"cost":{"budget":{"idlePercent":2,"viewerOpenPercent":10,"windowSeconds":60},"daemons":[
        {"daemon":"serve","status":"idle","state":"idle","topCauses":[{"cause":"full-disk-read","labels":{"workspaceId":"52294b307214c27d"},"count":40}]},
        {"daemon":"ui","status":"idle","state":"idle","topCauses":[]}]}}"#;
    const SERVE_NOT_REPORTING: &str = r#"{"nodes":[],"isControlNode":true,"cost":{"budget":{"idlePercent":2,"viewerOpenPercent":10,"windowSeconds":60},"daemons":[
        {"daemon":"serve","status":"not-reporting","state":"idle","topCauses":[{"cause":"sync-pass","labels":{},"count":3}]},
        {"daemon":"ui","status":"idle","state":"idle","topCauses":[]}]}}"#;

    // The supervisor's side of a tick, over an injected sampler and clock: `serve` runs at
    // `serve_percent` of a core, `ui` idles at 1%.
    struct Supervisor {
        watch: OverrunWatch,
        status: crate::status::MeshStatus,
        at_ms: u64,
        serve_cpu: u64,
        ui_cpu: u64,
        log: Vec<String>,
        exit_notice: Option<String>,
    }

    impl Supervisor {
        fn new(document: &str) -> Self {
            let mut s = Supervisor { watch: OverrunWatch::new(), status: parse_status(document).unwrap(), at_ms: 1_000_000, serve_cpu: 0, ui_cpu: 0, log: Vec::new(), exit_notice: None };
            s.tick();
            s
        }
        fn tick(&mut self) {
            let cost = self.status.cost();
            let budget = cost.as_ref().and_then(|c| c.budget);
            let (serve, ui) = (self.serve_cpu, self.ui_cpu);
            let events = self.watch.observe(
                |id| if id == MESH_SERVE_ID { Some(serve) } else if id == MESH_UI_ID { Some(ui) } else { None },
                budget.as_ref(),
                |daemon| cost.as_ref().and_then(|c| c.report(daemon)),
                self.at_ms,
            );
            for event in &events {
                self.log.push(degrade_log_line(self.at_ms, event));
            }
        }
        fn run(&mut self, serve_percent: f64, span_ms: u64) {
            let mut elapsed = 0;
            while elapsed < span_ms {
                self.at_ms += TICK_MS;
                elapsed += TICK_MS;
                self.serve_cpu += (TICK_MS as f64 * CORE_100NS_PER_MS as f64 * serve_percent / 100.0) as u64;
                self.ui_cpu += TICK_MS * CORE_100NS_PER_MS / 100;
                self.tick();
            }
        }
        fn footer(&self) -> Option<String> {
            footer_notice(self.exit_notice.as_deref(), self.watch.notice())
        }
        fn tray(&self) -> &'static str {
            use crate::icon::{icon_state, AppSupervisionState, FleetSummary, ServerProcessState};
            icon_state(FleetSummary::AllOnline, ServerProcessState::Running, AppSupervisionState::Running, self.watch.any_overrun()).state_str()
        }
        fn logged(&self, code: &str) -> Vec<serde_json::Value> {
            self.log.iter().map(|line| serde_json::from_str::<serde_json::Value>(line.trim_end()).unwrap()).filter(|line| line["code"] == code).collect()
        }
    }

    // E1 · an overrun turns the tray degraded, fills the footer and logs one line
    #[test]
    fn e1_an_overrun_turns_the_tray_degraded_fills_the_footer_and_logs_one_line() {
        let mut s = Supervisor::new(SERVE_IDLE_TOP_CAUSE);
        assert_eq!(s.tray(), "healthy", "non-vacuous");
        s.run(60.0, SUSTAINED_MS);
        assert_eq!(s.tray(), "degraded");
        assert_eq!(s.footer().as_deref(), Some("mesh serve is using 60% of a core (idle budget 2%) — mostly full-disk-read on 52294b307214c27d"));
        let lines = s.logged(OVER_BUDGET_CODE);
        assert_eq!(s.log.len(), 1, "exactly 1 line: {:?}", s.log);
        assert_eq!(lines[0]["proc"], "desktop");
        assert_eq!(lines[0]["level"], "degrade");
        assert_eq!(s.log[0].split('"').nth(1), Some("at"), "the sink's own field order, `at` first");
    }

    // E3 · the end of an overrun clears the footer and logs one line
    #[test]
    fn e3_the_end_of_an_overrun_clears_the_footer_and_logs_one_line() {
        let mut s = Supervisor::new(SERVE_IDLE_TOP_CAUSE);
        s.run(60.0, SUSTAINED_MS);
        assert!(s.footer().is_some(), "in overrun and shown (non-vacuous)");
        s.run(1.0, 60_000);
        assert_eq!(s.footer(), None, "the footer returns to its populated text");
        assert_eq!(s.tray(), "healthy", "the tray returns to its fleet state");
        assert_eq!(s.logged(BACK_WITHIN_BUDGET_CODE).len(), 1);
        assert_eq!(s.log.len(), 2);
    }

    // E5 · a daemon that stopped reporting is named as such
    #[test]
    fn e5_a_daemon_that_stopped_reporting_is_named_as_such() {
        let mut s = Supervisor::new(SERVE_NOT_REPORTING);
        s.run(100.0, SUSTAINED_MS);
        assert_eq!(s.footer().as_deref(), Some("mesh serve is using 100% of a core (viewer-open budget 10%) — it has stopped reporting what it is doing"));
    }

    // E6 · an hour in overrun issues no stop, restart or kill — the watch has no such output: its
    // only answers are log lines and a notice (FF-16704 pins the shell side).
    #[test]
    fn e6_an_hour_in_overrun_says_it_once_and_acts_on_nothing() {
        let mut s = Supervisor::new(SERVE_IDLE_TOP_CAUSE);
        s.run(60.0, 60 * 60_000);
        assert!(s.watch.any_overrun(), "still in overrun after an hour");
        assert_eq!(s.log.len(), 1, "one line as it started, and nothing more: {:?}", s.log);
    }

    // E7 · a standing exit notice outranks the overrun in the footer
    #[test]
    fn e7_a_standing_exit_notice_outranks_the_overrun() {
        let mut s = Supervisor::new(SERVE_IDLE_TOP_CAUSE);
        s.run(60.0, SUSTAINED_MS);
        s.exit_notice = Some("mesh ui exited (code 1) — restarting".to_string());
        assert_eq!(s.footer().as_deref(), Some("mesh ui exited (code 1) — restarting"));
        assert_eq!(s.tray(), "degraded");
    }

    #[test]
    fn a_whole_number_budget_reads_without_a_decimal_and_the_instant_is_utc() {
        assert_eq!(percent(2.0), "2");
        assert_eq!(percent(2.5), "2.5");
        assert_eq!(iso_utc(0), "1970-01-01T00:00:00.000Z");
        assert_eq!(iso_utc(1_792_573_200_123), "2026-10-21T09:00:00.123Z");
    }
}
