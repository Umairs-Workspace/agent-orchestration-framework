//! Task 01 — `mesh status --json` deserialization, the CORRECTED shape (ARCHITECTURE
//! 36/ADR-004 decisions 1-2, RESEARCH §3), extended by milestone 38's ADR-001 fifth
//! key.
//!
//! `{ nodes: [...], boards: [...], isControlNode }` — TWO arrays plus a scalar flag.
//! `activeRuns`/`sessions`/`aofVersion` live NESTED under each node's OPTIONAL
//! `presence` object (a node with no heartbeat omits `presence` entirely and reads
//! unknown/idle, WITHOUT panicking on the missing key). The "this is me" marker is
//! `node.local: true` (boolean, present ONLY on this node's own entry, omitted
//! everywhere else — never a top-level `localId` string). `node.stale` is an
//! independent boolean.
//!
//! **F8 fix (finding, aof:verify 38):** `activeRuns` is the FROZEN m23 `string[]` of
//! bare run ids (23/ADR-002) — NEVER an array of `{ ref, title }` objects. It is typed
//! here as `Vec<String>` so an object-shaped element is a genuine deserialize error,
//! not a silently-mis-indexed `serde_json::Value`.
//!
//! **F7 fix:** `sessions` (38/ADR-001, the additive fifth presence key) is a
//! `Vec<Session>`, each `{ workspaceId, repo, assistant, lastPingAt }` — already
//! TTL-filtered and run-subsumed by the publisher (ADR-002/ADR-004) before it ever
//! reaches this deserializer; this module performs NO liveness recomputation.
//!
//! This is the app's ONLY fleet-data source (ADR-004 d1-2) — no git/store/socket
//! crate anywhere; the poll spawns `aof mesh status --json` and deserializes its
//! stdout with this module.

use serde::Deserialize;
use std::collections::BTreeMap;
use std::path::PathBuf;

use crate::supervision::{SupervisedChild, DECLARATION_ARGV_PREFIX};

/// One live coding-assistant session (38/ADR-001) — a projection, never an authority:
/// `workspaceId` (the join key), `repo` (the human label the fleet line renders),
/// `assistant` (which tool), `lastPingAt` (the liveness stamp, read-only here — the
/// publisher already TTL-filtered before the wire).
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    #[serde(default)]
    pub workspace_id: String,
    #[serde(default)]
    pub repo: String,
    #[serde(default)]
    pub assistant: String,
    #[serde(default)]
    pub last_ping_at: String,
}

/// Presence, nested under a node — OMITTED entirely when the node has no heartbeat
/// (RESEARCH §3). `activeRuns`/`sessions`/`aofVersion` live HERE, never flattened
/// onto the node.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Presence {
    #[serde(default)]
    pub node_id: Option<String>,
    #[serde(default)]
    pub heartbeat_at: Option<String>,
    /// The FROZEN m23 shape (23/ADR-002): a bare `string[]` of run ids — NEVER
    /// `{ ref, title }` objects (F8). `#[serde(default)]` so a node whose presence
    /// predates 38/ADR-001 (no `sessions` key) still parses.
    #[serde(default)]
    pub active_runs: Vec<String>,
    /// 38/ADR-001's additive fifth key. `#[serde(default)]` because an older/peer
    /// presence record (pre-milestone-38) omits the key entirely — absence reads as
    /// "no live sessions", never a parse failure.
    #[serde(default)]
    pub sessions: Vec<Session>,
    #[serde(default)]
    pub aof_version: Option<String>,
}

/// One node's entry in `mesh status --json`'s `nodes[]` array. Only the fields this
/// app's role/view logic reads are modeled explicitly; anything else in the document
/// is ignored by serde's default "unknown fields are skipped" behaviour — the app
/// stays forward-compatible with fields RESEARCH §3 notes the live schema also
/// carries (`role`, `fabric`, `workspaces`, …) without needing to model them.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub node_id: String,
    /// `true` on EXACTLY this node's own entry, omitted (defaults false) elsewhere —
    /// a per-node boolean, never a top-level id string (RESEARCH §3).
    #[serde(default)]
    pub local: bool,
    /// A liveness flag, independent of whether `presence` is present.
    pub stale: bool,
    /// OPTIONAL — omitted entirely when the node has no heartbeat. Deserialization
    /// must not panic on the missing key.
    #[serde(default)]
    pub presence: Option<Presence>,
}

