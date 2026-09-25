---
type: story
number: 06
slug: the-register
title: "The register — FF-13101 to FF-13109 landed in three files under test/arch/loop/, the row 62 → 65, and each control's red probe recorded in VERIFICATION"
parent: 131
depends: [3, 4, 5]
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-25
adrs: [ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-004
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/131_milestone_the-human-in-the-loop/DESIGN.md
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-010
  - src/loop/ask-request.mjs
  - src/loop/ask.mjs
  - src/loop/cycle.mjs
  - src/loop/wave.mjs
  - src/commands/loop.mjs
  - src/commands/drive.mjs
  - src/commands/list.mjs
  - src/commands/resume.mjs
  - src/commands/item-status.mjs
  - src/work/observe.mjs
  - src/work/loop.mjs
  - src/loop-bounds.mjs
  - src/agent-session-driver.mjs
  - src/run-store.mjs
  - src/effects/run-transitions.mjs
  - src/mesh/terminal-input.mjs
  - src/terminal-ws.mjs
  - src/mesh/park-resume.mjs
  - src/mesh/ui-serve.mjs
  - src/static-serve.mjs
  - src/board-ui.mjs
  - src/notify/notify.mjs
  - src/notify/discord.mjs
  - src/notify/form.mjs
  - schemas/aof.schema.json
  - .aof/aof.config.json
  - ui/src/board/AskCard.tsx
  - ui/src/board/action.mjs
  - ui/src/board/api.ts
  - test/support/module-family.mjs
  - test/support/read-src-files.mjs
  - test/support/source-slice.mjs
  - test/support/loop/lane-fixture.mjs
  - test/arch/loop/index.mjs
  - test/arch/loop/acd-loop-stop-request-single-home.test.mjs
  - test/arch/loop/acd-loop-suite-registration.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/run/run-heartbeat-reclaim.test.mjs
  - test/notify/notify-channels.test.mjs
  - test/notify/notify-discord.test.mjs
  - test/ui/board-api.test.mjs
  - test/session/agent-session-driver-transcript.test.mjs
files:
  - test/arch/loop/acd-loop-ask-single-home.test.mjs
  - test/arch/loop/acd-loop-ask-waits-in-place.test.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
  - test/arch/loop/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md
  - wiki/work/131_milestone_the-human-in-the-loop/VERIFICATION.md
schema: 1
aofVersion: 0.1.0
---
# 06 · The register

## User story

As **the maintainer who inherits the human-in-the-loop seams**,
I want **the nine declared fitness functions (FF-13101 … FF-13109) landed as arch-tests in three files under `test/arch/loop/`, registered in `test/arch/loop/index.mjs`, the directory budget row raised 62 → 65 by exactly that count, and each control's red probe recorded in the milestone's `VERIFICATION.md`**,
so that **the ask's one home, the one question reader, the waiting-lane rule, the notifier's best-effort and secret rules, the one formatter and the guarded answer route cannot silently regress**.

What lands (all ADRs): `test/arch/loop/acd-loop-ask-single-home.test.mjs` (FF-13101-13103), `acd-loop-ask-waits-in-place.test.mjs` (FF-13104-13105), `acd-loop-ask-reaches-every-face.test.mjs` (FF-13106-13109), in the `archTests` harness shape (119/ADR-010); the red probes in `VERIFICATION.md`'s register.

## Tasks

- [x] `tasks/00_the-nine-controls-land.feature` — each control's structural, fixture and non-vacuity legs green over the delivered tree, registered by import + spread, the `test/arch/loop` row +3
- [x] `tasks/01_each-control-goes-red-on-contact.feature` — per control, the named mutation reds exactly that control; the probe recorded in `VERIFICATION.md`, the `pending` markers dropped from `ARCHITECTURE.md`

## Notes

- Every control stays `pending — 131/06` in ARCHITECTURE until this story lands it. The milestone
  does not accept with a control that does not resolve.
- The read set names every subject the controls sweep or drive, not just the modules the ADRs
  discuss (130/05 retro R1). Budget moves and site counts are stated as deltas (R2).
- Four register clauses do not hold word-for-word against the delivered tree. Each is ruled on in
  task 00 when the contract was authored (rulings 2, 3, 4 and 9). One real red is measured at
  refine: `src/loop/cycle.mjs:1079` mints `session-needs-input` outside `parkedHalt`. It belongs
  to 131/03, which is in review, and should be fixed there before this story builds.
- 119/ADR-010's harness shape: `archTests` exported, never `readdir`-discovered. FF-11901:
  resolved specifiers go through `test/support/module-family.mjs` only.

## Accept decision

**Accepted 2026-09-25 (`aof:verify 131`).**
- **Evidence.** All nine controls are green, 34 cases (FF-13106 gained a fifth leg at 08). Every control's red probe is recorded in the register (VERIFICATION `## Fitness functions`). ARCHITECTURE carries no `pending — 131/06` marker.
- **Gates.** `aof work validate 131` returned PASS. `aof work doctor 131` reported no `control-unresolved` at either severity and no missing red probe.
- **Findings.** None is open against 06.
