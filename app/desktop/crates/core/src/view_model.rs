//! Story 02 · task 00 — the pure status-render view-model
//! (ARCHITECTURE 36/DESIGN §Surface 1 "Layout regions" item 3 · §"Design ramp per
//! region", ADR-004 the corrected `mesh status --json` shape).
//!
//! Maps a deserialized [`crate::status::MeshStatus`] (reusing story 00's
//! `parse_status()` types — the corrected shape: `presence.activeRuns`, `node.local`,
//! `node.stale`, top-level `isControlNode`; milestone 38's ADR-001 additive
//! `presence.sessions`) to a fixed row descriptor per node: the fleet-presence health
//! dot (from `stale`/`presence`, never a local-process signal), the `this node`
//! identity tag (from `node.local`), the role badge, the `aofVersion` (nested under
//! `presence`), and current work (from `presence.activeRuns`, else
//! `presence.sessions`, else `idle` — [`current_work`]).
//!
//! THE TWO RAMPS STAY SEPARATE (DESIGN §Non-negotiable framing): this module derives
//! ONLY the body dots from `mesh:status` — it never reads a local-supervisor signal
//! for a body dot. [`ControlBarPill`] models the OTHER (local-process) ramp
//! separately so a caller can assert both read truthfully side by side without
//! either overwriting the other.

use crate::status::{MeshStatus, Node};

/// The fleet-presence health dot (DESIGN §Surface 1 body row · §Design ramp "health
/// dot from the presence ramp"). `Stale` is a MUTED/grey mark — NEVER red (DESIGN
/// §Review notes "stale is never red").
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealthDot {
    Online,
    Stale,
    Offline,
}

impl HealthDot {
    pub fn label(&self) -> &'static str {
        match self {
            HealthDot::Online => "online",
            HealthDot::Stale => "stale",
            HealthDot::Offline => "offline",
        }
    }

    pub fn render_shape(&self) -> &'static str {
        match self {
            HealthDot::Online => "filled accent",
            HealthDot::Stale => "hollow muted",
            HealthDot::Offline => "hollow dim",
        }
    }

    /// True for the ONE mark the design ramp forbids ever being red-tinted.
    pub fn is_muted_never_red(&self) -> bool {
        !matches!(self, HealthDot::Online)
    }
}

/// The row's "current work" cell (DESIGN §Surface 1 body row "current work is the
/// single most-glanced fact"; milestone 38 DESIGN §Surface 1 row 3 — the state set
/// grows to THREE states: `idle` / `running N runs` / `working · <repo> (session)`).
///
/// F7/F8 fix (aof:verify 38, BLOCKER): `Running` no longer carries a `ref`/`title` —
/// the producer never emits `activeRuns[]` as objects (ADR-001 freezes it as a bare
/// `string[]` of run ids), so the cell can only ever know a COUNT, matching the JS
/// projection `ui/src/fleet/runs.mjs`'s `fleetCurrentWorkLines` (`running N runs`).
/// `Working` is the NEW session-derived state (F7 — the desktop never learned about
/// sessions at all before this fix).
///
/// MILESTONE 49 / story 01 (ADR-010): `Working`'s payload is the line's PARTS, not one
/// entry per session — `session_line_parts()` (status.rs) now groups on the raw repo
/// string and counts, so a repo holding two live sessions arrives here as the single
/// part `demo ×2`. The RENDERING is unchanged: the parts are still comma-joined under
/// one `working · ` prefix with ONE trailing `(session)`.
///
/// The field is `parts`, not `repos` (review fix, m49/01): DESIGN §The `(session)` line
/// and ARCHITECTURE ADR-010 both spell the seam `session_repos()`/`repos`, the names
/// they had while every element WAS a repo name. `aof ×2` is not a repo, and
/// `Vec<String>` cannot catch a consumer that reaches for one — so the name moved with
/// the meaning. No behaviour changed with it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CurrentWork {
    Running { runs: usize },
    Working { parts: Vec<String> },
    Idle,
}

impl CurrentWork {
    pub fn display(&self) -> String {
        match self {
            CurrentWork::Running { runs } => {
                let word = if *runs == 1 { "run" } else { "runs" };
                format!("running {runs} {word}")
            }
            // DESIGN §Surface 1 "Notes binding the review": the `working · ` prefix is
            // fixed, parts comma-joined, ONE trailing `(session)` qualifier — never
            // per-part qualifiers.
            CurrentWork::Working { parts } => format!("working \u{b7} {} (session)", parts.join(", ")),
            CurrentWork::Idle => "idle".to_string(),
        }
    }

    pub fn state_str(&self) -> &'static str {
        match self {
            CurrentWork::Running { .. } => "running",
            CurrentWork::Working { .. } => "working",
            CurrentWork::Idle => "idle",
        }
    }

    /// DESIGN §Surface 1 "working reads as a PEER of running, not louder and not
    /// quieter" — both active states (`Running`/`Working`) carry the SAME active
    /// emphasis (`primary`); only `Idle` is muted. Exposed as a boolean so a caller
    /// (the Tauri app layer / a future style seam) never has to string-match
    /// `state_str()` to decide the emphasis.
    pub fn is_active(&self) -> bool {
        !matches!(self, CurrentWork::Idle)
    }
}

/// The role badge — a neutral outline chip, no fill (DESIGN §Surface 1 body row).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RoleBadge {
    Control,
    Worker,
}

impl RoleBadge {
    pub fn label(&self) -> &'static str {
        match self {
            RoleBadge::Control => "control",
            RoleBadge::Worker => "worker",
        }
    }
}

/// One rendered node row (DESIGN §Surface 1 body row anatomy, in order: health dot,
/// name + this-node tag, role badge, version, current work).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NodeRow {
    pub health_dot: HealthDot,
    pub name: String,
    pub this_node: bool,
    pub role_badge: RoleBadge,
    /// `None` — "unknown version" (rendered as "\u{2014}") — when the node carries no
    /// `presence` (never a crash on the absent nested field).
    pub version: Option<String>,
    pub current_work: CurrentWork,
}

impl NodeRow {
    pub fn version_cell(&self) -> String {
        self.version.clone().unwrap_or_else(|| "\u{2014}".to_string())
    }
}

/// The LOCAL-supervisor ramp signal for one control-bar pill (running/stopped/
/// restarting) — kept as a SEPARATE type from [`HealthDot`] so the two ramps can
/// never structurally be conflated by a caller reusing one field for both.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ControlBarPill {
    Running,
    Stopped,
    Restarting,
}

impl ControlBarPill {
    pub fn label(&self) -> &'static str {
        match self {
            ControlBarPill::Running => "running",
            ControlBarPill::Stopped => "stopped",
            ControlBarPill::Restarting => "restarting",
        }
    }
}

/// Read the fleet-presence health dot from `node.presence`/`node.stale` ONLY — never
/// from a local-process signal (DESIGN §Surface 1 · §Non-negotiable framing).
///
/// STALE-FIRST PRECEDENCE (authoritative — mirrored in `app.js`'s `presenceOf()`):
/// `stale` is checked BEFORE the no-presence branch, so a `{stale:true, no-presence}`
/// node still renders `stale` (muted grey — DESIGN), never `offline`.
pub fn health_dot(node: &Node) -> HealthDot {
    if node.stale {
        return HealthDot::Stale;
    }
    if !node.has_presence() {
        return HealthDot::Offline;
    }
    HealthDot::Online
}