impl Node {
    /// `activeRuns`, read through the optional nested `presence` — an absent
    /// `presence` reads as "unknown/idle" (empty), never a panic. A `string[]` of run
    /// ids (F8) — never indexed as `{ ref, title }` objects.
    pub fn active_runs(&self) -> &[String] {
        match &self.presence {
            Some(p) => &p.active_runs,
            None => &[],
        }
    }

    /// `sessions`, read through the optional nested `presence` — an absent
    /// `presence` reads as "no live sessions" (empty), never a panic (F7).
    pub fn sessions(&self) -> &[Session] {
        match &self.presence {
            Some(p) => &p.sessions,
            None => &[],
        }
    }

    /// The PARTS of the `(session)` line: this node's LIVE sessions grouped by repo,
    /// non-empty repos only, each DISTINCT repo named ONCE and carrying its session
    /// count where it holds more than one — sorted deterministically ascending by repo
    /// short name (DESIGN.md §Surface 1 S6, DG-2) — a plain codepoint/byte-wise
    /// ordering, NOT a locale-sensitive collation.
    ///
    /// MILESTONE 49 / story 01 (DESIGN §The `(session)` line — the dedupe rule, RULED;
    /// ARCHITECTURE ADR-010). This used to be a bare `map().filter().sort()` that
    /// named a repo once per session, so two live sessions in one repo rendered
    /// `working · demo, demo (session)`. m48 held that deliberately and routed the
    /// decision to m49's DESIGN, which ruled: DEDUPLICATE **AND COUNT**.
    ///
    /// ```text
    /// ["demo", "demo"]          => ["demo ×2"]        working · demo ×2 (session)
    /// ["demo", "aof", "demo"]   => ["aof", "demo ×2"] working · aof, demo ×2 (session)
    /// ["aof", "demo"]           => ["aof", "demo"]    working · aof, demo (session)
    /// ```
    ///
    /// The grouping key is the RAW repo string — no trim, no case-fold, no
    /// normalisation (a `BTreeMap<String, usize>` groups on the exact bytes and yields
    /// its DISTINCT keys already in ascending order, which is steps 3-4 of DESIGN's
    /// algorithm in one structure). A count of 1 is never written; above 1 the part is
    /// `<repo> ×<count>` — ONE space before the sign, NONE after, and the sign is
    /// U+00D7 MULTIPLICATION SIGN (written RAW here, the same species of typographic
    /// character as the U+00B7 the line's prefix carries), never the letter `x`.
    ///
    /// This is the SECOND implementation of a rule whose first is
    /// `ui/src/fleet/runs.mjs`'s `fleetCurrentWorkLines`; the two agree byte-for-byte
    /// and are held to that by `crossSurfaceDriftViolations`
    /// (test/arch/acd-captured-producer-fixture.test.mjs) over a CAPTURED payload that
    /// exercises two live sessions in one repo. They move in ONE commit — ADR-010.
    ///
    /// Grouped AFTER filtering, so both projections agree on the exact same list, and
    /// the count is of what SURVIVED the filter. Performs NO liveness recomputation —
    /// the publisher already TTL-filtered `sessions[]` before the wire (F7), and run
    /// subsumption is `current_work`'s short-circuit (m48/ADR-004).
    ///
    /// NAMED FOR WHAT IT RETURNS (review fix, m49/01): DESIGN §The `(session)` line and
    /// ARCHITECTURE ADR-010 both spell this seam `session_repos()` — the name it had
    /// while it returned repo NAMES. As of this milestone an element may be `aof ×2`,
    /// which is a rendered PART and not a repo, so the name moved with the meaning
    /// (`Vec<String>` cannot catch a caller reaching for a repo and getting a line
    /// fragment — m50's grid orders by `(nodeId, repo, sessionId)`). Behaviour is
    /// untouched; the rename is inside ADR-010's "only `session_repos()`" clause, whose
    /// subject is behaviour.
    pub fn session_line_parts(&self) -> Vec<String> {
        let mut counts: BTreeMap<&str, usize> = BTreeMap::new();
        for session in self.sessions() {
            if session.repo.is_empty() {
                continue;
            }
            *counts.entry(session.repo.as_str()).or_insert(0) += 1;
        }
        counts
            .into_iter()
            .map(|(repo, count)| if count == 1 { repo.to_string() } else { format!("{repo} ×{count}") })
            .collect()
    }

