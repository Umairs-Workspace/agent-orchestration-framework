---
type: story
number: 02
slug: update-changes-nothing-it-should-not
title: "Update changes nothing it should not — on its own output it changes nothing, over a user's edit it keeps the edit, from an older tree it makes exactly the expected changes, and the whole suite is green on Windows"
parent: 203
depends: [00, 01]
status: done
owner: product-owner
created: 2026-11-20
updated: 2026-11-21
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
diff is empty". A Windows-shaped capture of every scenario, made on purpose, proves the baselines
hold on any OS.

## Tasks

- [x] `tasks/00_update-on-its-own-output-changes-nothing.feature` (R1): for every `work-init` scenario, `update` after `init` leaves the tree equal to that scenario's baseline and reports nothing created, updated, deleted or drifted.
- [x] `tasks/01_update-keeps-what-the-user-changed.feature` (R2): over the customised tree with one aof file edited by the user and one new user file, update keeps both and says so.
- [x] `tasks/02_an-older-tree-upgrades-to-exactly-the-expected-changes.feature` (R3): the committed `default` baseline is rebuilt into a real tree, three older-release mutations are applied, and update makes exactly 1 update, 1 delete and 1 create, ending on the `default` baseline.
- [x] `tasks/03_the-suite-holds-on-any-os.feature` (R4): every scenario's files, given CRLF and real run values, and its step records, given Windows temp paths in another case and JSON-escaped, normalise to exactly the committed baselines. Amended at verify (2026-11-21) from an `@manual` run on the Windows control node.

## Notes

- The rebuild goes in `baseline-store.mjs` beside materialisation (ADR-006 §4). It recomputes each
  lock and journal hash from the rebuilt file, and refuses a baseline whose lock records drift.
- Task 03 is proven by construction on any OS (amended at verify, 2026-11-21). A difference a real
  Windows render could still make, a `\` written by aof outside a temp path, is aof's own output and
  is fixed where it is rendered (ADR-002 §5), never normalised.
