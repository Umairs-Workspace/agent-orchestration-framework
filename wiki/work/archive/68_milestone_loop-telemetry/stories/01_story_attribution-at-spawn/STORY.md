---
type: story
number: 01
slug: attribution-at-spawn
title: "Attribution at spawn — the session id the record has always modelled, finally written"
parent: 68
status: done
owner: product-owner
created: 2026-08-20
updated: 2026-08-22
depends: [68/00]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · Attribution at spawn — the session id the record has always modelled, finally written

## User story

As an operator asking which work item an agent session belonged to,
I want the session's id persisted onto the run record at the moment it is captured,
so that attribution is a join on a stored key rather than a regex over free text that can put one
agent's spend in two milestones' reports.

## Why

**The join key already exists, and has never been written.** The run record has modelled
`sessionId` since milestone 19 (`src/run-store.mjs:344-362`). The driver already captures it
mid-run — `onSessionIdCaptured` (`src/agent-session-driver.mjs:675`), wired at
`src/mesh-worker-execution.mjs:1665` — and forwards it to the **assignment**, never to the run
record. Every run record on disk shows the consequence: `"sessionId": null`, on all of them.

So aof attributes agent runs by matching text (`agentMatchesMilestone`,
`src/work-observe.mjs:661-667`), which is why 18 of 143 rows are double-counted. The fix is not a
better regex. It is writing down the identifier the system already knows.

**Why this story owns the persist, and not the driver.** `aof graph impact` reports that
`src/commands/drive.mjs` and `src/mesh-worker-execution.mjs` are the driver's only production
dependents — and they are the only modules importing **both** the driver and `run-store`. The
driver emits the id; its callers persist it. That keeps the existing seam intact rather than
teaching a spawn module about a store it does not import.

**The OTel half is an export courtesy, and a deliberate boundary.** Setting
`OTEL_RESOURCE_ATTRIBUTES` at spawn costs an env assignment and makes any project that runs its own
collector correctly attributed for free. aof builds **no receiver** — a hosted observability stack
is explicitly out of the milestone's scope, and a receiver would put a daemon dependency between
aof and its own numbers (ADR-005 §2). Every figure this milestone produces must be correct with no
collector running anywhere.

## Tasks

- [x] `tasks/00_session-id-persisted.feature` — the session id captured mid-run lands on the run record, once, without disturbing the assignment path that already receives it
- [x] `tasks/01_otel-attributes-at-spawn.feature` — the spawn env carries the resource attributes, survives the existing IDE scrub, and aof stands up nothing to receive them
- [x] `tasks/02_settle-not-clobbered-by-attribution-write.feature` — **@bug @finding-F-04** (added at `aof:verify 68`, 2026-08-21): the unawaited attribution write must not rewrite a settled record backwards to `running`. **Fixed + green 2026-08-21 (re-`aof:continue 68`)**: the drive caller now awaits the persist inside `onSessionIdCaptured` (the driver awaits that handler, so the id lands before the settle), mirroring the sibling caller (`src/mesh-worker-execution.mjs:1681-1696`). All five F-04 scenarios green.

## Notes

- **Fitness function declared for this story:** FF-6808 (`ARCHITECTURE.md` § Fitness functions) —
  aof ships no OTLP receiver. `pending` until the file lands here; owes a red probe in
  `VERIFICATION.md` once it does.
- **The spawn env is already scrubbed** of the IDE-attachment vector (`VSCODE_*`,
  `CLAUDE_CODE_SSE_PORT`, `TERM_PROGRAM`) at `src/agent-session-driver.mjs:641-647`, after a
  measured live failure. This story's addition must survive that scrub rather than be deleted by
  it — the task feature pins it.
- **Milestone 70 edits the same seam** for `--model`, `--effort` and the prompt-cache flags. This
  story's change is shaped to be additive to those rather than in their way (ADR-008).
- **`sessionId` on a retry** already has delivered semantics — it is carried forward unless
  overridden (`src/run-store.mjs:588-593`, 26/ADR-006.4). Nothing here changes that.