    /// Whether `activeRuns` is knowable at all (a node WITH presence carries it,
    /// even if empty; a node with NO presence has no runs data — "unknown", not
    /// "known-empty"). Kept distinct from `active_runs().is_empty()` for callers
    /// that need to render "idle" vs "unknown" differently.
    pub fn has_presence(&self) -> bool {
        self.presence.is_some()
    }

    /// The reported `aofVersion`, nested under presence — `None` ("unknown") when
    /// presence is absent, matching the Background's "unknown / idle" expectation.
    pub fn reported_aof_version(&self) -> Option<&str> {
        self.presence.as_ref().and_then(|p| p.aof_version.as_deref())
    }
}

/// The document root: `{ nodes, boards, isControlNode }` — TWO arrays plus a scalar
/// flag, never a flatter single-array shape.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeshStatus {
    pub nodes: Vec<Node>,
    #[serde(default)]
    pub boards: Vec<serde_json::Value>,
    pub is_control_node: bool,
    /// The ADDITIVE `declarations` key (126/ADR-005 §1), present only under
    /// `mesh status --json --declarations`. `#[serde(default)]` is the house idiom for
    /// an optional additive key — the same absence-is-benign posture `boards` already
    /// has, and the reason an older aof, or one malformed row, can never blind the
    /// fleet view riding the same poll.
    #[serde(default)]
    pub declarations: Declarations,
}

/// The `declarations` key's value: `{ ok, rows, skipped }` (126/ADR-005 §6, AMENDED).
/// `rows` is what a supervisor acts on; `skipped` is the resolver's unreadable-workspace
/// list, which the supervisor reads NOT AT ALL and must not choke on. Rows are carried
/// OPAQUELY and projected through ONE filtering accessor, because serde's derive cannot
/// drop a bad element and a second wire-shaped struct beside `SupervisedChild` would be
/// two shapes for one thing.
#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Declarations {
    /// Whether the producer's workspace resolver ANSWERED (126/ADR-005 §6, AMENDED).
    /// `false` — including its DEFAULT, which is what an older aof emitting no key at all
    /// reads as — means the answer is unknown, never "this node declares nothing". The
    /// distinction is the whole point of the amendment: `{ ok: false, rows: [] }` and
    /// `{ ok: true, rows: [] }` are byte-identical to a caller that does not read `ok`,
    /// and reading the first as the second would let one unopenable store stop every
    /// supervised declaration on the node.
    #[serde(default)]
    pub ok: bool,
    #[serde(default)]
    pub rows: Vec<serde_json::Value>,
}

impl MeshStatus {
    /// The node marked `local: true`, if exactly one exists (the normal case —
    /// `local` is present on exactly one node's own entry).
    pub fn local_node(&self) -> Option<&Node> {
        self.nodes.iter().find(|n| n.local)
    }

