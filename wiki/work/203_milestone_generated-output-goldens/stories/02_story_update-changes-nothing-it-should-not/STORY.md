---
type: story
number: 02
slug: update-changes-nothing-it-should-not
title: "Update changes nothing it should not — on its own output it changes nothing, over a user's edit it keeps the edit, from an older tree it makes exactly the expected changes, and the whole suite is green on Windows"
parent: 203
depends: [00, 01]
status: not-started
owner: product-owner
created: 2026-11-20
updated: 2026-11-20
adrs: [ADR-001, ADR-003, ADR-006]
reads:
  - wiki/work/203_milestone_generated-output-goldens/stories/02_story_update-changes-nothing-it-should-not/EXAMPLES.md
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-003
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-006
  - test/support/golden/harness.mjs
  - test/support/golden/normalise.mjs
  - scripts/golden.mjs
  - test/golden/work-init.lane.mjs
  - test/golden/baselines/work-init/
  - packages/core/src/work/update.mjs
  - packages/core/src/render-plan.mjs
  - packages/core/src/lock.mjs
  - packages/core/src/application/bindings/commands/init-update.mjs
files:
  - test/golden/work-update.lane.mjs
  - test/golden/work-update.test.mjs
  - test/golden/index.mjs
  - test/support/golden/lanes.mjs
  - test/support/golden/baseline-store.mjs
  - test/golden/baselines/work-update/
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/work/203_milestone_generated-output-goldens/stories/02_story_update-changes-nothing-it-should-not/evidence/
schema: 1
aofVersion: 0.1.0
---
# 203/02 · Update changes nothing it should not

## User story

As **a user who runs `aof work update` to take a new release**,
I want **update to change exactly what the release changed: nothing on a current tree, never my
own edit, and every file a newer bundle adds, changes or retires**,
so that **I can run it on any project without reading every file afterwards, and the developer who
changes update sees any departure from that as a diff before it ships**.

What lands (ADR-006): the `work-update` lane, idempotence over every `work-init` scenario, the
`customised-update` and `upgrade` scenarios with their baselines, and the rebuild of a committed
baseline into a real tree with a real lock. The rebuild also serves 207, whose acceptance is "the
diff is empty". The whole suite then runs on the Windows control node.

## Tasks

- [ ] `tasks/00_update-on-its-own-output-changes-nothing.feature` (R1): for every `work-init` scenario, `update` after `init` leaves the tree equal to that scenario's baseline and reports nothing created, updated, deleted or drifted.
- [ ] `tasks/01_update-keeps-what-the-user-changed.feature` (R2): over the customised tree with one aof file edited by the user and one new user file, update keeps both and says so.
- [ ] `tasks/02_an-older-tree-upgrades-to-exactly-the-expected-changes.feature` (R3): the committed `default` baseline is rebuilt into a real tree, three older-release mutations are applied, and update makes exactly 1 update, 1 delete and 1 create, ending on the `default` baseline.
- [ ] `tasks/03_the-suite-is-green-on-windows.feature` (R4, `@manual`): both lanes pass on the Windows control node, isolated under `AOF_GLOBAL_HOME`, against the baselines written on macOS.

## Notes

- The rebuild goes in `baseline-store.mjs` beside materialisation (ADR-006 §4). It recomputes each
  lock and journal hash from the rebuilt file, and refuses a baseline whose lock records drift.
- Task 03 needs the Windows control node. This MacBook is in no mesh, so the operator, or an agent
  on that node, runs it from a pull of this branch. Its evidence goes in `evidence/`.
- If the Windows run finds instability, it is fixed where it is rendered (ADR-002 §5). That file is
  outside this story's write set, and the builder reports it as a contract gap.
