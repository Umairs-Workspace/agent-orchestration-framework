---
doc: research
---
<!--
  Milestone RESEARCH.md — answers ONE question: what did we learn that constrains the choices?
  Owner: researcher. Facts only, each with a source/measurement and the constraint it imposes.
  No decisions, no architecture, no scenarios — that is the architect's ADRs (DESIGN/ARCHITECTURE.md).
-->
# 48 · Routable session identity — Research

Measured against this repo (`C:\Source\umami\aof`, branch `main`, commit `d71d508`), Node `v22.22.2`,
Claude Code `2.1.226`, codex-cli `0.130.0` (installed, `C:\Program Files\nodejs\codex`), Windows 11. Every
claim below is tagged **measured** (observed on this machine — code read or live data/transcript),
**documented** (vendor docs, cited), or **inferred** (a reading of measured/documented facts, not itself
directly observed).

## §1 — What session identity does each assistant actually deliver, per hook event?

**Finding.** `resolveSessionIdentity()` parses `session_id` off the hook's stdin JSON (falling back to
`CLAUDE_SESSION_ID` env) and returns it, but the CLI never threads that value into a session record —
`startSession`/`pingSession`/`endSession` are called with `{ nodeId, workspaceId, repo, assistant, now }`
only. All three Claude Code hooks (`SessionStart`, `UserPromptSubmit`, `SessionEnd`) fire in this repo,
each with a `session_id` field, and the value is stable for the whole session. Codex fires `SessionStart`,
`UserPromptSubmit`, `Stop` here — but has **no `SessionEnd`-equivalent hook wired, and the Codex product
itself has no `SessionEnd` event at all** (confirmed from vendor docs, not measured live).

**Evidence — the discard (measured, code read).**
- `src/commands/mesh-session.mjs:54-71` (`resolveSessionIdentity`) parses `payload.session_id` (stdin) or
  `env.CLAUDE_SESSION_ID`, returning `{ source, sessionId, payload }`.
- `src/commands/mesh-session.mjs:201` is the ONLY call site. `identity.sessionId` is never read again
  anywhere in the file (grepped `\.sessionId\b` in `src/commands/mesh-session.mjs` — one hit, the
  destructuring assignment itself). `identity.payload` and `identity.source` ARE consumed (cwd/workspace/
  repo derivation, assistant defaulting); `identity.sessionId` is not.
- `src/mesh-session.mjs:88-97` (`assembleSessionRecord`) — the FROZEN 6-key schema is `{ nodeId,
  workspaceId, repo, assistant, startedAt, lastPingAt }`. No session-id key exists in the record schema at
  all — even if the CLI threaded `identity.sessionId` through, there is nowhere in today's record to put
  it.

**Evidence — hook wiring, this repo (measured).**
- `.claude/settings.json:1-35` — `SessionStart` → `aof session start`; `UserPromptSubmit` → `aof session
  ping`; `SessionEnd` → `aof session end`. No args passed; identity resolves entirely from stdin/env.
- `src/bundle/hooks/codex-session-start.json`, `codex-session-prompt-ping.json`,
  `codex-session-stop-ping.json` — Codex gets `SessionStart` (matcher `startup|resume|clear`) →
  `aof session start --assistant codex`, `UserPromptSubmit` → ping, `Stop` → ping. **No
  `codex-session-end*.json` file exists** in `src/bundle/hooks/`, and `src/bundle/bundle.json:12-14` lists
  exactly these three codex hook assets — no fourth. The repo's own installed `.codex/hooks.json` mirrors
  this exactly (3 events, no `SessionEnd` key).

**Evidence — Claude Code payload shape + stability (documented + freshly measured live).**
- `wiki/work/38_milestone_cross-machine-worker-execution/RESEARCH.md` §2.2 (measured, prior pass): a
  hermetic rig captured all four Claude Code hook events firing in order `SessionStart → UserPromptSubmit
  → Stop → SessionEnd`, each carrying the SAME `session_id` value on stdin JSON, plus `transcript_path`,
  `cwd`, `hook_event_name`.