    /// THE PARSE'S ONE GATE (126/ADR-006 contract-beat §5): project the opaque rows
    /// into supervised children, dropping any row that is not spawnable. Nothing
    /// downstream re-tests a row — a dropped row is dropped once, here.
    ///
    /// `id`, `argv` and `cwd` are REQUIRED: an unaddressable row could be neither
    /// started nor stopped, an argv-less row has nothing to spawn, and a `cwd`-less one
    /// would inherit the supervisor's own launch directory. `label` is display-only and
    /// defaults from the argv. `scope`, `level` and `cap` are display-only too and are
    /// carried by the producer for a human, never interpreted here.
    ///
    /// The argv gate is the RUNTIME half of the spawn roster and is deliberately
    /// NARROWER than it: a supplied argv is data no source sweep can see, so a row must
    /// never be able to spawn a mesh verb however the producer is wrong or compromised.
    pub fn declaration_children(&self) -> Vec<SupervisedChild> {
        self.declarations.rows.iter().filter_map(declaration_child).collect()
    }

    /// Whether this document ANSWERS the declarations question at all (126/ADR-005 §6,
    /// AMENDED). A reconcile is only entitled to run on an answer: an unreadable store,
    /// and an older aof that emits no `declarations` key, both read `false` here, and the
    /// supervisor must change nothing that tick rather than stopping what it cannot see.
    pub fn declarations_answered(&self) -> bool {
        self.declarations.ok
    }

    /// `isControlNode`, exposed as the role signal the shell's role latch (36/ADR-002
    /// d1) is driven off — ONE data command feeds both the fleet view and the role
    /// decision (36/ADR-004 d1-2). It selects no supervised SET: 126/ADR-006 §1
    /// superseded that, and the set is composed rather than matched.
    pub fn is_control_node(&self) -> bool {
        self.is_control_node
    }
}

/// Project ONE opaque row into a supervised child, or `None` when the row is not
/// spawnable. One ill-typed row drops that row, never the document.
fn declaration_child(row: &serde_json::Value) -> Option<SupervisedChild> {
    let id = non_empty_str(row.get("id"))?;

    let argv: Vec<String> = row
        .get("argv")?
        .as_array()?
        .iter()
        .map(|arg| arg.as_str().map(str::to_string))
        .collect::<Option<Vec<String>>>()?;
    if argv.len() < DECLARATION_ARGV_PREFIX.len() {
        return None;
    }
    if !argv.iter().zip(DECLARATION_ARGV_PREFIX.iter()).all(|(got, want)| got == want) {
        return None;
    }

    let cwd = non_empty_str(row.get("cwd"))?;

    Some(SupervisedChild {
        label: non_empty_str(row.get("label")).unwrap_or_else(|| format!("aof {}", argv.join(" "))),
        id,
        argv,
        cwd: Some(PathBuf::from(cwd)),
    })
}

/// A present, string-typed, non-blank field — anything else is absent as far as the
/// gate is concerned.
fn non_empty_str(value: Option<&serde_json::Value>) -> Option<String> {
    let text = value?.as_str()?;
    if text.trim().is_empty() {
        None
    } else {
        Some(text.to_string())
    }
}