/// Read the current-work cell from `presence.activeRuns`/`presence.sessions` (both
/// nested — NOT flat on the node, ADR-004) — the F7/F8 fix (aof:verify 38, BLOCKER):
///
/// - `activeRuns` non-empty ⇒ `Running { runs: activeRuns.len() }` — ADR-004's
///   run-wins rule: a run on this node holds the line even when a live session ALSO
///   exists (DESIGN §Surface 1: "the run wins the primary line even if a session also
///   exists" — not a second/combined line). `activeRuns` is read as the FROZEN
///   `string[]` of bare run ids (F8) — never indexed as `{ ref, title }` objects.
/// - else `presence.sessions` non-empty ⇒ `Working { parts }`, one entry per DISTINCT
///   live-session repo, carrying its count where it holds more than one (m49/ADR-010 —
///   before that it was one entry per session, which named a repo twice; the grouping
///   lives in `session_line_parts()` and this function is unchanged by it). The
///   publisher (`assembleCurrentPresenceRecord`, `src/mesh-launcher.mjs`) has ALREADY
///   TTL-filtered `sessions[]` before the wire — this function performs NO liveness
///   recomputation and never ghosts an expired session; it renders exactly what it is
///   handed.
///   RUN-SUBSUMPTION IS NO LONGER DONE BY THE PUBLISHER (m48/ADR-004): the wire now
///   carries EVERY live session, each stamped with the fact `workspaceHasRun`, and the
///   subsumption POLICY is applied by whoever renders. This function needs no such
///   filter and gets none, because the `!runs.is_empty()` short-circuit above returns
///   BEFORE `session_line_parts()` is ever read — and `workspaceHasRun == true` implies
///   `activeRuns` is non-empty. So every session m48 newly exposes reaches this
///   function only on a path that already returned, and the rendered output is
///   byte-identical with or without that change.
/// - neither, or no presence at all ⇒ `Idle`.
pub fn current_work(node: &Node) -> CurrentWork {
    let runs = node.active_runs();
    if !runs.is_empty() {
        return CurrentWork::Running { runs: runs.len() };
    }
    let parts = node.session_line_parts();
    if !parts.is_empty() {
        return CurrentWork::Working { parts };
    }
    CurrentWork::Idle
}

/// The role badge from the node's caps/role. `is_control_role` is supplied by the
/// caller (derived from the node's `role`/`caps` field elsewhere in the document —
/// this pure mapper takes the already-resolved boolean, matching the Background's
/// "role badge from isControlNode/caps" framing without re-parsing raw JSON here).
pub fn role_badge(is_control_role: bool) -> RoleBadge {
    if is_control_role { RoleBadge::Control } else { RoleBadge::Worker }
}

/// Build the full row descriptor for one node.
pub fn node_row(node: &Node, is_control_role: bool) -> NodeRow {
    NodeRow {
        health_dot: health_dot(node),
        name: node.node_id.clone(),
        this_node: node.local,
        role_badge: role_badge(is_control_role),
        version: node.reported_aof_version().map(|s| s.to_string()),
        current_work: current_work(node),
    }
}

