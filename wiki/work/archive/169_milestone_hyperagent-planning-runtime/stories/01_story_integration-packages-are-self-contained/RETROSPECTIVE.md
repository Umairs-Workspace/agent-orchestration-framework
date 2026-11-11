---
doc: retrospective
promotionFrom: 1
---
# 169/01 · Integration packages are self-contained — Retrospective

## R1 · The declared write set was about thirty paths short

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** reviewer · **Promoted to:** none

- **What happened:** FF-7106 demanded paths the story's `files:` did not declare: the manifest, every
  tracked render (the hyperplan command for `.claude`, `.opencode` and `.agents`, the eight
  `.hyperagent/` files, the Codex workflow contract) and the controls whose census assumed one bundle root.
- **Why:** refine listed the source files the move touches, not the files a re-render and the
  controls then rewrite.
- **Lesson:** when a story moves or adds bundle members, take `files:` from a dry render of this
  repository plus a grep of the controls that list members. Don't derive it from the source move.
- **Refs:** milestone STATE `## Feedback (for retro)`; FF-7106.

## R2 · A fitness function was declared into a frozen test directory

**Kind:** near-miss · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Recurs:** 125/R1 · **Promoted to:** none

- **What happened:** FF-16901 was declared into `test/arch/bundle`, which FF-12405 leg 10 holds at a
  ceiling that may never rise. The control landed in `test/arch/command` instead (27 → 28, reason in
  the budget row).
- **Why:** the control's path was chosen by its subject alone, and nobody checked the directory
  budget's frozen rows.
- **Lesson:** before naming a new test path at refine, read its directory's row in
  `acd-source-directory-budget`. A frozen row means the path is wrong, so don't raise it.
- **Refs:** 169/ARCHITECTURE FF-16901; `test/arch/testing/acd-source-directory-budget.test.mjs`.

## R3 · An ADR stated a fact about the current tree that was never measured

**Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

- **What happened:** ADR-003 said Notion's one core import is in `command-core.mjs`. Measured, ten
  core modules import `@aof/integration-notion`, so FF-16901's exception had to be the package, and
  the Notion chore's scope is ten modules, not one.
- **Why:** the claim was recalled from the file the ADR was about, not grepped across `packages/core/src`.
- **Lesson:** any ADR sentence that counts or locates something in today's tree is measured with a
  grep at refine, and the ADR states the measured count.
- **Refs:** 169/VERIFICATION F-01; ADR-003 (amended 2026-10-23).

## R4 · Four controls assumed every bundle member lives in core's asset tree

**Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** reviewer · **Promoted to:** none

- **What happened:** bundle membership, FF-7106's sources, the learning-edge command census and the
  `.md`-asset stamp rule each resolved members against core's asset root, so all four broke when an
  integration's root was added. Each now resolves a member through its own asset class.
- **Why:** with one root, "core's tree" and "the member's tree" were the same path, and the controls
  hard-coded the first.
- **Lesson:** when a seam gains a second instance (a second asset root, store or runtime), grep the
  controls for the first instance's path at refine and list them in `files:`. They are part of the
  change, not fallout found at review.
- **Refs:** milestone STATE `## Feedback (for retro)`; ADR-004.