- **Freshly measured this pass**, on my own live running session in this repo:
  `C:\Users\Umami\.claude\projects\C--Source-umami-aof\be36ac57-bf60-406b-99a1-bd0d9aafa5cf.jsonl` records
  `"hookName":"SessionStart:startup"` and `"hookName":"UserPromptSubmit"` entries, both carrying
  `"sessionId":"be36ac57-bf60-406b-99a1-bd0d9aafa5cf"` — the SAME id as the transcript's own filename —
  and the hook's own tool-result content reads `"Session started for claude-code on 9db1fd84f5895e38
  (aof)."` / `"Session pinged for claude-code on 9db1fd84f5895e38."`, i.e. the real `aof session
  start|ping` commands ran, live, on this machine, during this research task.
- `wiki/work/38.../RESEARCH.md` §2.4: `SessionEnd`'s firing on crash/force-kill is a **documented
  absence** (the vendor docs neither assert nor deny it) — not measured in that pass either, and not
  re-measured here (out of scope for this read-only pass; see Open/unmeasurable).

**Evidence — Codex payload shape (documented, NOT measured live this pass).**
- `.tmp/openai-docs-cache/codex-manual.md:9490-9508` (cached vendor docs, "Common input fields"): every
  Codex command hook receives one JSON object on stdin including `session_id` ("Current Codex session id.
  Subagent hooks use the parent session id."), `transcript_path`, `cwd`, `hook_event_name`, `model`. This
  is the SAME shape family as Claude Code's payload (stdin JSON with `session_id`).
- `.tmp/openai-docs-cache/codex-manual.md:9507-9508` and the event table at `:9441-9454` — the documented
  Codex lifecycle event set is `SessionStart, PreToolUse, PermissionRequest, PostToolUse,
  UserPromptSubmit, SubagentStart, SubagentStop, Stop, PreCompact, PostCompact`. **`SessionEnd` is not in
  this list** — this is a genuine Codex product gap, not merely a missing wire-up in this repo's bundle.
- codex-cli `0.130.0` is installed on this machine (`codex --version`), so a live capture (mirroring the
  m38 §2.2 rig, substituting `codex exec` for `claude -p`) is technically possible but was **not**
  attempted this pass — building/running a live agent turn is outside this task's read-only-verbs
  discipline and was not clearly authorized. Flagged in Open/unmeasurable.

**Constraint this imposes.** A session id already arrives on the wire the CLI already owns (Claude Code,
on every hook event including `SessionEnd`); nothing needs to be invented to obtain it for Claude Code.
Codex has no `SessionEnd` signal at all — any lifecycle design that assumes an assistant-agnostic "end"
hook cannot rely on Codex ever calling `aof session end`; TTL expiry is Codex's ONLY end-of-life signal by
construction, not a defensive fallback.

## §2 — Is the hook's `session_id` the SAME id the worker captures onto an assignment?

**Finding.** Yes — for a first-run (non-resumed) worker session, the id the worker captures is Claude
Code's OWN `session_id`, sourced from its transcript filename, not a derivation. For a resumed session, the
worker is TOLD the id up front and never re-derives it — measured to stay identical across the resume.
Where a worker-driven session ALSO runs inside a worktree carrying this repo's own `.claude/settings.json`
hooks, the SAME id is independently captured a second time by the hook path — one value, two producers.

**Evidence — first-run capture mechanism (measured, code read + live transcript).**
- `src/mesh-worker-execution.mjs:887-899` (comment, SESSION_ID capture): "a TRANSCRIPT-DIR WATCH requiring
  ZERO model cooperation. A real interactive `claude` process... writes its OWN transcript to
  `<claudeProjectsDir({ cwd: worktreeCwd })>/<session_id>.jsonl` (**measured live** at the F-38.05 verify
  pass)."
- `src/mesh-worker-execution.mjs:975-1032` (`defaultWatchTranscriptSessionId`) — snapshots existing
  `*.jsonl` basenames in the transcripts dir BEFORE the session can write one, then polls for the FIRST NEW
  `*.jsonl` basename; that basename minus `.jsonl` IS the captured `sessionId` (line 1020:
  `finish(fresh.slice(0, -".jsonl".length))`).
- **Freshly confirmed live, this pass**: a real transcript on this machine,
  `C:\Users\Umami\.claude\projects\C--Source-umami-aof\ff8b3e0c-92b5-4053-ac08-4f8d68a8ce38.jsonl`, has its
  OWN internal `"sessionId":"ff8b3e0c-92b5-4053-ac08-4f8d68a8ce38"` field matching the filename exactly —
  the transcript filename and Claude Code's own `session_id` are the SAME value/namespace, not two ids
  that merely happen to correlate.
- `src/mesh-worker-execution.mjs:1588` awaits `options.onSessionIdCaptured?.(resolved)` with that same
  watched id; the default wiring (`src/mesh-worker-execution.mjs:2149`) forwards it into
  `sendAssignmentStatus?.(assignmentId, "running", { runId, sessionId })`.
- `src/assignment-record.mjs:163-189` (`updateAssignmentState`) writes `options.sessionId` into the
  `global_assignments.session_id` column — this is the id the terminal mirror's `(nodeId, sessionId)`
  routing tuple ultimately carries for an assignment.

**Evidence — resume path does NOT fork the id (measured comment, code read).**
- `src/mesh-worker-execution.mjs:3113-3126` (comment): "`claude --resume` keeps the SAME session id and
  appends the SAME transcript (**measured on the Mac 2026-07-27** 15:26Z: `89d1f151….jsonl` growing under
  the resumed process)." The resume call sets `watchTranscriptSessionId: async () => sessionId` (line
  3126) — i.e. it does NOT watch for a new file; it resolves INSTANTLY to the id it was already given.
  `outcome.sessionId` (assigned to a local named `forkedSessionId`, line 3155) is therefore always the
  SAME value passed in as `sessionId` for the resume call — the variable name "forked" does not indicate
  an actual id change; no divergence occurs on resume.

**Evidence — the SAME id can be captured by a second, independent producer (measured, code read).**
- `src/mesh-worker-execution.mjs:1397-1435` (`resolveInteractiveDriverLaunch`) spawns the real `claude`
  binary with no `--settings`/`--setting-sources` override — default settings-source resolution applies,
  so if the worktree contains a committed `.claude/settings.json` (as THIS repo does), the spawned worker
  session ALSO fires `SessionStart`/`UserPromptSubmit`/`SessionEnd` hooks, invoking `aof session
  start|ping|end` independently of the transcript watch.
- `src/mesh-worker-execution.mjs:805-833` (`pinWorkspaceIdInCheckout`) pins `mesh.workspaceId` into the
  scoped checkout's `.aof/aof.config.json` to match the assignment's own workspaceId BEFORE the interactive
  driver spawns — so if the hook path DOES fire inside the worktree, `resolveWorkspaceId`
  (`src/workspace-identity.mjs:31-38`) resolves the SAME workspaceId the assignment carries, not a
  per-machine path hash. This means the VALUE never diverges (both producers are downstream of the one
  Claude-Code-assigned UUID, and the workspaceId used to key the hook-side record is deliberately pinned to
  match), but there ARE two independent write paths for what is architecturally one fact: the
  `global_assignments.session_id` column (via the control-stream frame) and a `mesh-session.mjs` session
  record (via the hook CLI) — see §3 for why the latter cannot actually distinguish this session from any
  other concurrent one on the same node/workspace/assistant.

**Constraint this imposes.** The worker-captured id and the hook-delivered id are the same Claude-Code
session UUID by construction (one is read off the transcript filename Claude Code itself names after its
own `session_id`; resume never changes it). Any per-session index keyed on this id can treat "the id the
worker captured onto an assignment" and "the id a hook would report for that same process" as one fact,
never two that could disagree in value — the risk (per §3) is in HOW each producer keys/stores that shared
value, not in the value itself.

## §3 — Can two live sessions collide on today's record key?

**Finding.** Yes. `mesh-session.mjs`'s record key is `(nodeId, workspaceId, assistant)` — it contains no
session id at all, and the record schema itself carries no session-id field either. Two concurrent Claude
Code sessions in the same repo, on the same node, write to the exact same file. `pingSession` upserts onto
it (silently extending whichever session's identity happened to start first); `endSession` unconditionally
deletes it, regardless of whether a DIFFERENT concurrent session is still live.

**Evidence (measured, code read).**
- `src/mesh-session.mjs:65-67` (`sessionLeaf`): `${safeSegment(nodeId)}~${safeSegment(workspaceId)}~${safeSegment(assistant)}` —
  a 3-part key, no session id component.
- `src/mesh-session.mjs:74-76` (`sessionRecordPath`) builds the ONE file path from that 3-part leaf —
  exactly one file per `(nodeId, workspaceId, assistant)` triple, no matter how many distinct Claude Code
  processes share that triple.
- `src/mesh-session.mjs:88-97` (`assembleSessionRecord`) — the 6 keys are `nodeId, workspaceId, repo,
  assistant, startedAt, lastPingAt`; none of them is a session id, so even reading the file back cannot
  disambiguate which live process it currently represents.
- `src/mesh-session.mjs:143-149` (`startSession`) writes UNCONDITIONALLY — no read-before-write check for
  a pre-existing, different-session record.
- `src/mesh-session.mjs:157-171` (`pingSession`) UPSERTS: `startedAt: existing?.startedAt ?? nowIso` — a
  second concurrent session's ping keeps the FIRST session's `startedAt`, silently merging the two
  processes' identities into one record.
- `src/mesh-session.mjs:178-184` (`endSession`) unconditionally `unlink`s the leaf — if session A ends
  while session B (same node/workspace/assistant) is still live, A's `end` deletes the ONLY record, and B
  — still running — instantly reads as gone from presence until its next ping re-creates the file (up to
  the ping cadence's gap).

**Evidence — live leaf listing (measured, real `~/.aof`, redacted nothing).**
`C:\Users\Umami\.aof\mesh\sessions\` contains exactly ONE file right now:
`win-host-a~9db1fd84f5895e38~claude-code.json` (`nodeId~workspaceId~assistant`, no session-id segment),
content:
```json
{ "nodeId": "win-host-a", "workspaceId": "9db1fd84f5895e38", "repo": "aof", "assistant": "claude-code",
  "startedAt": "2026-08-10T12:48:36.839Z", "lastPingAt": "2026-08-10T12:48:43.076Z" }
