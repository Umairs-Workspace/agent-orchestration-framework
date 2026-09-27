---
type: story
number: 12
slug: a-workers-ask-reaches-discord
title: "A worker's ask reaches Discord — a question asked on a mesh worker is carried to the control node, posted by the bot, and answerable by reply"
parent: 131
depends: [4, 9, 10]
status: done
owner: product-owner
created: 2026-09-25
updated: 2026-09-25
schema: 1
aofVersion: 0.1.0
adrs: [ADR-002, ADR-008, ADR-010]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/DESIGN.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-008
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-010
  - wiki/work/archive/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-007
  - src/work/observe.mjs
  - src/notify/ask-messages.mjs
  - src/notify/discord.mjs
  - src/mesh/presence.mjs
  - src/commands/mesh/terminal-resume.mjs
  - src/effects/journal.mjs
  - src/effects/outbox.mjs
  - src/discord/replies.mjs
  - test/discord/discord-fixture.mjs
files:
  - src/mesh/park-resume.mjs
  - src/mesh/worker-execution.mjs
  - src/effects/assignment-transitions.mjs
  - src/effects/table.mjs
  - src/assignment-record.mjs
  - src/global-work-store.mjs
  - src/board-mesh-execution.mjs
  - src/commands/list.mjs
  - src/commands/resume.mjs
  - src/notify/notify.mjs
  - test/assignment/blocked-run-parking.test.mjs
  - test/mesh/mesh-effects-outbox.test.mjs
  - test/store/global-work-store.test.mjs
  - test/mesh/assignment/mesh-assignment-record.test.mjs
  - test/ui/board-mesh-execution.test.mjs
  - test/notify/notify-channels.test.mjs
  - test/run/run-session-limit-resume.test.mjs
  - test/discord/discord-replies.test.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
  - wiki/work/131_milestone_the-human-in-the-loop/VERIFICATION.md
---
# 12 · A worker's ask reaches Discord

## User story

As **the operator whose loops also run on mesh workers (the WSL node, the Mac)**,
I want **a question asked by a session on a worker to be carried to the control node with its
text, posted by the one bot like a local ask, shown on the board with its question, and answerable
by a Discord reply the same way**,
so that **where a lane happens to run never decides whether I hear about its question**.

## Tasks

- [x] `tasks/00_the-worker-reads-its-question-onto-the-park-fact.feature` — `readWorkerAsk` in `park-resume.mjs`; `ask` on the park's `assignment.reported` only; the fallback drops it; `worker-execution.mjs` stays at 1,914
- [x] `tasks/01_the-control-keeps-the-ask-on-the-assignment-row.feature` — the nullable `ask` column by the house's idempotent ALTER; written only when given; projected only while the row awaits an answer
- [x] `tasks/02_the-control-posts-a-workers-ask-once.feature` — `announceWorkerAsk` behind the edge into `needs-input`, with the worker's node; a redelivery posts nothing; no checkout degrades by name
- [x] `tasks/03_the-board-and-a-reply-read-the-workers-question.feature` — the board's worker ask carries the question; a Discord reply answers through `mesh:terminal-resume`; `session-answered` from one site
- [x] `tasks/04_the-register-holds-the-worker-ask-to-the-park-fact.feature` — FF-13114 landed, FF-13107 amended to seven sites, red probes

## Notes

- **Operator decision (2026-09-25):** there is one bot, on the control node, for the whole mesh.
  So a worker's ask must reach the control.
- This discharges the follow-up ratified in STATE ("a mesh-worker ask is answerable but not
  surfaced … carry the worker's ask to the control and notify it"). Today the board shows it as
  "question unreadable" and no notification fires (04, 05).
- **For refine:**
  - The worker → control carriage changes the frozen assignment wire. Refine rules whether it is
    additive on the existing frame or a new frame, and re-pins its controls with a reason.
  - The answer back reuses 04's `mesh:terminal-resume` leg with its `answer` object.
  - The worker's own `node` rides the envelope and the Discord line.

## Refine (2026-09-25, `aof:refine 131/09-12 --solo`)

- **ADR-010** answers the "For refine" items above. The carriage is ADDITIVE on the existing
  durable park fact (`assignment.reported`, running + `needs-input`) as one `ask` key, present only
  on that park. It is not a new frame, and the status frame is not widened. The suites that pin
  the payload and the store version are re-pinned with the reason "131/ADR-010". The answer back is
  04's `mesh:terminal-resume` leg with its `answer`, unchanged. The worker's own `node` rides the
  envelope through `fields.node`.
- **`depends` gains 10** (PO ruling, 2026-09-25). This story's "answerable by a Discord reply" is
  10's path. The operator's `[4, 9]` predates the breakdown.
- **Default decisions:** the question is clipped to 8,000 code points on the worker; the
  journal-unavailable fallback drops the ask; the control posts only on the edge into
  `needs-input`, which departs from ADR-005 §4's no-reactor rule for a stated reason; a loop run
  BY a worker node, rather than an assignment, is out of scope (the worker holds no token).
