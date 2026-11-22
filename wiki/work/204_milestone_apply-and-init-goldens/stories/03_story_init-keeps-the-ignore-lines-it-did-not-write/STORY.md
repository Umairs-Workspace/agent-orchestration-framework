---
type: story
number: 03
slug: init-keeps-the-ignore-lines-it-did-not-write
title: "Init keeps the ignore lines it did not write, and --global writes only into the temp home — init held on an empty folder, over the user's ignore files, after work init and on a second run"
parent: 204
depends: []
status: done
owner: product-owner
created: 2026-11-21
updated: 2026-11-22
adrs: [ADR-001, ADR-005]
reads:
  - wiki/work/204_milestone_apply-and-init-goldens/stories/03_story_init-keeps-the-ignore-lines-it-did-not-write/EXAMPLES.md
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-001
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-005
  - test/support/golden/harness.mjs
  - test/support/golden/baseline-store.mjs
  - scripts/golden.mjs
  - test/golden/work-init.lane.mjs
  - test/golden/work-init.test.mjs
  - packages/core/src/application/bindings/commands/project-init.mjs
  - packages/core/src/application/bindings/commands/assets/add.mjs
  - packages/core/src/application/bindings/commands/assets/refs.mjs
  - packages/core/src/application/bindings/commands/assets/apply.mjs
  - packages/core/src/application/bindings/dsl.mjs
  - packages/core/src/workspace.mjs
  - packages/core/src/lock.mjs
files:
  - test/golden/project-init.lane.mjs
  - test/golden/project-init.test.mjs
  - test/golden/index.mjs
  - test/support/golden/lanes.mjs
  - test/golden/baselines/project-init/
  - packages/core/src/application/bindings/workspace-writer.mjs
  - packages/core/src/aof-gitignore.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 204/03 · Init keeps the ignore lines it did not write, and `--global` writes only into the temp home

## User story

As **a user who runs `aof init` in a project that already has its own ignore rules, or that already
ran `aof work init`**,
I want **init to add its one ignore line and keep every line it did not write**,
so that **init never silently starts committing files I, or `aof work init`, chose to ignore.
And as a developer, I want init and the `--global` path held to baselines, so that a change to
what they write, or a global write escaping the temp home, shows in the PR.**

What lands (ADR-001, ADR-005): the `project-init` lane's five scenarios and their baselines, and
the fix that makes init add `/work/` to `.aof/.gitignore` through the file's additive owner
instead of writing the file whole.

## Tasks

- [x] `tasks/00_init-writes-its-scaffold-and-refuses-a-second-run.feature` (R1): init on an empty folder is held whole, and a second init refuses and changes nothing.
- [x] `tasks/01_init-keeps-the-lines-and-sections-it-did-not-write.feature` (R2): the user's ignore lines, and `work init`'s ignore entries and lock section, survive init.
- [x] `tasks/02_global-assets-write-only-into-the-temp-home.feature` (R3): `assets add --global` writes into the temp home, a global command is refused, and the project renders the global assets it uses.

## Notes

- `after-work-init` names 203's `work-init/claude` as its base, so its delta holds only what init
  changes: the config it creates, the lock's top-level keys, and the ignore file.
- This story shares no source file with stories 00 to 02. It shares the lane registry, the golden
  index and the budget row, one line each.
