# 01 · Attribution at spawn — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The run record carries the session it ran as
`sessionId` is populated on the run record at the moment the driver captures it, at both of the
driver's production callers — `src/commands/drive.mjs` and `src/mesh-worker-execution.mjs`. The key
the record has modelled since milestone 19 now holds a value rather than `null` on every row.

### A session id is recorded or absent, never invented
A run whose session never reports an id reads `sessionId: null`; no id is derived, copied from a
sibling, or synthesised from a path.

### The id is written once, and re-presenting it is a no-op
`recordSessionId` with a byte-identical id rewrites nothing — `updatedAt`, `state`, `attempt` and
the retry lineage are untouched — so the mid-run write and the pre-settle write can both run
without churning the record.

### The attribution write cannot outlive the settle it races
The drive caller awaits the persist inside `onSessionIdCaptured`, which the driver awaits inside the
watch chain that `finish` awaits before settling. A captured id is therefore on the record before
`completeRun` runs, and no in-flight whole-record write can land afterwards and restore a pre-settle
snapshot. The mesh-worker caller reaches the same guarantee by `allSettled`-ing the persist against
the up-channel update.

### Neither the attribution write nor the assignment update is conditional on the other
A failing assignment update still leaves the id on the record and still lets the run settle; a
failing persist is reported rather than swallowed and does not stop the settle.

### `work:drive-<phase>` mints and settles a run record, through the transition seam
The bare phase-driver commands, which previously minted none, now mint a run, persist the captured
session id, and settle `done`/`failed` — `needs-input` settles `failed` with reason `needs-input`,
because a one-shot local drive cannot service a parked session. The mint and the settle go through
`transitionRunStart` / `transitionRunComplete` (`src/effects/run-transitions.mjs`), never the bare
store, so each raises its `run.started` / `run.completed` event and inherits the declared cascade —
the same doors the sibling caller `src/mesh-worker-execution.mjs` has used since milestone 42.

### The settle seam can price a run without publishing it
`transitionRunComplete` takes `projectsDir` as an opt of its own, defaulting to
`workspace.projectRoot`. A caller that needs its run's spend stamped from the transcript tree no
longer has to pass `workspace`, which would also set the event's `workspaceRoot` and turn the
completion into a global work-snapshot publish. The drive command is priced and does not publish;
every pre-existing caller is unchanged.

### The attribution build and the race-free session-id persist each have one home
`buildRunAttribution` (`src/otel-attribution.mjs`) derives the milestone/story attribution object,
and `captureSessionIdOnRecord` (`src/run-session-capture.mjs`) is the persist-without-racing-the-settle
shape. Both production callers — the drive command and the assignment sink — call them rather than
carrying hand-copies, so the F-04 guarantee cannot be present in one caller and absent in the other.

### Every spawned session is labelled with the work it belongs to
`OTEL_RESOURCE_ATTRIBUTES` is set at spawn carrying `run.id`, `story.id`, `milestone.id`, `phase`,
`machine.id` and `worktree.id`, alongside `CLAUDE_CODE_ENABLE_TELEMETRY`; a run with no declared
phase carries no `phase` attribute rather than a fabricated one. The attributes are applied after
the existing IDE-attachment scrub, so the scrub still removes exactly what it removed before and
removes none of these.

### aof ships no OTLP receiver
No module under `src/**` opens a listening socket for, parses, or serves an OTLP payload. The OTel
surface is env-set-at-spawn only, and every figure this milestone produces is correct with no
collector running anywhere (FF-6808).

## Assumptions

- **A collector is the project's to run, not aof's** — the resource attributes are useful only to a
  project that operates its own OTLP collector; nothing in aof reads them back.
- **The driver awaits `onSessionIdCaptured` inside the chain `finish` awaits** — the race-freedom of
  the drive caller's persist rests on that ordering in `src/agent-session-driver.mjs`, not on any
  timing of its own.
- **`sessionId` on a retry keeps its delivered m26 semantics** — carried forward unless overridden;
  this story writes the key, it does not change how a retry inherits it.

## Gaps

### A reliable regression guard for the settle/attribution race
- **Status:** open
- **Discharge condition:** the five `tasks/02` scenarios arrange the race they name — the persist
  held until `completeRun` is entered — instead of relying on ambient scheduler timing.
The delivered behaviour is race-free and was proven so against the pre-fix shape, but the scenarios
guarding it were observed fully green on that same defective shape in one of four runs (F-05).

### The stated reason for the pre-settle persist
- **Status:** open
- **Discharge condition:** the comment at `src/commands/drive.mjs:126-128` is rewritten to state
  that the driver awaits the handler.
The second, idempotent `recordSessionId` before `completeRun` is correct and retained; the comment
above it still describes the handler as fire-and-forget, which the fix made false (F-06).

### Consumption of the attribution key
- **Status:** discharged
- **Discharge condition:** story 68/03 replaces `agentMatchesMilestone`'s free-text match with the
  `sessionId` join.
Discharged 2026-08-22 by story 68/03, accepted: `agentMatchesMilestone` is retired with no surviving
caller and `src/work-observe.mjs` resolves an agent run's item through its session's run record
(FF-6805, FF-6806). The key this story writes is now read.
