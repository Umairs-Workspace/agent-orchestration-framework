---
doc: research
---
<!--
  Milestone RESEARCH.md — answers ONE question: what did we learn that constrains the choices?
  Owner: researcher. Does NOT contain: the decision the findings led to (→ ARCHITECTURE.md).
-->
# 131 · The human in the loop — Research

## Method

`work.agents.delegation` is absent from `.aof/aof.config.json` (`grep -n delegation .aof/aof.config.json`
→ no match) → **off**. Every finding below was gathered directly on this model, read-only; no `codex
exec` delegation, no test run.

## R1 — The interactive PTY is unconditionally killed on `needs-input`, never left idle

Both detection paths end in `term.kill()`: the sentinel branch (`containsNeedsInputSentinel` →
`stopForOutcome({ outcome: "needs-input" })`, `src/agent-session-driver.mjs:1321-1323`) and the live
`AskUserQuestion` branch (the transcript watch's `pendingNow` latch settles immediately, :568-578,
then the driver's own `.then` calls `stopForOutcome`, :1450-1458) both route through `releasePty()` /
`term.kill()` (:1222-1243). The file says why: "a human resumes with a FRESH `claude --resume
<session_id>` … resume attaches a NEW process to the SAME persisted conversation, never reattaches to
a still-running one" (:1317-1320, repeated :1419-1420). Even a *finished* interactive `claude` never
exits on its own (:285-291), but the driver kills it anyway once the transcript shows `end_turn`, via
the same `stopForOutcome` path (:1425-1458). **No code path today leaves a driven PTY alive after any
settled outcome.** A resume mints a new session id (`forkedSessionId`,
`src/mesh/park-resume.mjs:136,151`) via `--resume <id>` on a fresh `driveInteractiveClaudeSession`
call (`resumeSessionId` → `args.push("--resume", …)`, `src/agent-session-driver.mjs:811-812`, wired
from `fix.resumeBuildRun` in `src/commands/drive.mjs:280-357`). **Constraint:** "keep the PTY alive"
(SPEC scope) is a new behaviour, not a description of today's driver; it means suppressing the kill on
the `needs-input` outcome specifically (both branches), while every other stop reason keeps killing.
That is a change to the frozen 17-export driver module (ADR-001 §3), inside the one function every
kill path already funnels through (`stopForOutcome`/`releasePty`).

## R2 — `needs-input` is a first-class `LOOP_STOP`; today it drains every other lane

`session-needs-input` sits in `LOOP_STOPS` beside `operator-interrupt` and the three lane stops
(`src/work/loop.mjs:26-50`). Three sites mint it: `src/loop/wave.mjs:552-553`, `src/loop/cycle.mjs:701-
702` (retry path) and `:981-982` (verify path) — all `haltDecision("session-needs-input", ref,
"driver:needs-input")`. `wave.mjs`'s own header states the current contract: **"a halt in one lane
DRAINS the others (no new dispatch, every child finishes, its lane is committed and merged where it
merges) and only then does the loop halt"** (:22-24) — needs-input is not special-cased out of this;
under `refine_first` one lane's question stops the whole wave today. Separately, `settleDriven`
explicitly skips the terminal run-record write for `needs-input` (`if (outcome.outcome ===
"needs-input") return driven;`, `cycle.mjs:553`) — the local `run-store.mjs` record is left `state:
"running"` indefinitely; nothing there ever says `needs-input`. **Constraint:** "a waiting lane does
not halt the loop" (story 03) requires wave.mjs to special-case `needs-input` out of the drain rule —
a materially different code path from every other halt, not a flag on the existing one.

## R3 — The terminal-input path is mesh-worker-scoped; a lane's PTY has no channel into it today

`src/mesh/terminal-input.mjs` validates shape only (non-empty `nodeId`, `sessionId`, `bytes`/frame) and
routes every frame **down the target node's admitted mesh stream connection** via `dispatchDirective`
(:116-260) — the seam session-spawn and terminal-resume also use, targeting a *worker daemon's* PTY
registry, populated only for mesh-dispatched assignments. A loop lane's drive is a **separate local OS
process** the loop family spawns itself (`spawnLaneDrive` → `runBounded`, `src/loop/child-drive.mjs:1-
16,118-132`), never through the mesh assignment path — it is never in a worker's targeting map, so
`terminal-input` cannot reach it. Its only external channel is `stdin: "pipe"`, used for exactly one
thing — an abort **ends** the child's stdin as a cooperative-cancel signal (`src/work-audit/spawn.mjs:
37-38,68,297-308`, "'pipe' is the cancel channel"); **no code today writes bytes into that stdin.**
**Constraint:** `aof work answer` cannot reuse terminal-input for a *local* lane's session as-is — it
needs a new write channel into the lane child, or never writes into the live PTY at all and relies on
R1's kill + fresh `--resume` with the answer as the resumed session's first input. A mesh-dispatched
session already has a transport (nodeId+sessionId); the two topologies need different transports
behind one verb.

## R4 — 130's durable-request pattern: a 10-key file at `<meshRoot>/loop-stops/<loopRunId>.json`

`src/loop/stop-request.mjs`: one file per loop run, `writeText` (temp+rename, no lock — concurrent
writers are last-rename-wins, never torn), a frozen 10-key record (`loopRunId, scope, workspaceId,
level, state, requestedAt, escalatedAt, honouredAt, cancelled, by`, :42-45), a 2-level ladder (`drain`=
1, `cancel`=2, :29), lifecycle `requested → honoured → cleared` (:33), read by the shell's
`createStopSource` on a 2 s poll (`DEFAULT_POLL_MS`, :39, :244-256) composed with the process's own
SIGINT/SIGTERM. `requestLoopStop` creates-or-escalates (:126-144); `markStopHonoured` is the shell's,
at the halt it produces (:152-160); `clearStopRequest` is `--resume`'s (:166-176). **This is the exact
shape to imitate**: a file under `<meshRoot>/…`, never inside a checkout, polled by the running
process, never signalled.

## R5 — No existing reader returns "the question text"; the nearest is private and discards it

`readTranscriptTerminalOutcome` (`src/agent-session-driver.mjs:358-438`, **not exported**) already
scans a transcript from the end for the last assistant record, computes the full text `body` of a
finished turn (:421-429), and uses it only to test for the two sentinel literals — the body itself is
never returned. `src/work/observe.mjs`'s `humanTurnText` (:425-443) reads the opposite party: real
*human* turns only ("Tool results, system reminders and task notifications are plumbing wearing a
`user` type"). **Constraint:** the "one reader" story 01 needs does not exist yet; it is this
function's body-computation extended to return the text (minus the sentinel line) rather than discard
it — reused, never re-implemented, per the file's own `claudeProjectsDir` reuse discipline.

## R6 — `needs-input` is a real persisted state only on the *mesh* assignment record

`global_assignments.code = 'needs-input'` is a real SQLite column value with its own CAS transitions
(`reserveParkedAssignmentResume` / `restoreParkedAssignmentResume`, `src/assignment-record.mjs:205-
222`) — but that table is the **worker/mesh** path (`src/mesh/park-resume.mjs`'s `report("running", {
…, code: "needs-input" })`, :89,136). The **local** loop's `run-store.mjs` record has no such field at
all (R2) — `needs-input` is a halt `act`, not a run state, there. F-58's heartbeat suspension
(`src/loop-bounds.mjs:6-16`, `PROVIDER_WAIT_RE`) is not a persisted field either: it is an inline
timestamp comparison inside the heartbeat-deadline closure — "while the last provider-wait line is
newer than every heartbeat, re-ask a window later and kill nothing" (`agent-session-driver.mjs:1362-
1368`). **Constraint:** the same two shapes — a local in-process suspension check, and (only for
mesh-driven runs) a real persisted code — will need parallel treatment for `needs-input`'s heartbeat
suspension; there is no single existing home that already covers both topologies.

## R7 — The board's amber card and its "Answer" button are mesh-assignment-only; a local lane is invisible to it

`item.execution` (the field `DetailPanel.tsx:240` and `action.mjs:30-49` both key on) comes from
`src/board-mesh-execution.mjs`, a **read-only overlay over `global_assignments` rows only** (:1-24,
43-50 — "an ACTIVE assignment row for it … in `global_assignments`"). `action.mjs`'s "Answer on
`<nodeId>`" (:38-49) fires only when `item.execution.sessionId && item.execution.nodeId` are present,
opening the terminal-mirror dock over the same mesh path R3 measured. A loop lane driven locally
(129's dispatch worktrees) never writes a `global_assignments` row, so `item.execution` is `null` for
it — **today the board shows nothing for a local lane's needs-input**; the SPEC's measured table row
(fleet mirror + amber card) was a mesh-dispatched run. **Constraint:** story 05 needs a *new* read path
for local-loop needs-input state, alongside whatever already works for worker-dispatched assignments.

## R8 — FF-7101 governs `work.loop.*` numeric bounds only; the env-secret precedent is `AOF_MESH_CLONE_TOKEN`

`FF-7101` (`test/arch/command/acd-prompt-bounds-name-their-home.test.mjs`) asserts that every
`work.loop.*` key a **bundled prompt** states in numeral form resolves through `src/loop-bounds.mjs`'s
resolver and matches its answer — a drift-detector for stated bounds, not a general config-key
registry, and not applicable to a channel/webhook key by its own scope. The concrete precedent for
"read from config or env, never committed" is `defaultMintCloneCredential`
(`src/control-stream-server.mjs:532-556`): reads `process.env.AOF_MESH_CLONE_TOKEN` directly at the
point of use, with the ADR-009 rationale spelled inline — "never a COMMITTED config key … a real
credential must NEVER be committed alongside" the fleet-shared config. **Constraint:** a Discord
webhook URL belongs beside that pattern (env var read at point of use), not inside `.aof/aof.config.
json`'s committed tree; `work.notify` itself (channel registry, event shape) is a new config surface
with no existing FF gating it.

## R9 — Discord webhook execute: shape, caps, codes, rate limit (vendor)

`POST /webhooks/{webhook.id}/{webhook.token}` — the token rides the URL path itself, so **the webhook
URL is the secret** (no separate auth header). Body: `content` (≤2,000 chars), `embeds` (≤10, ≤6,000
combined chars; one embed's `description` caps at 4,096), `username`, `allowed_mentions`. Default
response `204 No Content`; `?wait=true` returns `200 OK` with the message body. Exceeding a cap is
`400`, error `50035` naming the field. Rate limit is per-webhook, 5 requests / 2 s; a `429` carries
`retry_after` (body) and a `Retry-After` header. Sources:
[Discord developer docs — Webhook resource](https://docs.discord.com/developers/resources/webhook),
[Discord API Limits 2026 (Conferbot)](https://www.conferbot.com/limits/discord),
[Discord Webhook Guide](https://discord-webhook.com/en/discord-webhook-guide/).
**Constraint:** the envelope's `question` paragraph must fit the 2,000-char `content` cap (SPEC already
says this); a renderer needing more room reaches for one embed before a second request, and every send
must be 429-aware — best-effort per SPEC, degrading by name, never retrying into a blocking loop.

## R10 — One function prints every account/halt line; `phase` and elapsed are already in hand at each needs-input site

`renderLoopState` (`src/commands/loop.mjs:1730-1744`) is the sole producer of both forms: the halt line
(`"${scope} — halted on ${stop} at ${ref} (producer ${producer}). Resume with: …"`, :1739) and the
per-tick driving line (`"${scope} — ${level}, cap ${cap}: ${act}${phase}${target}."`, :1743), called
from `reportLine` (:810-821) after narrating each driven row. All three `needs-input` mint sites
(`wave.mjs:552-553`, `cycle.mjs:701-702`, `cycle.mjs:981-982`) sit inside functions that already carry
`phase` (the `drivePhase`/lane-drive parameter, e.g. `phase: "continue"`) and `phaseRun.record` — the
same record `attemptElapsedMs` (`src/work/loop.mjs:916`, reused by `run-status.mjs:62`, `wave.mjs:473`,
`cycle.mjs:667`) already turns into an elapsed duration for other halts. **Constraint:** the notifier's
`phase`/`elapsedMs` fields and the SPEC's `"127/02 — waiting on you (<phase>, <elapsed>): <question>"`
account row are both computable at the existing halt sites with existing pure helpers — no new plumbing
to carry duration or phase down to where the halt is minted.
