---
type: story
number: 04
slug: the-answer-reaches-the-session
title: "The answer reaches the session — aof work answer writes the ask file for a local lane or a primary drive, carries the answer through mesh:terminal-resume for a worker, records who and when, and the board's POST /api/work/answer is the same verb behind a loopback-guarded admission"
parent: 131
depends: [1, 2]
status: in-progress
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-001, ADR-003, ADR-006]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/archive/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-007
  - wiki/work/archive/38_milestone_cross-machine-worker-execution/ARCHITECTURE.md#ADR-012
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-005
  - src/loop/ask-request.mjs
  - src/notify/notify.mjs
  - src/run-store.mjs
  - src/commands/resolve.mjs
  - src/board-mesh-execution.mjs
  - src/commands/feedback.mjs
  - src/command-error.mjs
  - src/effects/assignment-transitions.mjs
  - src/setup-ui.mjs
  - src/workspace-identity.mjs
  - src/agent-session-driver.mjs
  - src/commands/loop.mjs
  - src/spine/face.mjs
  - test/support/source-slice.mjs
  - test/support/cache-read-fixture.mjs
  - wiki/work/131_milestone_the-human-in-the-loop/stories/01_story_the-question-is-read-and-recorded/tasks/02_the-ask-file-lives-in-the-aof-home.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/01_story_the-question-is-read-and-recorded/tasks/05_a-waiting-run-is-not-reclaimed-or-charged.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/01_story_the-question-is-read-and-recorded/tasks/03_the-answer-is-sanitised-once.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/01_story_the-question-is-read-and-recorded/tasks/04_the-run-record-carries-asks.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/02_story_the-notifier-and-its-channels/tasks/03_one-envelope-built-in-one-place.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/02_story_the-notifier-and-its-channels/tasks/05_delivery-is-bounded-and-never-throws.feature
files:
  - src/commands/resume.mjs
  - src/command-core.mjs
  - src/commands/mesh/terminal-resume.mjs
  - src/mesh/terminal-relay-bridge.mjs
  - src/mesh/terminal-input.mjs
  - src/mesh/worker-execution.mjs
  - src/mesh/park-resume.mjs
  - src/board-ui.mjs
  - src/static-serve.mjs
  - src/mesh/ui-serve.mjs
  - test/run/run-session-limit-resume.test.mjs
  - test/command/command-core-contract.test.mjs
  - test/mesh/terminal/mesh-terminal-input-path.test.mjs
  - test/mesh/terminal/mesh-terminal-relay-bridge.test.mjs
  - test/assignment/blocked-run-parking.test.mjs
  - test/ui/board-api.test.mjs
  - test/ui/board-resync-door.test.mjs
  - test/ui/board-face-contract.test.mjs
  - test/ui/work-ui-board-serves-unchanged.test.mjs
  - test/mesh/ui/mesh-ui-serve.test.mjs
  - test/arch/work/acd-work-command-route-coverage.test.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
  - test/arch/ui/acd-board-write-isolation.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 04 · The answer reaches the session

## User story

As **the operator answering a waiting session**,
I want **one verb, `aof work answer <ref> "<text>"`, that answers the waiting ask on that item — through the ask file for a local lane or primary drive, and through `mesh:terminal-resume` with the answer in its envelope for a mesh worker — recording the answer verbatim, who gave it and when, notifying `session-answered`, and reachable from the board as `POST /api/work/answer` behind the shared write admission with a loopback-`Host` check**,
so that **an answer from a terminal and an answer from the board are the same act with the same record, and a local page cannot be driven by a rebinding attacker**.

What lands (ADR-003 §5-§7, ADR-006 §3): `work:answer` in `src/commands/resume.mjs`, registered in `command-core`; the sweep's `waiting-on-you` row; the mesh leg (`answer` on `mesh:terminal-resume` and its envelope, typed by the worker, recorded by `park-resume.mjs`); `session-answered` firing; `POST /api/work/answer` in `board-ui.mjs` with `admitWriteRequest` hoisted and `isLoopbackHost` (in `static-serve.mjs`) applied on both the board and the fleet; `53/FF-5307`'s `board-ui.mjs` digest re-pinned. The route lands here, not in 05, because `acd-work-command-route-coverage` holds `/api/work/*` and `work:*` in bijection.

## Tasks

- [ ] `00_one-verb-answers-the-waiting-ask` — `work:answer` in `resume.mjs`, the ladder, the eight-key document, `by`, `session-answered`, the CLI face
- [ ] `01_the-board-answers-through-the-same-verb` — `POST /api/work/answer`, `admitWriteRequest` hoisted over every board write (feedback included), the body lift, FF-5307 re-pinned
- [ ] `02_one-loopback-predicate-guards-both-faces` — `isLoopbackHost` in `static-serve.mjs`, `non-loopback-host` on the board's and the fleet's write routes
- [ ] `03_a-workers-ask-takes-the-answer-through-terminal-resume` — the mesh leg: the overlay lookup, `answer: { text, by, askedAt }` on terminal-resume, envelope, router, worker, `park-resume` record
- [ ] `04_the-sweep-names-a-run-waiting-on-an-answer` — `work:resume`'s `waiting-on-you` row and render

## Notes

- A mesh-worker ask is answered here but its QUESTION is not carried to the control (the frozen assignment wire) — the board shows it as unreadable and no Discord ask fires for it; recorded in STATE as a follow-up item, not debt.
- The answer text is refused blank, over-long, or with control characters (an ESC sequence would break the driver's bracketed paste).