/// Parse a `mesh status --json` document. Returns a `serde_json::Error` on a
/// genuinely malformed document (e.g. missing `nodes`/`isControlNode`) — but never
/// panics on a node that simply omits `presence`.
pub fn parse_status(json: &str) -> Result<MeshStatus, serde_json::Error> {
    serde_json::from_str(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Scenario Outline: a node deserializes activeRuns and aofVersion from its
    // optional nested presence, or reads idle when presence is absent.
    //
    // F8 fix: `activeRuns` is the FROZEN m23 `string[]` of bare run ids — NEVER
    // `{ ref, title }` objects (the exact shape the producer never emits, and the
    // one the pre-fix `current_work()` wrongly assumed).
    #[test]
    fn node_with_presence_reads_nested_active_runs_and_aof_version() {
        let doc = r#"{
            "nodes": [
                {
                    "nodeId": "umamis-mac-mini",
                    "stale": false,
                    "presence": {
                        "nodeId": "umamis-mac-mini",
                        "heartbeatAt": "2026-07-09T10:42:38.557Z",
                        "activeRuns": ["run-0001"],
                        "sessions": [],
                        "aofVersion": "0.1.0"
                    }
                }
            ],
            "boards": [],
            "isControlNode": true
        }"#;
        let status = parse_status(doc).expect("parses the corrected shape");
        let node = &status.nodes[0];
        assert!(node.has_presence(), "the node carries a presence object");
        assert_eq!(node.active_runs().len(), 1, "activeRuns reads the nested runs");
        assert_eq!(node.active_runs()[0], "run-0001", "activeRuns holds bare run-id strings, never objects");
        assert_eq!(node.reported_aof_version(), Some("0.1.0"), "reported aofVersion reads the nested value");
    }

    // F7 fix: `sessions` (38/ADR-001's additive fifth key) deserializes to the frozen
    // `{ workspaceId, repo, assistant, lastPingAt }` shape, and `session_line_parts()`
    // projects the live repos as the line's parts (m49/ADR-010: grouped on the raw
    // string, counted, distinct-sorted — one session, so no count is written).
    #[test]
    fn node_with_presence_reads_nested_sessions() {
        let doc = r#"{
            "nodes": [
                {
                    "nodeId": "umamis-msi",
                    "stale": false,
                    "local": true,
                    "presence": {
                        "nodeId": "umamis-msi",
                        "heartbeatAt": "2026-07-12T20:55:20.455Z",
                        "activeRuns": [],
                        "sessions": [
                            {
                                "workspaceId": "9db1fd84f5895e38",
                                "repo": "aof",
                                "assistant": "claude-code",
                                "lastPingAt": "2026-07-12T20:55:20.329Z"
                            }
                        ],
                        "aofVersion": "0.1.0"
                    }
                }
            ],
            "boards": [],
            "isControlNode": true
        }"#;
        let status = parse_status(doc).expect("parses the five-key shape");
        let node = &status.nodes[0];
        assert_eq!(node.sessions().len(), 1, "sessions reads the nested live-session array");
        assert_eq!(node.session_line_parts(), vec!["aof".to_string()], "session_line_parts projects the repo label");
    }

    // A node whose presence predates 38/ADR-001 (no `sessions` key at all — a real
    // condition this repo's own live mesh exhibits on an older peer) still parses,
    // reading zero sessions rather than failing the whole document.
    #[test]
    fn node_with_presence_but_no_sessions_key_reads_empty_sessions() {
        let doc = r#"{
            "nodes": [
                {
                    "nodeId": "umamis-mac-mini",
                    "stale": false,
                    "presence": {
                        "nodeId": "umamis-mac-mini",
                        "heartbeatAt": "2026-07-12T20:55:20.729Z",
                        "activeRuns": [],
                        "aofVersion": ""
                    }
                }
            ],
            "boards": [],
            "isControlNode": true
        }"#;
        let status = parse_status(doc).expect("parses a pre-ADR-001 presence record");
        let node = &status.nodes[0];
        assert!(node.sessions().is_empty(), "an omitted sessions key reads as no live sessions, never a parse failure");
        assert!(node.session_line_parts().is_empty());
    }

    #[test]
    fn node_without_presence_reads_idle_unknown_without_crashing() {
        let doc = r#"{
            "nodes": [
                { "nodeId": "umamis-msi", "stale": true }
            ],
            "boards": [],
            "isControlNode": false
        }"#;
        // The point of the assertion: parsing does not panic/error on the missing key.
        let status = parse_status(doc).expect("parses even when presence is omitted");
        let node = &status.nodes[0];
        assert!(!node.has_presence(), "presence is absent");
        assert!(node.active_runs().is_empty(), "activeRuns reads as unknown/idle (empty), not a crash");
        assert_eq!(node.reported_aof_version(), None, "aofVersion reads as unknown (None)");
    }

    // Scenario: exactly one node is marked local and every other node is not.
    #[test]
    fn exactly_one_node_reads_local_true_the_rest_read_false() {
        let doc = r#"{
            "nodes": [
                { "nodeId": "umamis-mac-mini", "stale": false },
                { "nodeId": "umamis-msi", "stale": true, "local": true }
            ],
            "boards": [],
            "isControlNode": true
        }"#;
        let status = parse_status(doc).unwrap();
        assert!(!status.nodes[0].local, "the first node reads local false (the key is omitted)");
        assert!(status.nodes[1].local, "the second node reads local true");
        let locals: Vec<&Node> = status.nodes.iter().filter(|n| n.local).collect();
        assert_eq!(locals.len(), 1, "exactly one node reads local true");
        assert_eq!(status.local_node().unwrap().node_id, "umamis-msi");
    }

    // Scenario Outline: node.stale deserializes as a boolean on each node.
    #[test]
    fn stale_deserializes_as_boolean_true() {
        let doc = r#"{"nodes":[{"nodeId":"a","stale":true}],"boards":[],"isControlNode":false}"#;
        let status = parse_status(doc).unwrap();
        assert_eq!(status.nodes[0].stale, true);
    }

    #[test]
    fn stale_deserializes_as_boolean_false() {
        let doc = r#"{"nodes":[{"nodeId":"a","stale":false}],"boards":[],"isControlNode":false}"#;
        let status = parse_status(doc).unwrap();
        assert_eq!(status.nodes[0].stale, false);
    }

    // Scenario: the top-level boards array and the isControlNode role flag are
    // parsed at the document root.
    #[test]
    fn top_level_boards_array_and_is_control_node_flag_parse_at_document_root() {
        let doc = r#"{"nodes":[],"boards":[],"isControlNode":true}"#;
        let status = parse_status(doc).unwrap();
        assert_eq!(status.boards.len(), 0, "boards is read as an array at the top level");
        assert_eq!(status.is_control_node(), true, "isControlNode reads true");
        // isControlNode is exposed as the role signal (ADR-002's supervision_set
        // consumes it directly — see supervision.rs task 02 seam).
        assert!(status.is_control_node, "isControlNode is exposed as the role signal");
    }

    #[test]
    fn full_measured_document_shape_parses_end_to_end() {
        // The full corrected shape as measured live against `node ./src/cli.mjs mesh
        // status --json` (RESEARCH §3 / this task's confirmation run) — extra fields
        // the live schema carries (role, fabric, workspaces, descriptorPath, …) are
        // present and must be silently ignored, not rejected.
        let doc = r#"{
          "nodes": [
            {
              "nodeId": "umamis-mac-mini",
              "role": "worker",
              "controlNode": false,
              "host": "Umamis-Mac-mini.local",
              "os": "darwin",
              "runtimes": ["claude", "codex"],
              "aofVersion": "0.1.0",
              "publishedAt": "2026-07-07T19:20:52.437Z",
              "lastSeenAt": null,
              "fabric": { "address": "198.51.100.164", "online": true },
              "recordSource": "node-record",
              "workspaces": [{"workspaceId": "9db1fd84f5895e38", "name": "aof", "projectRoot": "C:\\Source\\umami\\aof"}],
              "descriptorPath": "C:\\Users\\Umami\\.aof\\mesh\\nodes\\umamis-mac-mini.json",
              "presence": { "nodeId": "umamis-mac-mini", "heartbeatAt": "2026-07-09T10:42:38.557Z", "activeRuns": [], "aofVersion": "" },
              "stale": false
            },
            {
              "nodeId": "umamis-msi",
              "role": "control",
              "controlNode": true,
              "stale": true,
              "local": true
            }
          ],
          "boards": [],
          "isControlNode": true
        }"#;
        let status = parse_status(doc).expect("the full measured live shape parses");
        assert_eq!(status.nodes.len(), 2);
        assert_eq!(status.local_node().unwrap().node_id, "umamis-msi");
        assert!(status.nodes[0].has_presence());
        assert!(!status.nodes[1].has_presence());
        assert!(status.is_control_node());
    }

    // ── 126/03 task 00 — the `declarations` key: additive, gated at the parse, and
    // never able to lose the fleet document.

    /// A minimal well-formed document, with `declarations` spliced in verbatim so each
    /// case differs in exactly one thing.
    fn doc_with(declarations: Option<&str>) -> String {
        let key = match declarations {
            Some(value) => format!(r#","declarations":{value}"#),
            None => String::new(),
        };
        format!(
            r#"{{"nodes":[{{"nodeId":"umamis-msi","role":"control","local":true,"stale":false}}],"boards":[],"isControlNode":true{key}}}"#
        )
    }

    fn well_formed_row(id: &str) -> String {
        format!(
            r#"{{"id":"{id}","label":"loop 124","argv":["work","loop","124","--level","L2","--resume"],"cwd":"C:/Source/umami/aof","scope":"124","level":"L2","cap":8}}"#
        )
    }

    fn assert_fleet_document_intact(status: &MeshStatus) {
        assert_eq!(status.nodes.len(), 1, "`nodes` reads exactly as it does today");
        assert_eq!(status.nodes[0].node_id, "umamis-msi");
        assert!(status.boards.is_empty(), "`boards` reads exactly as it does today");
        assert!(status.is_control_node(), "`isControlNode` reads exactly as it does today");
    }

    // Scenario: the fleet document is never lost to the new key.
    #[test]
    fn the_fleet_document_is_never_lost_to_the_new_key() {
        for declarations in [
            None,
            Some(r#"{"ok":true,"rows":[],"skipped":[]}"#),
            Some(r#"{"ok":true,"rows":[],"skipped":[{"workspaceId":"abc","reason":"workdir-missing"}]}"#),
        ] {
            let status = parse_status(&doc_with(declarations)).expect("the parse succeeds");
            assert!(status.declaration_children().is_empty(), "the declaration set is empty ({declarations:?})");
            assert_fleet_document_intact(&status);
        }
    }

    // Scenario Outline: which supplied rows become declarations.
    #[test]
    fn which_supplied_rows_become_declarations() {
        let cases: Vec<(&str, String, usize)> = vec![
            // Rows that survive.
            (
                "carrying an extra unknown key",
                r#"{"id":"b","argv":["work","loop","126"],"cwd":"C:/x","unknown":42}"#.to_string(),
                2,
            ),
            ("with no `label`", r#"{"id":"b","argv":["work","loop","126"],"cwd":"C:/x"}"#.to_string(), 2),
            (
                "with no `scope`, no `level` and no `cap`",
                r#"{"id":"b","label":"loop 126","argv":["work","loop","126"],"cwd":"C:/x"}"#.to_string(),
                2,
            ),
            (
                "whose `cwd` contains spaces",
                r#"{"id":"b","argv":["work","loop","126"],"cwd":"C:/Source/Umami User/my project"}"#.to_string(),
                2,
            ),
            // Rows that are dropped, the rest of the document surviving.
            ("with no `id`", r#"{"argv":["work","loop","126"],"cwd":"C:/x"}"#.to_string(), 1),
            ("with no `argv`", r#"{"id":"b","cwd":"C:/x"}"#.to_string(), 1),
            ("with an empty `argv`", r#"{"id":"b","argv":[],"cwd":"C:/x"}"#.to_string(), 1),
            (
                "whose argv is [work, tune, 62]",
                r#"{"id":"b","argv":["work","tune","62"],"cwd":"C:/x"}"#.to_string(),
                1,
            ),
            (
                "whose argv is [mesh, serve, --serve]",
                r#"{"id":"b","argv":["mesh","serve","--serve"],"cwd":"C:/x"}"#.to_string(),
                1,
            ),
            ("with no `cwd`", r#"{"id":"b","argv":["work","loop","126"]}"#.to_string(), 1),
            (
                "whose `argv` is a string, not an array",
                r#"{"id":"b","argv":"work loop 126","cwd":"C:/x"}"#.to_string(),
                1,
            ),
        ];

        for (why, row, expected) in cases {
            let declarations = format!(r#"{{"ok":true,"rows":[{},{row}],"skipped":[]}}"#, well_formed_row("a"));
            let status = parse_status(&doc_with(Some(&declarations))).unwrap_or_else(|e| panic!("the parse succeeds ({why}): {e}"));
            assert_fleet_document_intact(&status);
            assert_eq!(
                status.declaration_children().len(),
                expected,
                "the declaration set holds {expected} row(s) — {why}"
            );
        }
    }

    #[test]
    fn a_surviving_row_carries_its_id_argv_and_cwd_and_labels_itself_when_it_must() {
        let declarations = format!(
            r#"{{"ok":true,"rows":[{},{}],"skipped":[]}}"#,
            well_formed_row("a"),
            r#"{"id":"b","argv":["work","loop","126","--level","L3","--resume"],"cwd":"C:/Source/Umami User/my project"}"#
        );
        let children = parse_status(&doc_with(Some(&declarations))).unwrap().declaration_children();

        assert_eq!(children.len(), 2);
        assert_eq!(children[0].id, "a");
        assert_eq!(children[0].label, "loop 124", "the supplied label is carried");
        assert_eq!(children[0].argv, vec!["work", "loop", "124", "--level", "L2", "--resume"]);
        assert_eq!(children[0].cwd, Some(PathBuf::from("C:/Source/umami/aof")));

        assert_eq!(children[1].id, "b");
        assert_eq!(children[1].label, "aof work loop 126 --level L3 --resume", "display only; the child labels itself from its argv");
        assert_eq!(
            children[1].cwd,
            Some(PathBuf::from("C:/Source/Umami User/my project")),
            "a path is a value, not a command line"
        );
    }

    // Scenario: a dropped row is dropped once, at the parse.
    #[test]
    fn a_dropped_row_never_reaches_the_composed_set() {
        let declarations = r#"{"ok":true,"rows":[{"id":"a","argv":[],"cwd":"C:/x"},{"id":"b","argv":["work","loop","126"]}],"skipped":[]}"#;
        let status = parse_status(&doc_with(Some(declarations))).expect("the parse succeeds");
        let children = status.declaration_children();
        assert!(children.is_empty(), "both rows were dropped at the parse");

        let set = crate::supervision::compose_supervised_set(&children);
        assert_eq!(set.len(), 2, "the set is exactly the two seeded daemons");
        assert!(set.iter().all(|c| crate::supervision::is_reserved_id(&c.id)));
    }

    /// 126/ADR-005 §6 (AMENDED) — an unreadable store is REPORTED, never read as an empty
    /// node. `{ ok: false, rows: [] }` and `{ ok: true, rows: [] }` carry the same rows and
    /// differ only here, which is exactly why a caller that ignores `ok` would turn one
    /// unopenable store into "stop every declaration on this node".
    #[test]
    fn a_reconcile_runs_only_on_a_document_that_answered() {
        let answered = parse_status(&doc_with(Some(r#"{"ok":true,"rows":[],"skipped":[]}"#))).unwrap();
        assert!(answered.declarations_answered(), "ok: true with zero rows IS an answer — this node declares nothing");
        assert!(answered.declaration_children().is_empty());

        let unreadable = parse_status(&doc_with(Some(
            r#"{"ok":false,"rows":[],"skipped":[]}"#,
        )))
        .unwrap();
        assert!(!unreadable.declarations_answered(), "ok: false is NOT an answer — the resolver could not say");
        assert!(unreadable.declaration_children().is_empty(), "and it carries no rows either way");

        // An older aof emits no `declarations` key at all. That is likewise not an answer,
        // and the default must fail CLOSED.
        let older = parse_status(&doc_with(None)).unwrap();
        assert!(!older.declarations_answered(), "an absent key is not an answer");
        assert_fleet_document_intact(&older);

        // A document that answered AND carries rows is the ordinary case.
        let ordinary = parse_status(&doc_with(Some(&format!(
            r#"{{"ok":true,"rows":[{}],"skipped":[]}}"#,
            well_formed_row("a")
        ))))
        .unwrap();
        assert!(ordinary.declarations_answered());
        assert_eq!(ordinary.declaration_children().len(), 1);
    }
}
