---
type: story
number: 02
slug: an-idle-view-costs-almost-nothing
title: "An idle view costs almost nothing — the polled routes answer 304 when nothing changed, and every UI poll pauses while its window is hidden and backs off while its answers stay the same"
parent: 167
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-004, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-001, apps/ui/src/board/api.ts, apps/ui/src/fleet/api.ts, packages/server/src/board-ui.mjs, packages/mesh/src/ui-serve.mjs, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/02_story_an-idle-view-costs-almost-nothing/EXAMPLES.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/02_story_an-idle-view-costs-almost-nothing/PLAN.md, apps/ui/src/fleet/assign-affordance.mjs, apps/ui/src/board/resync.mjs, apps/ui/src/home/SessionLauncher.tsx, test/support/board-face-fixture.mjs, test/arch/ui/index.mjs]
files: [packages/server/src/board-ui.mjs, packages/mesh/src/ui-serve.mjs, apps/ui/src/lib/poll-cadence.mjs, apps/ui/src/board/Board.tsx, apps/ui/src/board/DetailPanel.tsx, apps/ui/src/board/api.ts, apps/ui/src/fleet/Fleet.tsx, apps/ui/src/fleet/api.ts, apps/ui/src/home/Home.tsx, apps/ui/test/poll-cadence.suite.mjs, apps/ui/test/index.mjs, test/surfaces/board-api.test.mjs, test/mesh/ui/mesh-ui-serve.test.mjs, test/arch/ui/acd-ui-polls-through-one-cadence.test.mjs, test/arch/ui/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 02 · An idle view costs almost nothing

## User story

As **the operator, who leaves the fleet and a board open in the desktop app all day**,
I want **a view to stop asking while I cannot see it, ask less often while nothing is changing,
and be told "nothing changed" cheaply when it does ask**,
so that **an open view I am not watching costs the daemon almost nothing, while a view I am
watching still shows a change promptly. Today every open view polls every 5 s forever, and each
poll rebuilds and resends the whole answer.**

## Tasks

- [x] [00 · The polled routes answer 304 when nothing changed](tasks/00_the-polled-routes-answer-304.feature)
- [x] [01 · Every UI poll pauses while hidden and backs off while unchanged](tasks/01_every-poll-pauses-and-backs-off.feature)

## Notes

- **Conditional GET** (ADR-004): `/api/work/list` and `/api/mesh/status` send an `ETag`, the hash
  of the body, and answer `304` to a matching `If-None-Match`. The UI's `api.ts` modules send it
  back.
- **One helper**, `apps/ui/src/lib/poll-cadence.mjs`, decides the next delay: nothing while
  hidden, at once on becoming visible, doubling while unchanged up to 15 s (Q1, answered
  2026-10-20), and back to the
  base on a change, a user action or a pending assign. FF-16703 holds every poller in
  `apps/ui/src` to it, with the clock ticks and the session launcher's outcome wait exempt.
- **The fleet's assign timing** (`ASSIGN_SENT_HOLD_MS`, `ASSIGN_TIMEOUT_MS`, both in `POLL_MS`)
  keeps its meaning, because a pending assign pins the base cadence.
- `apps/ui/test` rises 35 → 36 for `poll-cadence.suite.mjs`, and `test/arch/ui` 36 → 37 for
  FF-16703. Story 05 shares that budget file, so it follows this story.

## Accept decision

2026-10-22 — **ACCEPTED** by `aof:verify 167`. The cadence suite and FF-16703 pass (11 cases),
and the route cases pass in the mesh-ui and board-api suites, with an isolated home and no failures.
FF-16703 is green with a recorded red probe. `aof work validate 167/02` passes, and doctor reports
no `control-unresolved`. No `@manual` or `@uat` scope. F-07 (no mounted cadence case) is a
non-blocking OUTCOME gap. Evidence is in the parent `VERIFICATION.md`.