```
This is my own live researcher session's record (matches the "Session started/pinged... 9db1fd84f5895e38"
transcript content in §1). Only one Claude Code session is running against this repo/node right now, so a
live TWO-session collision was not directly observable this pass (would require starting a second real
session, which the read-only discipline for this task does not authorize) — the collision mechanism itself
is unambiguous from the code above, independent of whether it was reproduced live.

**Constraint this imposes.** Today's session record is not a per-session record at all — it is a
per-`(node, workspace, assistant)` LATEST-WRITER-WINS liveness fact. Any design that wants "any live session
... addressable as `(nodeId, sessionId)`" needs the record itself to carry and be keyed additionally by
session id, or two concurrent sessions in the same workspace remain fundamentally indistinguishable and
mutually destructive (a live session's premature disappearance caused by an unrelated sibling session
ending).

## §4 — What actually happens to an expired session record on disk?

**Finding.** Nothing removes it. `isSessionLive` is a pure read-time filter (never touches disk);
`endSession` is the ONLY deleter in the codebase, and it is called from exactly one place — the `aof
session end` CLI verb (fired by `SessionEnd`/manual invocation). There is no reaper, sweep, or cron that
prunes a TTL-expired file whose end hook never ran (crash, force-kill, machine off). Live evidence on this
machine shows only 1 leaf, so accumulation could not be demonstrated from current data — that absence is
consistent with clean exits so far, not with a reaper existing.

**Evidence (measured, code read).**
- `src/mesh-session.mjs:195-197` (`isSessionLive`): `return !isStale({ heartbeatAt: record?.lastPingAt },
  nowMs, ttlMs)` — a pure boolean over an in-memory record; no fs call.
- `src/mesh-presence.mjs:93-110` (`readLiveSessions`): reads every record, filters via `isSessionLive`,
  returns the survivors — read-only, never deletes a stale record it filters out.
- Grepped `unlink|prune|sweep|reap|garbage|gc\(` across `src/mesh-session.mjs`, `src/mesh-presence.mjs`,
  `src/mesh-store.mjs` — the ONLY `unlink` call in the session's own module is
  `src/mesh-session.mjs:178-184` (`endSession`), and grepping the whole `src` tree for `endSession` finds
  exactly one call site: `src/commands/mesh-session.mjs:295` (the `aof session end` CLI verb). No other
  module imports or calls `endSession`.
- `src/mesh-store.mjs` has no reference to `sessions` at all (grepped) — the shared mesh-store module that
  DOES sweep/prune other partitions (nodes/assignments) has no session-specific logic.

**Evidence — live leaf count/age (measured, real `~/.aof`).** `C:\Users\Umami\.aof\mesh\sessions\` holds
exactly 1 file, `win-host-a~9db1fd84f5895e38~claude-code.json`, `startedAt` 2026-08-10T12:48:36Z (today,
this research session) — no orphaned/stale files present to measure an age spread from. This machine
happens to have zero accumulated orphans right now; it does not prove orphans cannot accumulate (the code
path for a crash/no-clean-exit leaving a stale file behind is real and unguarded — see §1's `SessionEnd`
crash/kill gap).

**Constraint this imposes.** A TTL-expired record is invisible to every LIVE read (§ isSessionLive already
filters it) but persists on disk forever unless a later `aof session end` for that EXACT `(nodeId,
workspaceId, assistant)` triple happens to run. Disk growth is unbounded in principle, bounded in practice
only by how many distinct `(node, workspace, assistant)` triples ever exist (a crash re-writes the SAME
leaf on the next `start`, so the growth is not per-crash — it is capped at one stale file per triple until
overwritten).

## §5 — How does a session key survive the fabric to the control node?

**Finding.** Every hop from the worker's presence assembly through to the fleet's `/api/mesh/status` JSON
response passes a session ENTRY through whole (object-level pass-through, no per-field whitelist) — except
two lossy points upstream of the fabric entirely: (1) `readLiveSessions`'s 4-key projection
(`{ workspaceId, repo, assistant, lastPingAt }`, no session id — because the underlying record has none,
per §3), and (2) the launcher's run-subsumption filter, which can DROP an entire session entry (not just
diet its fields) when the session's workspace already has an active run. The UI's `PresenceSession` TS
type is a compile-time-only 4-key shape (not a runtime filter).

**Evidence, hop by hop (measured, code read).**

1. **`readLiveSessions`** (`src/mesh-presence.mjs:93-110`) — reads every session record for the node,
   filters live, and projects EACH SURVIVOR to `{ workspaceId, repo, assistant, lastPingAt }` (line
   101-106) — a real, field-level whitelist. **LOSSY / must be taught**: a per-session key does not exist
   to project even if the underlying record carried one (it doesn't — §3).
2. **`mesh-launcher.mjs:585`** (run-subsumption filter): `sessions = (await readLiveSessions(...)).filter((session)
   => !workspacesWithRuns.has(session.workspaceId))` — an entire session entry is DROPPED, not diet'd, the
   moment its workspace has an active assignment/run. Comment at `:575-582` names this "ADR-004's
   run-wins-the-primary-line rule". **Structural filter that must be revisited**: this is in direct tension
   with "any live session ... addressable ... without going through an assignment" when the session IS one
   backing an active assignment.
3. **`assemblePresenceRecord`** (`src/mesh-presence.mjs:272-287`, worker side) — `sessions: sessions ?? []`
   passes the projected array through WHOLE, no further field stripping. **Pass-through.**
4. **`buildPresenceFrame`** (`src/worker-stream-client.mjs:118-120`) — `presence: { ...presence }` spreads
   the WHOLE presence object into the frame. **Pass-through.**
5. **`applyPresenceFrame`** (`src/control-stream-server.mjs:276-299`, control side) — rebuilds the
   TOP-LEVEL record from a fixed 6-key whitelist (`nodeId, heartbeatAt, activeRuns, sessions, aofVersion,
   buildId`); `sessions: safeSessionArray(presence.sessions)` (line 289) where `safeSessionArray`
   (`:270-274`) only checks each entry is a non-array object — it does NOT whitelist per-entry fields.
   **Top-level whitelist (already includes `sessions` as a key — no change needed there), but per-entry
   pass-through** — a new field added inside each session object (e.g. a session id) rides through this hop
   for free; only an entirely new TOP-LEVEL presence key would need this whitelist taught.
6. **`global-node-registry.mjs:201-209`** (`assembleGlobalRegistrySnapshot`) — reads the disk presence
   record and reshapes it via the SAME `assemblePresenceRecord` from step 3. Comment: "sessions[]/
   activeRuns travel through EXACTLY as the publisher emitted them — no liveness/subsumption is recomputed
   here." **Pass-through.**
7. **`global-mesh-query.mjs:263-267`** (`shapeGlobalStatus`): `nodes = registry.nodes.map((node) => ({
   ...node, assignments: ... }))` — spreads the WHOLE node object (including `node.presence.sessions`)
   through. **Pass-through.**
8. **`/api/mesh/status`** (`src/mesh-ui-serve.mjs:534-567`) — `sendJson(response, 200, body)` where `body =
   { ...result, scope }`. **Pass-through** (whole-object JSON serialization).
9. **`ui/src/fleet/api.ts:15-20`** (`PresenceSession` type) declares exactly `{ workspaceId, repo,
   assistant, lastPingAt }`. This is a TypeScript compile-time annotation ONLY — it does not strip data at
   runtime; the raw JSON parsed off the wire keeps whatever keys the server actually sent. Any TS-typed
   consumer code, however, only NAMES these 4 fields, so a 5th wire key is present-but-unused until the
   type (and any code that reads it) is grown.

**Constraint this imposes.** The real "must be taught" surface for a new per-session key is narrow and
concentrated: the session record's own schema (`assembleSessionRecord`, §3), `readLiveSessions`'s
projection (this section, point 1), the run-subsumption filter's drop condition (point 2, a POLICY
question, not a wire-shape one), and the UI's `PresenceSession` type (point 9, for type-safety/consumption,
not wire delivery). Every hop in between (worker `assemblePresenceRecord` → frame → control
`applyPresenceFrame` → registry reshape → `shapeGlobalStatus` → HTTP route) already carries an arbitrary
session-object field through unmodified.

## §6 — Is there already a fleet-side index of anything keyed by node?

**Finding.** `global_nodes` (SQLite, PK `node_id`) is the machine-wide node roster, but carries no session
data — presence (including `sessions[]`) is NOT persisted in SQLite at all; it is read fresh from the
per-node JSON file on disk (`presence/<nodeId>.json`) and merged into the node row in memory at query time.
The only SQLite column that IS a session id today is `global_assignments.session_id`, scoped to a single
assignment row (PK `assignment_id`), so it only exists for a session that has an assignment — exactly the
case this milestone is not about.

**Evidence (measured, code read).**
- `src/global-work-store.mjs:234-249` — `CREATE TABLE global_nodes (node_id TEXT PRIMARY KEY, role, ...
  runtimes_json, skills_json, aof_version, published_at, last_seen_at, fabric_address, fabric_online,
  record_source, descriptor_path)`. No presence/session columns.
- `src/global-work-store.mjs:262-267` — `CREATE TABLE global_node_workspaces (node_id, workspace_id,
  PRIMARY KEY (node_id, workspace_id))` + `idx_global_node_workspaces_workspace` — pure node↔workspace
  MEMBERSHIP, no liveness/session data.
- `src/global-work-store.mjs:280-294` — `CREATE TABLE global_assignments (assignment_id TEXT PRIMARY KEY,
  item_ref, workspace_id, target_node_id, issuer, state, run_id, assigned_at, updated_at, reclaimed_at,
  session_id, code)` + `idx_global_assignments_item ON (workspace_id, item_ref)` — note the index is on
  `(workspace_id, item_ref)`, NOT on `(target_node_id, session_id)`; no dedicated node+session lookup
  exists even within this table.
- `src/assignment-record.mjs:163-189` (`updateAssignmentState`) is the ONE writer of
  `global_assignments.session_id`, populated from `options.sessionId` — the worker's captured id, streamed
  up via the assignment-status frame (§2).
- `src/global-node-registry.mjs:152-172` (`queryGlobalRegistry`) — queries `global_workspace_descriptors`
  and `global_nodes` via SQL (`db.prepare(...)`), but presence (line 208: `await
  readPresenceRecord(presenceWorkspace, row.node_id)`) is a SEPARATE, non-SQL disk read merged onto each
  node row afterward (line 209: `node.presence = assemblePresenceRecord(diskPresence)`). `readPresenceRecord`
  (`src/mesh-presence.mjs:306-317`) reads `presence/<nodeId>.json` directly — not the database.
- `src/global-mesh-query.mjs:153-291` (`shapeGlobalStatus`) is a PURE shaping function with no I/O of its
  own (per its own doc comment, "no I/O") — it only joins in-memory `registry.nodes` (already
  presence-merged) with `assignments` rows; it introduces no new index.

**Constraint this imposes.** No existing SQLite table is keyed by `(nodeId, sessionId)` today. The closest
candidates that already exist per-node are `global_nodes` (1 row per node, no session data) and
`global_assignments` (has a `session_id` column but is keyed by `assignment_id` and requires an
assignment to exist). Session liveness itself is entirely disk-JSON-sourced (`mesh-session.mjs`'s
`sessions/` partition, merged at query time), not database-backed, at every layer measured.

## Open / unmeasurable

- **Codex hook payload — not measured live.** §1's Codex `session_id` claim rests on cached vendor docs
  (`.tmp/openai-docs-cache/codex-manual.md`), not a live capture in this environment. codex-cli `0.130.0`
  is installed here, so a hermetic rig mirroring m38 §2.2 (substitute `codex exec` for `claude -p`,
  capture raw stdin per hook event) would settle it — not attempted this pass (spawning a live agent turn
  was judged outside this task's read-only-verbs discipline).
- **`SessionEnd` on crash/force-kill — still unmeasured** (inherited from m38 §2.4, not re-attempted here).
  A live interactive-session hard-kill test (`claude` spawned interactively, then force-killed, checking
  whether `SessionEnd` fires) would settle it; it was explicitly out of scope for this read-only pass (no
  process starting/killing authorized).
- **Live two-session collision — not reproduced, only proven from code.** §3's collision mechanism
  (`sessionLeaf` has no session-id component; `pingSession`/`endSession` are blind to a differing
  concurrent session) is unambiguous from `src/mesh-session.mjs`, but was not observed against two REAL
  concurrent sessions on this machine (would require running a second live `aof session start|ping`,
  which this task's read-only discipline explicitly disallows).
- **Orphan accumulation over time — not observable from a single snapshot.** `C:\Users\Umami\.aof\mesh\sessions\`
  holds exactly 1 file right now (today's), so §4's "no reaper" code finding could not be corroborated with
  a real aged/orphaned leaf on this machine. A longer-horizon observation (or a deliberately crashed test
  session on an isolated `AOF_GLOBAL_HOME`) would settle whether orphans accumulate in practice, not just
  in principle.
