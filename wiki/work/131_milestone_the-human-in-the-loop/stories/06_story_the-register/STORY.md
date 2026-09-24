---
type: story
number: 06
slug: the-register
title: "The register — FF-13101 to FF-13109 landed in three files under test/arch/loop/, the row 62 → 65, and each control's red probe recorded in VERIFICATION"
parent: 131
depends: [3, 4, 5]
status: not-started
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-004
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-006
  - test/arch/loop/acd-loop-stop-request-single-home.test.mjs
  - test/support/source-slice.mjs
  - src/loop/ask-request.mjs
  - src/loop/ask.mjs
  - src/work/observe.mjs
  - src/run-store.mjs
  - src/commands/resume.mjs
  - src/notify/notify.mjs
  - src/notify/discord.mjs
  - src/notify/form.mjs
  - src/board-ui.mjs
  - ui/src/board/AskCard.tsx
  - ui/src/board/action.mjs
files:
  - test/arch/loop/acd-loop-ask-single-home.test.mjs
  - test/arch/loop/acd-loop-ask-waits-in-place.test.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
  - test/arch/loop/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
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

<!-- Authored at the story's own refine (Three Amigos): tasks/NN_<slug>.feature. -->

## Notes

- Every control is `pending — 131/06` in ARCHITECTURE until this story lands it; the milestone does not accept with an unresolved control.
