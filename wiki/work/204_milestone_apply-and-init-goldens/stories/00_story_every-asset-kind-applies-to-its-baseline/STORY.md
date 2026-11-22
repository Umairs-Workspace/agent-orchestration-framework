---
type: story
number: 00
slug: every-asset-kind-applies-to-its-baseline
title: "Every asset kind applies to its committed baseline — on three runtimes and on each alone, and twice to the same tree"
parent: 204
depends: []
status: done
owner: product-owner
created: 2026-11-21
updated: 2026-11-22
adrs: [ADR-001, ADR-003]
reads:
  - wiki/work/204_milestone_apply-and-init-goldens/stories/00_story_every-asset-kind-applies-to-its-baseline/EXAMPLES.md
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-001
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-003
  - test/support/golden/harness.mjs
  - test/support/golden/normalise.mjs
  - test/support/golden/baseline-store.mjs
  - scripts/golden.mjs
  - test/golden/work-init.lane.mjs
  - test/golden/work-init.test.mjs
  - packages/core/src/application/bindings/commands/assets/apply.mjs
  - packages/core/src/application/bindings/dsl.mjs
  - packages/core/src/render-plan.mjs
  - packages/core/src/adapters.mjs
  - packages/core/src/runtime-config.mjs
  - packages/core/src/lock.mjs
files:
  - test/golden/assets-apply.lane.mjs
  - test/golden/assets-apply.test.mjs
  - test/golden/index.mjs
  - test/support/golden/lanes.mjs
  - test/golden/baselines/assets-apply/
  - test/golden/baselines/work-init/
  - test/golden/baselines/work-update/
  - packages/core/src/codex-settings.mjs
  - packages/core/test/codex-ownership.suite.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 204/00 · Every asset kind applies to its committed baseline

## User story

As **a developer changing how aof renders a project's own assets**,
I want **`aof assets apply` over a project holding every asset kind held to a committed tree**,
on all three runtimes, on each alone, and applied twice,
so that **a change to what apply writes, including the lock and the journal a user commits, shows
as a diff in the PR, and a render that does not survive its own second apply fails before a user
meets it**.

What lands (ADR-001, ADR-003): the fixture `.aof/` as data, the `assets-apply` lane's five
scenarios and their baselines, and the fix to the Codex TOML merge that `every-kind` and
`re-apply` would otherwise hold broken.

## Tasks

- [x] `tasks/00_every-asset-kind-renders-to-its-baseline.feature` (R1, R3): `every-kind` is held whole: every kind's render for each runtime that takes it, the lock and the journal.
- [x] `tasks/01_each-runtime-alone-renders-its-own-share.feature` (R2): `claude`, `codex` and `opencode` are held as deltas that remove the other runtimes' outputs, and what each writes outside its runtime is held (ADR-006 §3).
- [x] `tasks/02_applying-twice-changes-nothing.feature` (R4): a second apply skips every file, because the Codex config is written where Codex reads it.

## Notes

- Write the baselines with `node scripts/golden.mjs --lane assets-apply --update`, and read them
  before committing. `every-kind`'s Codex config must parse with `model` at the top level (E11).
  A baseline that holds it inside a server table is the defect, not a baseline to accept.
- Story 01 makes `CLAUDE.md` and `.mcp.json` merges, which moves this lane's baselines in its own
  diff. This story holds them as they render today, whole.