/// Build the full row set for EVERY node in a `mesh status` payload — none dropped
/// (DESIGN §Surface 1 "a populated mixed fleet renders every node"). Each row's
/// `is_control_role` is derived the SAME way the IPC caller derives it today
/// (`status.is_control_node() && node.local` — the control badge belongs to THIS
/// node only, and only when this install is itself the control node), so callers
/// (e.g. the Tauri shell's `get_view_model`) can point at this one shaping instead
/// of re-deriving a second per-node mapping.
pub fn node_rows(status: &MeshStatus) -> Vec<NodeRow> {
    status
        .nodes
        .iter()
        .map(|n| node_row(n, status.is_control_node() && n.local))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::status::parse_status;

    fn node_with_presence(stale: bool, active_runs_json: &str, aof_version: Option<&str>, local: bool) -> Node {
        let version_field = match aof_version {
            Some(v) => format!(r#","aofVersion":"{v}""#),
            None => String::new(),
        };
        let doc = format!(
            r#"{{"nodes":[{{"nodeId":"n1","stale":{stale},"local":{local},"presence":{{"activeRuns":{active_runs_json}{version_field}}}}}],"boards":[],"isControlNode":true}}"#,
        );
        parse_status(&doc).unwrap().nodes.into_iter().next().unwrap()
    }

    fn node_without_presence(stale: bool) -> Node {
        let doc = format!(r#"{{"nodes":[{{"nodeId":"n1","stale":{stale}}}],"boards":[],"isControlNode":true}}"#);
        parse_status(&doc).unwrap().nodes.into_iter().next().unwrap()
    }

    // Scenario Outline: each node's health dot comes from the fleet-presence ramp
    // (presence + stale), never from a process signal.
    #[test]
    fn health_dot_online_present_not_stale() {
        let n = node_with_presence(false, "[]", None, false);
        let dot = health_dot(&n);
        assert_eq!(dot.label(), "online");
        assert_eq!(dot.render_shape(), "filled accent");
    }

    #[test]
    fn health_dot_stale_present_and_stale() {
        let n = node_with_presence(true, "[]", None, false);
        let dot = health_dot(&n);
        assert_eq!(dot.label(), "stale");
        assert_eq!(dot.render_shape(), "hollow muted");
        assert!(dot.is_muted_never_red(), "a stale dot is a muted/grey mark, never red");
    }

    #[test]
    fn health_dot_offline_absent_presence() {
        let n = node_without_presence(false);
        let dot = health_dot(&n);
        assert_eq!(dot.label(), "offline");
        assert_eq!(dot.render_shape(), "hollow dim");
    }

    // Pins the STALE-FIRST precedence: a node with no presence at all but marked
    // stale still reads "stale" (muted grey), never "offline" — `stale` is checked
    // BEFORE the no-presence branch (mirrored in app.js's `presenceOf()`).
    #[test]
    fn health_dot_stale_takes_precedence_over_absent_presence() {
        let n = node_without_presence(true);
        let dot = health_dot(&n);
        assert_eq!(dot.label(), "stale", "stale is checked before the no-presence branch");
        assert_eq!(dot.render_shape(), "hollow muted");
        assert!(dot.is_muted_never_red(), "a stale dot is a muted/grey mark, never red");
    }

    // Scenario Outline: current work is read from presence.activeRuns — the frozen
    // `string[]` of run ids (F8) — as an aggregate `running N runs` count, else
    // muted idle. (Object-shaped `activeRuns` elements — the F8 defect — are pinned
    // as a parse error below, `f8_active_runs_object_shaped_element_is_a_parse_error_not_a_silent_empty_read`.)
    #[test]
    fn current_work_running_from_active_runs() {
        let n = node_with_presence(false, r#"["run-0001"]"#, None, false);
        let w = current_work(&n);
        assert_eq!(w.display(), "running 1 run");
        assert_eq!(w.state_str(), "running");
        assert!(w.is_active());
    }

    #[test]
    fn current_work_idle_when_active_runs_empty() {
        let n = node_with_presence(false, "[]", None, false);
        let w = current_work(&n);
        assert_eq!(w.display(), "idle");
        assert_eq!(w.state_str(), "idle");
    }

    #[test]
    fn current_work_idle_when_no_presence() {
        let n = node_without_presence(false);
        let w = current_work(&n);
        assert_eq!(w.display(), "idle");
        assert_eq!(w.state_str(), "idle");
    }

    // Scenario Outline: the this node tag is an identity label off node.local, only
    // on the local node, never a colour change.
    #[test]
    fn this_node_tag_present_when_local_true() {
        let n = node_with_presence(false, "[]", None, true);
        let row = node_row(&n, true);
        assert!(row.this_node, "the row carries a neutral-outline this node tag");
    }

    // Real (non-tautological) check for "the this node tag never a colour change":
    // build node_row for a LOCAL and a NON-LOCAL node whose presence/stale are
    // OTHERWISE IDENTICAL, and assert their health_dot is identical — pinning that
    // toggling `local` alone does not move the dot.
    #[test]
    fn this_node_tag_does_not_change_the_health_dot() {
        let local_node = node_with_presence(false, "[]", None, true);
        let non_local_node = node_with_presence(false, "[]", None, false);

        let local_row = node_row(&local_node, true);
        let non_local_row = node_row(&non_local_node, false);

        assert!(local_row.this_node, "the local node's row carries the this-node tag");
        assert!(!non_local_row.this_node, "the non-local node's row does not carry the this-node tag");
        assert_eq!(
            local_row.health_dot, non_local_row.health_dot,
            "identical presence/stale yields an identical health-dot regardless of the this-node tag"
        );
    }

    #[test]
    fn this_node_tag_absent_when_local_absent() {
        let n = node_without_presence(false);
        let row = node_row(&n, true);
        assert!(!row.this_node, "does not carry the this node tag");
    }

    // Scenario Outline: the role badge is a neutral chip and the version is read
    // from presence.aofVersion (nested, mono).
    #[test]
    fn role_badge_and_nested_version_control() {
        let n = node_with_presence(false, "[]", Some("1.9.3"), false);
        let row = node_row(&n, true);
        assert_eq!(row.role_badge.label(), "control");
        assert_eq!(row.version_cell(), "1.9.3");
    }

    #[test]
    fn role_badge_and_nested_version_worker() {
        let n = node_with_presence(false, "[]", Some("1.9.3"), false);
        let row = node_row(&n, false);
        assert_eq!(row.role_badge.label(), "worker");
        assert_eq!(row.version_cell(), "1.9.3");
    }

    #[test]
    fn version_unknown_when_no_presence() {
        let n = node_without_presence(false);
        let row = node_row(&n, false);
        assert_eq!(row.version_cell(), "\u{2014}", "an absent presence yields an unknown-version cell, never a throw");
    }

    // Scenario: a node with no presence renders idle / unknown-liveness /
    // unknown-version without crashing.
    #[test]
    fn node_with_no_presence_renders_whole_without_crashing() {
        let n = node_without_presence(false);
        let row = node_row(&n, true);
        assert_eq!(row.health_dot.label(), "offline");
        assert_eq!(row.current_work.display(), "idle");
        assert_eq!(row.version_cell(), "\u{2014}");
        // The mere fact this ran to completion (no panic) proves the "does not throw
        // dereferencing the absent presence.activeRuns/aofVersion" assertion.
        assert_eq!(row.name, "n1", "the row is still rendered — never dropped for a missing presence");
    }

    // Scenario: a node reads online in the body while its local web-UI child pill
    // reads stopped — the two ramps never conflate.
    #[test]
    fn body_dot_and_local_pill_are_independent_ramps() {
        let n = node_with_presence(false, "[]", None, true);
        let row = node_row(&n, true);
        let local_pill = ControlBarPill::Stopped;

        assert_eq!(row.health_dot.label(), "online", "the body health dot reads online (from presence/stale)");
        assert_eq!(local_pill.label(), "stopped", "the control-bar web-UI pill reads stopped (local-supervisor signal)");
        // Structurally distinct types — health_dot() never even receives a
        // ControlBarPill as input, so the body dot cannot be derived from it.
        assert_ne!(row.health_dot.label(), local_pill.label(), "the two ramps are read from separate sources and read truthfully side by side");
    }

    // Scenario: a populated MIXED fleet — a control this-node running, a worker
    // running, a worker idle, a stale worker — renders every node (none dropped),
    // with the stale node muted/never-red and a running row coexisting with an idle
    // row in the same row set.
    #[test]
    fn node_rows_maps_every_node_in_a_mixed_fleet_none_dropped() {
        let doc = r#"{
            "nodes": [
                { "nodeId": "control-mac", "local": true, "stale": false,
                  "presence": { "activeRuns": ["run-0001"], "sessions": [], "aofVersion": "1.9.3" } },
                { "nodeId": "worker-01", "local": false, "stale": false,
                  "presence": { "activeRuns": ["run-0002"], "sessions": [], "aofVersion": "1.9.3" } },
                { "nodeId": "worker-02", "local": false, "stale": false,
                  "presence": { "activeRuns": [], "sessions": [], "aofVersion": "1.9.2" } },
                { "nodeId": "worker-03-stale", "local": false, "stale": true,
                  "presence": { "activeRuns": [], "sessions": [], "aofVersion": "1.9.3" } }
            ],
            "boards": [],
            "isControlNode": true
        }"#;
        let status = parse_status(doc).expect("parses the mixed-fleet fixture");
        let rows = node_rows(&status);

        assert_eq!(rows.len(), status.nodes.len(), "every node in the payload is mapped — none dropped");

        let control = rows.iter().find(|r| r.name == "control-mac").unwrap();
        let running_worker = rows.iter().find(|r| r.name == "worker-01").unwrap();
        let idle_worker = rows.iter().find(|r| r.name == "worker-02").unwrap();
        let stale_worker = rows.iter().find(|r| r.name == "worker-03-stale").unwrap();

        // The stale node is present with a muted, never-red dot.
        assert_eq!(stale_worker.health_dot.label(), "stale");
        assert!(stale_worker.health_dot.is_muted_never_red(), "the stale row's dot is muted, never red");

        // A running node and an idle node coexist in the same row set.
        assert_eq!(running_worker.current_work.state_str(), "running");
        assert_eq!(running_worker.current_work.display(), "running 1 run");
        assert_eq!(idle_worker.current_work.state_str(), "idle");
        assert_eq!(idle_worker.current_work.display(), "idle");

        // The control this-node row carries the this-node tag + control role + its
        // own running work, undisturbed by the rest of the mixed set.
        assert!(control.this_node, "the control node's own row carries the this-node tag");
        assert_eq!(control.role_badge.label(), "control");
        assert_eq!(control.current_work.state_str(), "running");
        assert_eq!(control.health_dot.label(), "online");
    }

    // ─────────────────────────────────────────────────────────────────────
    // F7/F8 fix (aof:verify 38, BLOCKER) — the session signal + the real
    // `activeRuns` shape. Per the task's binding QA discipline, the base fixtures
    // below are REAL captured `aof mesh status --json` documents — never a
    // hand-authored record — so the exact defect class (F1/F4/F6/F7/F8: assuming a
    // shape the producer never emits) cannot recur here.
    // ─────────────────────────────────────────────────────────────────────

    // REAL — captured live in this repo via:
    //   aof session start --workspace 9db1fd84f5895e38 --repo aof --assistant claude-code
    //   (assembled + published through the real `readActiveRuns`/`readLiveSessions`/
    //   `assemblePresenceRecord`/`publishPresenceRecord` seams — mesh-presence.mjs)
    //   aof mesh status --json
    // 2026-07-12T20:55Z, node `win-host-a` (this machine, `local: true`): one LIVE
    // session on repo "aof", EMPTY `activeRuns`. Verbatim stdout, byte-for-byte.
    //
    // RE-CAPTURED 2026-08-11 (aof:verify 48, discharging the milestone's operator gate).
    // m48/ADR-005 grew the session entry to the frozen ordered six, so the local node's
    // `presence` object above was RE-CAPTURED from the post-m48 producer rather than
    // hand-edited: `startLauncher`'s first publish — the ONE production caller of
    // `assembleCurrentPresenceRecord` (src/mesh-launcher.mjs) — over a hermetic repo in
    // its own AOF_GLOBAL_HOME, with the session written by the real `startSession` (the
    // same seam `aof session start` calls) and NO run records, so `activeRuns` is
    // genuinely empty. The clock was INJECTED at this capture's own original instants
    // (heartbeat 20:55:20.455Z, session start 20:55:20.329Z), so the re-captured object
    // reproduces the original byte-for-byte EXCEPT where m48 actually changed the
    // producer: `sessionId` (null — this session was started with no id on any channel,
    // exactly as the original was) and `workspaceHasRun: false` (no run in its
    // workspace), plus `buildId`, which the producer now stamps with the build. Every
    // other node in this document is the untouched original capture. The re-serialisation
    // was proven lossless first — each payload parsed and re-emitted byte-for-byte before
    // any splice — so the diff is exactly this one object.
    // RE-CAPTURED 2026-08-14 (aof:verify 50, discharging this milestone's producer gate)
    // by the SAME method and under the SAME proof as the m48 re-capture above.
    // 50/ADR-008 decision 8 appended `relaying` as the session entry's SEVENTH key
    // (mesh-presence.mjs — `relaying: record.relaying === true`), so the session objects
    // in THIS fixture and the four below were re-emitted by the real producer rather
    // than hand-edited: `startSession` — the seam `aof session start` calls — wrote each
    // captured record into its own hermetic AOF_GLOBAL_HOME with the clock INJECTED at
    // that entry's own `lastPingAt`, and `readLiveSessions` — the seam
    // `assembleCurrentPresenceRecord`, and hence `aof mesh status --json`, reads through
    // — read it back. Every fixture was proven to re-serialise byte-for-byte BEFORE any
    // splice, and every re-captured entry reproduced its original byte-for-byte EXCEPT
    // the appended `"relaying": false` — `false` because these records predate the key,
    // which is the strict `=== true` projection the ADR specifies for exactly this case.
    // Nothing outside the eight session objects was touched.
    const REAL_CAPTURED_LIVE_SESSION_STATUS: &str = r#"{
  "nodes": [
    {
      "nodeId": "peer-git",
      "role": "worker",
      "controlNode": false,
      "host": "peer-git",
      "os": "linux",
      "runtimes": [],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-06-29T00:00:00.000Z",
      "lastSeenAt": "2026-07-04T10:00:00.000Z",
      "fabric": {
        "address": null,
        "online": null
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\peer-git.json",
      "presence": {
        "nodeId": "peer-git",
        "heartbeatAt": "2026-07-04T10:00:00.000Z",
        "activeRuns": [],
        "sessions": [],
        "aofVersion": "0.1.0",
        "buildId": "source"
      },
      "stale": true
    },
    {
      "nodeId": "umamis-mac-mini",
      "role": "worker",
      "controlNode": false,
      "host": "Umamis-Mac-mini.local",
      "os": "darwin",
      "runtimes": [
        "claude",
        "codex"
      ],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-07-07T19:20:52.437Z",
      "lastSeenAt": null,
      "fabric": {
        "address": "198.51.100.164",
        "online": true
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\umamis-mac-mini.json",
      "presence": {
        "nodeId": "umamis-mac-mini",
        "heartbeatAt": "2026-07-12T20:55:20.729Z",
        "activeRuns": [],
        "aofVersion": ""
      },
      "stale": false
    },
    {
      "nodeId": "win-host-a",
      "role": "control",
      "controlNode": true,
      "host": "Win-Host-A",
      "os": "win32",
      "runtimes": [
        "claude",
        "codex"
      ],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-07-09T20:34:57.253Z",
      "lastSeenAt": "2026-07-12T20:40:51.799Z",
      "fabric": {
        "address": null,
        "online": null
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\win-host-a.json",
      "presence": {
        "nodeId": "win-host-a",
        "heartbeatAt": "2026-07-12T20:55:20.455Z",
        "activeRuns": [],
        "sessions": [
          {
            "sessionId": null,
            "workspaceId": "9db1fd84f5895e38",
            "repo": "aof",
            "assistant": "claude-code",
            "lastPingAt": "2026-07-12T20:55:20.329Z",
            "workspaceHasRun": false,
            "relaying": false
          }
        ],
        "aofVersion": "0.1.0",
        "buildId": "source 7400664+dirty"
      },
      "stale": false,
      "local": true
    }
  ],
  "boards": [],
  "isControlNode": true
}"#;

    // REAL — captured live in this repo the SAME way, with a SECOND real session
    // started on a distinct workspace/repo (`aof session start --workspace
    // beta-ws-0001 --repo beta --assistant claude-code`) before the aggregate was
    // re-published. 2026-07-12T20:55Z, node `win-host-a`: two LIVE sessions (repos
    // "aof" and "beta"), EMPTY `activeRuns`. Verbatim stdout, byte-for-byte.
    //
    // RE-CAPTURED 2026-08-11 (aof:verify 48) by the same method, and under the same
    // proof, as the fixture above: the local node's `presence` is post-m48 producer
    // output with both sessions written by the real `startSession` in their original
    // order, the clock injected at this capture's own instants, and no run records.
    // RE-CAPTURED 2026-08-14 (aof:verify 50) — both session objects re-emitted by the
    // real producer under the method and proof recorded on the first fixture above.
    const REAL_CAPTURED_TWO_SESSIONS_STATUS: &str = r#"{
  "nodes": [
    {
      "nodeId": "peer-git",
      "role": "worker",
      "controlNode": false,
      "host": "peer-git",
      "os": "linux",
      "runtimes": [],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-06-29T00:00:00.000Z",
      "lastSeenAt": "2026-07-04T10:00:00.000Z",
      "fabric": {
        "address": null,
        "online": null
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\peer-git.json",
      "presence": {
        "nodeId": "peer-git",
        "heartbeatAt": "2026-07-04T10:00:00.000Z",
        "activeRuns": [],
        "sessions": [],
        "aofVersion": "0.1.0",
        "buildId": "source"
      },
      "stale": true
    },
    {
      "nodeId": "umamis-mac-mini",
      "role": "worker",
      "controlNode": false,
      "host": "Umamis-Mac-mini.local",
      "os": "darwin",
      "runtimes": [
        "claude",
        "codex"
      ],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-07-07T19:20:52.437Z",
      "lastSeenAt": null,
      "fabric": {
        "address": "198.51.100.164",
        "online": true
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\umamis-mac-mini.json",
      "presence": {
        "nodeId": "umamis-mac-mini",
        "heartbeatAt": "2026-07-12T20:55:06.761Z",
        "activeRuns": [],
        "aofVersion": ""
      },
      "stale": false
    },
    {
      "nodeId": "win-host-a",
      "role": "control",
      "controlNode": true,
      "host": "Win-Host-A",
      "os": "win32",
      "runtimes": [
        "claude",
        "codex"
      ],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-07-09T20:34:57.253Z",
      "lastSeenAt": "2026-07-12T20:40:51.799Z",
      "fabric": {
        "address": null,
        "online": null
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\win-host-a.json",
      "presence": {
        "nodeId": "win-host-a",
        "heartbeatAt": "2026-07-12T20:55:00.490Z",
        "activeRuns": [],
        "sessions": [
          {
            "sessionId": null,
            "workspaceId": "9db1fd84f5895e38",
            "repo": "aof",
            "assistant": "claude-code",
            "lastPingAt": "2026-07-12T20:54:50.051Z",
            "workspaceHasRun": false,
            "relaying": false
          },
          {
            "sessionId": null,
            "workspaceId": "beta-ws-0001",
            "repo": "beta",
            "assistant": "claude-code",
            "lastPingAt": "2026-07-12T20:54:50.302Z",
            "workspaceHasRun": false,
            "relaying": false
          }
        ],
        "aofVersion": "0.1.0",
        "buildId": "source 7400664+dirty"
      },
      "stale": false,
      "local": true
    }
  ],
  "boards": [],
  "isControlNode": true
}"#;

    // DG-2 (aof:uat 38, design-conformance review — DESIGN.md §Surface 1 S6):
    // REAL — captured through the real production seams (a genuine `startSession`
    // write per repo, then `startLauncher`'s `assembleCurrentPresenceRecord` —
    // mesh-launcher.mjs — the SAME aggregator that publishes the daemon's presence
    // record; run in an isolated `AOF_GLOBAL_HOME`, never against this machine's
    // live mesh state) via:
    //   aof session start --workspace ws-01 --repo pilot-app-portal --assistant claude-code
    //   aof session start --workspace ws-02 --repo aof --assistant claude-code
    // The two sessions' workspace ids are DELIBERATELY ordered opposite their repo
    // names (ws-01/pilot-app-portal started first, ws-02/aof second) so the
    // producer's own wire order is genuinely non-alphabetical by repo — the exact
    // `working · pilot-app-portal, aof (session)` shape DG-2 reports live. Node
    // `node-dg2`: two LIVE sessions (repos "pilot-app-portal" then "aof", in THAT
    // wire order), EMPTY `activeRuns`. Verbatim aggregator output, byte-for-byte.
    //
    // RE-CAPTURED 2026-08-11 (aof:verify 48) by exactly the method its original
    // provenance describes — the real aggregator, isolated `AOF_GLOBAL_HOME`, the two
    // sessions started in their deliberately non-alphabetical order — now against the
    // post-m48 producer. The wire order the DG-2 test depends on is reproduced by the
    // producer itself, not asserted into the fixture.
    // RE-CAPTURED 2026-08-14 (aof:verify 50) — both session objects re-emitted by the
    // real producer under the method and proof recorded on the first fixture above.
    const REAL_CAPTURED_TWO_SESSIONS_NON_ALPHA_STATUS: &str = r#"{
  "nodes": [
    {
      "nodeId": "node-dg2",
      "role": "control",
      "controlNode": true,
      "host": "node-dg2",
      "os": "linux",
      "runtimes": [
        "claude"
      ],
      "aofVersion": "0.1.0",
      "stale": false,
      "local": true,
      "presence": {
        "nodeId": "node-dg2",
        "heartbeatAt": "2026-07-12T21:10:00.000Z",
        "activeRuns": [],
        "sessions": [
          {
            "sessionId": null,
            "workspaceId": "ws-01",
            "repo": "pilot-app-portal",
            "assistant": "claude-code",
            "lastPingAt": "2026-07-12T21:10:00.000Z",
            "workspaceHasRun": false,
            "relaying": false
          },
          {
            "sessionId": null,
            "workspaceId": "ws-02",
            "repo": "aof",
            "assistant": "claude-code",
            "lastPingAt": "2026-07-12T21:10:00.000Z",
            "workspaceHasRun": false,
            "relaying": false
          }
        ],
        "aofVersion": "0.1.0",
        "buildId": "source 7400664+dirty"
      }
    }
  ],
  "boards": [],
  "isControlNode": true
}"#;

    // REAL — captured live on this fleet from a DEPLOYED post-m48 build
    // (`payload 7400664+dirty.20260811T211128`, installed by scripts/install-local.mjs and
    // serving both daemons), 2026-08-11T20:36Z, via:
    //   aof mesh status --json
    // Node `win-host-a` (this machine, `local: true`): ONE live claude-code session —
    // a REAL routable id, not a fixture value — in a workspace that ALSO has a running
    // run, so the session entry carries `workspaceHasRun: true`. Verbatim stdout,
    // byte-for-byte, with the two genuinely-remote peer nodes it came with.
    //
    // WHY THIS FIXTURE EXISTS (aof:verify 48). The three captures above all carry
    // `workspaceHasRun: false`, so they prove m48/ADR-005's key EXISTS without ever
    // exercising it. This one is the true branch, and it is precisely the payload m48
    // newly makes possible: before m48 the producer DROPPED this session from the wire
    // (`sessions[]` would be empty here), which is why no terminal surface could address
    // the busiest session in the fleet. It is also the cross-language half of story 02's
    // byte-identical claim — the desktop renders this payload exactly as it rendered the
    // pre-m48 one for the same situation (the test below).
    // RE-CAPTURED 2026-08-14 (aof:verify 50) — the session object re-emitted by the real
    // producer under the method and proof recorded on the first fixture above, with
    // `workspaceHasRun` reproduced by seeding the producer's own run set.
    const REAL_CAPTURED_SESSION_WITH_RUN_STATUS: &str = r#"{
  "nodes": [
    {
      "nodeId": "umamis-mac-mini",
      "role": "worker",
      "controlNode": false,
      "host": "Umamis-Mac-mini.local",
      "os": "darwin",
      "runtimes": [
        "claude",
        "codex"
      ],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-07-17T17:41:28.005Z",
      "lastSeenAt": "2026-07-27T20:15:11.729Z",
      "fabric": {
        "address": null,
        "online": null
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\umamis-mac-mini.json",
      "presence": {
        "nodeId": "umamis-mac-mini",
        "heartbeatAt": "2026-07-27T20:15:11.729Z",
        "activeRuns": [
          "20260727T154604663Z-0025"
        ],
        "sessions": [],
        "aofVersion": "0.1.0",
        "buildId": "source 4974c82+dirty"
      },
      "stale": true
    },
    {
      "nodeId": "win-host-a-wsl",
      "role": "worker",
      "controlNode": false,
      "host": "172.27.155.33",
      "os": "linux",
      "runtimes": [],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-08-02T23:54:21.043Z",
      "lastSeenAt": "2026-08-11T16:25:49.316Z",
      "fabric": {
        "address": "172.27.155.33",
        "online": true
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\win-host-a-wsl.json",
      "presence": {
        "nodeId": "win-host-a-wsl",
        "heartbeatAt": "2026-08-11T20:36:26.320Z",
        "activeRuns": [],
        "sessions": [],
        "aofVersion": "0.1.0",
        "buildId": "source 2546a06+dirty"
      },
      "stale": false
    },
    {
      "nodeId": "win-host-a",
      "role": "control",
      "controlNode": true,
      "host": "192.168.1.102",
      "os": "win32",
      "runtimes": [
        "claude"
      ],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-08-03T00:10:43.050Z",
      "lastSeenAt": "2026-08-11T20:36:24.658Z",
      "fabric": {
        "address": null,
        "online": null
      },
      "recordSource": "node-record",
      "workspaces": [
        {
          "workspaceId": "9db1fd84f5895e38",
          "name": "aof",
          "projectRoot": "C:\\Source\\umami\\aof"
        }
      ],
      "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\win-host-a.json",
      "presence": {
        "nodeId": "win-host-a",
        "heartbeatAt": "2026-08-11T20:36:24.658Z",
        "activeRuns": [
          "20260808T170931867Z-0000"
        ],
        "sessions": [
          {
            "sessionId": "afe04deb-9e45-4dfe-bee8-2268efc1b407",
            "workspaceId": "9db1fd84f5895e38",
            "repo": "aof",
            "assistant": "claude-code",
            "lastPingAt": "2026-08-11T20:36:11.627Z",
            "workspaceHasRun": true,
            "relaying": false
          }
        ],
        "aofVersion": "0.1.0",
        "buildId": "payload 7400664+dirty.20260811T211128"
      },
      "stale": false,
      "local": true
    }
  ],
  "boards": [],
  "isControlNode": true
}"#;

    // MILESTONE 49 / story 01 / task 01 (ADR-010) — THE FIFTH FIXTURE, and the reason it
    // exists: NONE of the four payloads above carries two live sessions in one repo, on
    // any node, so `crossSurfaceDriftViolations`
    // (test/arch/acd-captured-producer-fixture.test.mjs) — the gate that ties this Rust
    // surface to `ui/src/fleet/runs.mjs` — was structurally BLIND to the dedupe rule this
    // story lands. It could not see a divergence between the two implementations on the
    // one branch the commit changes. This payload is what gives it teeth, and the gate now
    // also REFUSES to run without a payload of this shape (its non-vacuity clause), so a
    // future re-capture cannot quietly drop it and return the gate to reading green while
    // blind.
    //
    // REAL — CAPTURED 2026-08-13T12:47:36Z as the verbatim stdout of:
    //   aof mesh status --json
    // run as a real CLI subprocess against a hermetic repo in its OWN AOF_GLOBAL_HOME
    // (never this machine's live mesh state), whose records were written by the real
    // production seams in this order:
    //   aof mesh identity                                              (the node record)
    //   aof session start --workspace ws-dup-01 --repo aof --assistant claude-code --session sess-alpha
    //   aof session start --workspace ws-dup-01 --repo aof --assistant claude-code --session sess-bravo
    //   (`startSession`, mesh-session.mjs — the seam that CLI calls), then
    //   `startLauncher`'s first publish (mesh-launcher.mjs — the ONE production caller of
    //   assembleCurrentPresenceRecord) with the clock LEFT ALONE, so every instant here is
    //   the real one at which it was taken.
    // Node `node-dup-repo` (`local: true`): TWO live claude-code sessions, BOTH in repo
    // `aof`, in the SAME workspace, distinguished by their own `sessionId` values
    // (`sess-alpha` / `sess-bravo` — deliberately NOT a letter-case pair, which a
    // case-insensitive filesystem would collapse into ONE record, m48/OUTCOME's open Gap),
    // and an EMPTY `activeRuns`. The empty run list is load-bearing: with a run present
    // the JS renders BOTH a `running N runs` line and the `(session)` line while this Rust
    // surface short-circuits to `Running{…}` and never reads sessions at all, so the gate
    // would pin the RUN line and the dedupe rule would go unpinned one layer down.
    // Verbatim stdout, byte-for-byte (the trailing newline aside, as for its four
    // siblings) — nothing retyped, nothing reordered.
    // RE-CAPTURED 2026-08-14 (aof:verify 50) — both session objects re-emitted by the
    // real producer under the method and proof recorded on the first fixture above.
    const REAL_CAPTURED_TWO_SESSIONS_ONE_REPO_STATUS: &str = r#"{
  "nodes": [
    {
      "nodeId": "node-dup-repo",
      "host": "127.0.0.1",
      "os": "win32",
      "runtimes": [],
      "aofVersion": "0.1.0",
      "publishedAt": "2026-08-13T12:47:36.412Z",
      "presence": {
        "nodeId": "node-dup-repo",
        "heartbeatAt": "2026-08-13T12:47:36.662Z",
        "activeRuns": [],
        "sessions": [
          {
            "sessionId": "sess-alpha",
            "workspaceId": "ws-dup-01",
            "repo": "aof",
            "assistant": "claude-code",
            "lastPingAt": "2026-08-13T12:47:36.418Z",
            "workspaceHasRun": false,
            "relaying": false
          },
          {
            "sessionId": "sess-bravo",
            "workspaceId": "ws-dup-01",
            "repo": "aof",
            "assistant": "claude-code",
            "lastPingAt": "2026-08-13T12:47:36.421Z",
            "workspaceHasRun": false,
            "relaying": false
          }
        ],
        "aofVersion": "0.1.0",
        "buildId": "source 95f517c+dirty"
      },
      "stale": false,
      "local": true
    }
  ],
  "boards": [],
  "isControlNode": true
}"#;

    fn local_node_from(doc: &str) -> Node {
        parse_status(doc)
            .expect("the real captured payload parses")
            .nodes
            .into_iter()
            .find(|n| n.local)
            .expect("the real payload carries exactly one local:true node")
    }

    // Scenario: a live session with no active run renders the working line (F7 —
    // the headline regression). Built from the REAL captured payload above — not a
    // hand-authored record.
    #[test]
    fn f7_live_session_no_run_renders_working_line() {
        let node = local_node_from(REAL_CAPTURED_LIVE_SESSION_STATUS);
        assert!(node.active_runs().is_empty(), "the real capture's activeRuns is empty");
        assert_eq!(node.session_line_parts(), vec!["aof".to_string()]);

        let w = current_work(&node);
        assert_eq!(w.display(), "working \u{b7} aof (session)");
        assert_eq!(w.state_str(), "working");
        assert!(w.is_active(), "the working state carries the SAME active emphasis a running node carries");
        assert_ne!(w.display(), "idle", "it is NOT idle");
    }

    // Scenario: a node working two repos shows both (SPEC's acceptance line) —
    // comma-joined under ONE `working ·` prefix, ONE trailing `(session)`. Built
    // from the second REAL captured payload above.
    #[test]
    fn f7_two_repos_show_both_comma_joined() {
        let node = local_node_from(REAL_CAPTURED_TWO_SESSIONS_STATUS);
        assert_eq!(node.session_line_parts(), vec!["aof".to_string(), "beta".to_string()]);

        let w = current_work(&node);
        assert_eq!(w.display(), "working \u{b7} aof, beta (session)");
        assert_eq!(w.state_str(), "working");
        assert!(w.is_active());
    }

    // Scenario: DG-2 (aof:uat 38, DESIGN.md §Surface 1 S6) — the repo list on the
    // session line is sorted deterministically ascending by repo short name, EVEN
    // WHEN the producer's own wire order is non-alphabetical. Built from the REAL
    // captured payload above, whose `sessions[]` wire order is genuinely
    // "pilot-app-portal" THEN "aof" (the exact live-observed defect order) —
    // `session_line_parts()`/`current_work()` must not echo that order verbatim.
    #[test]
    fn dg2_repo_list_sorted_alphabetically_even_when_wire_order_is_not() {
        let node = local_node_from(REAL_CAPTURED_TWO_SESSIONS_NON_ALPHA_STATUS);
        // The producer's wire order is the non-alphabetical one — confirms the
        // fixture genuinely exercises the defect, not a coincidentally-sorted input.
        assert_eq!(
            node.sessions().iter().map(|s| s.repo.as_str()).collect::<Vec<_>>(),
            vec!["pilot-app-portal", "aof"],
            "the captured payload's own sessions[] wire order is non-alphabetical",
        );

        // session_line_parts() — and therefore current_work()'s rendered line — sorts it.
        assert_eq!(node.session_line_parts(), vec!["aof".to_string(), "pilot-app-portal".to_string()]);

        let w = current_work(&node);
        assert_eq!(w.display(), "working \u{b7} aof, pilot-app-portal (session)");
        assert_eq!(w.state_str(), "working");
        assert!(w.is_active());
    }

    // Scenario: order-independence — the SAME repo set, fed to `session_line_parts()` in
    // two different wire orders, renders the IDENTICAL line either way (DG-2's
    // "must not reshuffle between polls" requirement). A three-repo case, to rule
    // out an accidental two-element-only sort.
    #[test]
    fn dg2_repo_list_order_is_independent_of_wire_order_three_repos() {
        let forward = r#"{"nodes":[{"nodeId":"n1","stale":false,"local":true,"presence":{"activeRuns":[],"sessions":[
            {"workspaceId":"ws-a","repo":"zeta","assistant":"claude-code","lastPingAt":"2026-07-12T00:00:00.000Z"},
            {"workspaceId":"ws-b","repo":"alpha","assistant":"claude-code","lastPingAt":"2026-07-12T00:00:00.000Z"},
            {"workspaceId":"ws-c","repo":"mid","assistant":"claude-code","lastPingAt":"2026-07-12T00:00:00.000Z"}
        ]}}],"boards":[],"isControlNode":true}"#;
        let reversed = r#"{"nodes":[{"nodeId":"n1","stale":false,"local":true,"presence":{"activeRuns":[],"sessions":[
            {"workspaceId":"ws-c","repo":"mid","assistant":"claude-code","lastPingAt":"2026-07-12T00:00:00.000Z"},
            {"workspaceId":"ws-b","repo":"alpha","assistant":"claude-code","lastPingAt":"2026-07-12T00:00:00.000Z"},
            {"workspaceId":"ws-a","repo":"zeta","assistant":"claude-code","lastPingAt":"2026-07-12T00:00:00.000Z"}
        ]}}],"boards":[],"isControlNode":true}"#;

        let forward_node = local_node_from(forward);
        let reversed_node = local_node_from(reversed);

        assert_eq!(forward_node.session_line_parts(), vec!["alpha".to_string(), "mid".to_string(), "zeta".to_string()]);
        assert_eq!(
            current_work(&forward_node).display(),
            current_work(&reversed_node).display(),
            "the same repo set, fed in a different wire order, renders the identical line",
        );
        assert_eq!(current_work(&forward_node).display(), "working \u{b7} alpha, mid, zeta (session)");
    }

    // Scenario: the run wins the line when a run and a session both exist
    // (ADR-004) — DESIGN §Surface 1: "the run wins the primary line even if a
    // session also exists" (not a second/combined line). Grounded in the REAL
    // captured single-session presence sub-object, with `activeRuns` set to the
    // literal value the task's own Scenario Outline sanctions (`["run-0001"]`) —
    // never an invented object shape for the run entry.
    #[test]
    fn f7_run_wins_the_line_over_a_live_session() {
        let doc = r#"{
            "nodes": [
                {
                    "nodeId": "win-host-a",
                    "stale": false,
                    "local": true,
                    "presence": {
                        "nodeId": "win-host-a",
                        "heartbeatAt": "2026-07-12T20:55:20.455Z",
                        "activeRuns": ["run-0001"],
                        "sessions": [
                            {
                                "workspaceId": "9db1fd84f5895e38",
                                "repo": "aof",
                                "assistant": "claude-code",
                                "lastPingAt": "2026-07-12T20:55:20.329Z"
                            }
                        ],
                        "aofVersion": "0.1.0",
                        "buildId": "source"
                    }
                }
            ],
            "boards": [],
            "isControlNode": true
        }"#;
        let node = local_node_from(doc);
        assert!(!node.active_runs().is_empty());
        assert!(!node.session_line_parts().is_empty(), "the fixture genuinely carries both a run AND a live session");

        let w = current_work(&node);
        assert_eq!(w.display(), "running 1 run", "the RUN renders, not the session");
        assert_eq!(w.state_str(), "running");
        assert!(!w.display().contains("session"), "the session does not add a second line for that same workspace");
    }

    // Scenario (m48/ADR-004, the cross-language half): the wire now carries a live
    // session whose workspace has a run — the exact record the pre-m48 producer
    // deleted — and the desktop still renders the RUN line, with no second
    // `(session)` line for that same workspace. Built from the REAL captured
    // post-m48 payload above, so this is the rendered-output-is-unchanged claim
    // measured against a real deployed fleet rather than a hand-built record.
    #[test]
    fn m48_a_session_stamped_workspace_has_run_still_renders_the_run_line() {
        let node = local_node_from(REAL_CAPTURED_SESSION_WITH_RUN_STATUS);
        assert!(!node.active_runs().is_empty(), "the real capture carries a running run");
        assert_eq!(
            node.session_line_parts(),
            vec!["aof".to_string()],
            "…AND the live session in that same workspace, which the pre-m48 wire would have dropped",
        );

        let w = current_work(&node);
        assert_eq!(w.display(), "running 1 run", "the RUN renders — subsumption is the renderer's rule now, and it still holds");
        assert_eq!(w.state_str(), "running");
        assert!(!w.display().contains("session"), "no second line for the session in the run's own workspace");
    }

    // ─────────────────────────────────────────────────────────────────────
    // MILESTONE 49 / story 01 — ONE REPO, SAID ONCE, WITH A COUNT.
    // DESIGN §The `(session)` line — the dedupe rule, RULED; ARCHITECTURE ADR-010.
    //
    // THE MULTIPLICATION SIGN IS WRITTEN RAW (U+00D7) IN EVERY ASSERTION BELOW, ON
    // PURPOSE. The cross-language gate re-derives the JS line for a captured payload and
    // looks for it in THIS source text as a quoted literal, escaping `·` to `\u{b7}` and
    // NOTHING ELSE (`rustLiteral`, acd-captured-producer-fixture.test.mjs). An assertion
    // spelled `\u{d7}2` would therefore make the gate report a drift that does not exist,
    // even though both implementations agree perfectly at runtime. The `·` stays `\u{b7}`
    // for exactly the same reason: that IS what the gate escapes it to.
    // ─────────────────────────────────────────────────────────────────────

    // Scenario (task 00, headline + the cross-language row) — TWO live sessions in ONE
    // repo name that repo ONCE and say how many. Built from the FIFTH REAL captured
    // payload, which exists precisely so this claim is one the gate can check.
    #[test]
    fn m49_two_sessions_in_one_repo_render_the_repo_once_with_a_count() {
        let node = local_node_from(REAL_CAPTURED_TWO_SESSIONS_ONE_REPO_STATUS);
        assert!(node.active_runs().is_empty(), "the capture carries NO active run — the line it pins is the (session) line");
        assert_eq!(node.sessions().len(), 2, "the capture genuinely carries two live sessions");
        assert_eq!(
            node.sessions().iter().map(|s| s.repo.as_str()).collect::<Vec<_>>(),
            vec!["aof", "aof"],
            "…both in the SAME repo",
        );
        assert_ne!(
            node.sessions()[0].last_ping_at, node.sessions()[1].last_ping_at,
            "…and they are two DISTINCT records, not one read twice",
        );

        assert_eq!(node.session_line_parts(), vec!["aof \u{d7}2".to_string()], "one part, not two");

        let w = current_work(&node);
        assert_eq!(w.display(), "working \u{b7} aof ×2 (session)");
        assert_eq!(w.state_str(), "working");
        assert!(w.is_active());
        // The repo is named ONCE — the whole point of the rule.
        assert_eq!(w.display().matches("aof").count(), 1, "the repo name appears exactly once in the line");
    }

    // Scenario Outline (task 00) — the desktop renders the identical line the JS
    // formatter renders, for the identical payload. Every row carries an EMPTY
    // `activeRuns` on purpose: with a run present the two implementations legitimately
    // differ today (this surface short-circuits to `Running{…}` and never reads
    // sessions), and that pre-existing divergence is TECH_DEBT, not this story's.
    #[test]
    fn m49_grouping_counting_and_ordering_examples_outline() {
        fn doc_for(repos: &[&str]) -> String {
            let sessions = repos
                .iter()
                .enumerate()
                .map(|(i, repo)| format!(
                    r#"{{"sessionId":"sess-{i}","workspaceId":"ws-{i}","repo":"{repo}","assistant":"claude-code","lastPingAt":"2026-08-13T12:00:00.000Z","workspaceHasRun":false}}"#,
                ))
                .collect::<Vec<_>>()
                .join(",");
            format!(
                r#"{{"nodes":[{{"nodeId":"n1","stale":false,"local":true,"presence":{{"nodeId":"n1","heartbeatAt":"2026-08-13T12:00:00.000Z","activeRuns":[],"sessions":[{sessions}],"aofVersion":"0.1.0","buildId":"source"}}}}],"boards":[],"isControlNode":true}}"#,
            )
        }

        let cases: [(&[&str], &str); 8] = [
            // one session — UNCHANGED from before this story
            (&["demo"], "working \u{b7} demo (session)"),
            (&["demo", "demo"], "working \u{b7} demo ×2 (session)"),
            (&["demo", "demo", "demo"], "working \u{b7} demo ×3 (session)"),
            // a two-digit count needs no separator
            (&["demo"; 10], "working \u{b7} demo ×10 (session)"),
            (&["demo", "aof", "demo"], "working \u{b7} aof, demo ×2 (session)"),
            (&["demo", "aof", "demo", "aof"], "working \u{b7} aof ×2, demo ×2 (session)"),
            // one session each — UNCHANGED
            (&["aof", "demo"], "working \u{b7} aof, demo (session)"),
            // the wire's order is not the line's order (the anti-echo row)
            (&["zeta", "alpha", "zeta", "mid"], "working \u{b7} alpha, mid, zeta ×2 (session)"),
        ];
        for (repos, expected) in cases {
            let node = local_node_from(&doc_for(repos));
            assert_eq!(current_work(&node).display(), expected, "repos {repos:?}");
        }
    }

    // Scenario Outline (task 00, "the grouping key is the RAW string") — no trim, no
    // case-fold, no normalisation of any kind. Two repos differing only by case, or only
    // by a space, are TWO repos; the sign is DATA as well as syntax, so a repo whose name
    // contains (or IS) `×` groups and renders like any other. Pinned in Rust as well as
    // JS because a normalising divergence here is exactly the class of drift the captured
    // fixture alone cannot catch (it carries one repo spelling).
    #[test]
    fn m49_the_grouping_key_is_the_raw_repo_string() {
        fn doc_for(repos: &[&str]) -> String {
            let sessions = repos
                .iter()
                .enumerate()
                .map(|(i, repo)| format!(
                    r#"{{"sessionId":"sess-{i}","workspaceId":"ws-{i}","repo":"{repo}","assistant":"claude-code","lastPingAt":"2026-08-13T12:00:00.000Z","workspaceHasRun":false}}"#,
                ))
                .collect::<Vec<_>>()
                .join(",");
            format!(
                r#"{{"nodes":[{{"nodeId":"n1","stale":false,"local":true,"presence":{{"nodeId":"n1","heartbeatAt":"2026-08-13T12:00:00.000Z","activeRuns":[],"sessions":[{sessions}],"aofVersion":"0.1.0","buildId":"source"}}}}],"boards":[],"isControlNode":true}}"#,
            )
        }

        let cases: [(&[&str], &str); 6] = [
            (&["Demo", "demo", "demo"], "working \u{b7} Demo, demo ×2 (session)"),
            (&[" demo", "demo", "demo"], "working \u{b7}  demo, demo ×2 (session)"),
            (&["demo ", "demo", "demo"], "working \u{b7} demo ×2, demo  (session)"),
            (&[" ", " "], "working \u{b7}   ×2 (session)"),
            (&["a×b", "a×b"], "working \u{b7} a×b ×2 (session)"),
            (&["×", "×"], "working \u{b7} × ×2 (session)"),
        ];
        for (repos, expected) in cases {
            let node = local_node_from(&doc_for(repos));
            assert_eq!(current_work(&node).display(), expected, "repos {repos:?}");
        }
    }

    // Scenario (task 00) — the sign is U+00D7 read as a CODEPOINT, and a count of one is
    // never written. `×` and `x` are indistinguishable in a review diff, so this reads the
    // characters rather than the glyphs.
    #[test]
    fn m49_the_sign_is_u00d7_and_a_count_of_one_is_never_written() {
        let doc = r#"{"nodes":[{"nodeId":"n1","stale":false,"local":true,"presence":{"nodeId":"n1","heartbeatAt":"2026-08-13T12:00:00.000Z","activeRuns":[],"sessions":[
            {"sessionId":"s1","workspaceId":"ws-1","repo":"demo","assistant":"claude-code","lastPingAt":"2026-08-13T12:00:00.000Z","workspaceHasRun":false},
            {"sessionId":"s2","workspaceId":"ws-2","repo":"demo","assistant":"claude-code","lastPingAt":"2026-08-13T12:00:00.000Z","workspaceHasRun":false},
            {"sessionId":"s3","workspaceId":"ws-3","repo":"aof","assistant":"claude-code","lastPingAt":"2026-08-13T12:00:00.000Z","workspaceHasRun":false}
        ],"aofVersion":"0.1.0","buildId":"source"}}],"boards":[],"isControlNode":true}"#;
        let node = local_node_from(doc);
        let line = current_work(&node).display();
        assert_eq!(line, "working \u{b7} aof, demo ×2 (session)");

        let chars: Vec<char> = line.chars().collect();
        let two = chars.iter().position(|c| *c == '2').expect("the count's digit is in the line");
        assert_eq!(chars[two - 1], '\u{d7}', "the character immediately before the digit is U+00D7, read as a codepoint");
        assert_eq!(chars[two - 2], ' ', "exactly one space between the repo and the sign, and none between the sign and the digit");
        assert!(!line.contains('x'), "no LATIN SMALL LETTER X anywhere in the line");
        assert!(!line.contains("\u{d7}1"), "a count of one is never written");
        assert!(line.starts_with("working \u{b7} ") && line.ends_with(" (session)"), "the frame is unchanged");
    }

    // Scenario (task 00) — the count is of SURVIVORS. This surface's filter is the
    // `current_work` short-circuit (m48/ADR-004): with a run present it renders the run
    // line and never counts a session at all, so "counted before filtering" is
    // structurally impossible here — pinned against the REAL captured payload that has
    // both a run and a live session in its workspace.
    #[test]
    fn m49_a_run_still_wins_the_line_so_nothing_is_counted_behind_it() {
        let node = local_node_from(REAL_CAPTURED_SESSION_WITH_RUN_STATUS);
        let line = current_work(&node).display();
        assert_eq!(line, "running 1 run");
        assert!(!line.contains('\u{d7}'), "no count leaks onto the run line");
    }
    // Scenario: an expired session never sticks — the cell falls back to idle. The
    // publisher (mesh-launcher.mjs's assembleCurrentPresenceRecord) TTL-filters
    // BEFORE the wire, so an expired session simply never appears in `sessions[]` —
    // this is exercised against the REAL `peer-git` node in the very same captured
    // payload above (a genuinely live, stale-and-sessionless real node), never a
    // synthetic "expired" record the desktop would have to age out itself.
    #[test]
    fn f7_publisher_already_dropped_session_falls_back_to_idle() {
        let status = parse_status(REAL_CAPTURED_LIVE_SESSION_STATUS).expect("the real capture parses");
        let node = status.nodes.iter().find(|n| n.node_id == "peer-git").unwrap();
        assert!(node.sessions().is_empty(), "the publisher already dropped this node's (expired) session before the wire");
        assert!(node.active_runs().is_empty());

        let w = current_work(node);
        assert_eq!(w.display(), "idle");
        assert_eq!(w.state_str(), "idle");
        assert!(!w.is_active(), "idle stays muted");
        // The mere fact this reads straight off `sessions[]` (never re-checking
        // `lastPingAt`/a TTL/a clock) IS the "no session-liveness computation of its
        // own" assertion — current_work()/session_line_parts() read no timestamp field.
    }

    // Scenario Outline: `activeRuns` is read in its REAL frozen shape — a `string[]`
    // of run ids (F8). The exact Examples table values.
    #[test]
    fn f8_active_runs_examples_outline() {
        let cases: [(&str, &str); 3] = [
            (r#"[]"#, "idle"),
            (r#"["run-0001"]"#, "running 1 run"),
            (r#"["run-0001", "run-0002"]"#, "running 2 runs"),
        ];
        for (active_runs_json, expected_cell) in cases {
            let n = node_with_presence(false, active_runs_json, None, false);
            let w = current_work(&n);
            assert_eq!(w.display(), expected_cell, "activeRuns {active_runs_json} renders {expected_cell}");
        }
    }

    // The desktop never indexes a run element as an object with ref/title fields —
    // pinned structurally: `Node::active_runs()` returns `&[String]`, so an object
    // element (`{"ref":..., "title":...}`) is a serde_json::Error at parse time, not
    // a silently-empty-strung `.get("ref")` (the exact F8 defect shape).
    #[test]
    fn f8_active_runs_object_shaped_element_is_a_parse_error_not_a_silent_empty_read() {
        let doc = r#"{"nodes":[{"nodeId":"n1","stale":false,"presence":{"activeRuns":[{"ref":"35/02","title":"UI"}]}}],"boards":[],"isControlNode":true}"#;
        assert!(parse_status(doc).is_err(), "an object-shaped activeRuns element is a parse error, never silently mis-indexed");
    }

    // Scenario: no presence at all degrades cleanly (activeRuns AND sessions both
    // read empty — idle, no error). Extends the pre-existing
    // `current_work_idle_when_no_presence` coverage to also pin `session_line_parts()`.
    #[test]
    fn f7_no_presence_degrades_cleanly_no_error() {
        let n = node_without_presence(false);
        assert!(n.session_line_parts().is_empty());
        let w = current_work(&n);
        assert_eq!(w.display(), "idle");
        assert_eq!(w.state_str(), "idle");
        assert!(!w.is_active());
    }

    // Closes the loop end-to-end THROUGH `node_rows()` — the EXACT function
    // `app/desktop/crates/app/src/main.rs`'s `get_view_model` IPC handler calls
    // (`row.current_work.display()` / `row.current_work.state_str()` become the
    // `current_work`/`work_state` JSON fields the WebView renders) — so this pins
    // the string actually reaches the window, not just the pure view-model, using
    // the SAME real captured payload as the headline F7 scenario above.
    #[test]
    fn f7_node_rows_end_to_end_ipc_shape_on_the_real_captured_payload() {
        let status = parse_status(REAL_CAPTURED_LIVE_SESSION_STATUS).expect("the real capture parses");
        let rows = node_rows(&status);
        let this_row = rows.iter().find(|r| r.this_node).expect("exactly one row carries the this-node tag");

        // What main.rs's IpcNodeRow literally serializes to the WebView:
        let ipc_current_work = this_row.current_work.display();
        let ipc_work_state = this_row.current_work.state_str();

        assert_eq!(this_row.name, "win-host-a");
        assert_eq!(ipc_current_work, "working \u{b7} aof (session)");
        assert_eq!(ipc_work_state, "working");
        assert!(this_row.current_work.is_active(), "the IPC-bound row is active, not the muted idle token");
    }
}
