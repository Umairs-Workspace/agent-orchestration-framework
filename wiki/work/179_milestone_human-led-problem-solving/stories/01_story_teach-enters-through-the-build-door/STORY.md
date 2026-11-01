---
type: story
number: 01
slug: teach-enters-through-the-build-door
title: "`--teach` enters through the build door — one story, here, never beside `--manual`, and `@aof/work` never names it"
parent: 179
depends: [00]
status: in-review
owner: product-owner
created: 2026-10-28
updated: 2026-10-31
adrs: [ADR-002, ADR-004]
reads:
  - wiki/work/179_milestone_human-led-problem-solving/SPEC.md
  - wiki/work/179_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-002
  - wiki/work/179_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-004
  - wiki/work/149_story_continue-manual-mode-guides-the-operator/tasks/01_manual-is-one-story-here-at-every-door.feature
  - packages/core/assets/commands/manual.md
  - packages/specification-by-example/package.json
  - packages/specification-by-example/test/index.mjs
  - packages/specification-by-example/test/package-seams.suite.mjs
  - packages/work/test/reentry.test.mjs
  - packages/work-loop/src/commands/drive.mjs
  - test/arch/examples/acd-sbe-package-one-way.test.mjs
  - scripts/workspace-boundaries.mjs
files:
  - packages/learning/package.json
  - packages/learning/README.md
  - packages/learning/src/mode.mjs
  - packages/learning/test/index.mjs
  - packages/learning/test/mode.suite.mjs
  - packages/work/src/commands/continue.mjs
  - packages/core/src/application/bindings/commands/continue.mjs
  - packages/core/package.json
  - package.json
  - yarn.lock
  - scripts/test.mjs
  - test/bundle/yarn-installation.test.mjs
  - test/surfaces/board-mesh-execution.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/arch/command/acd-learning-package-one-way.test.mjs
  - test/arch/command/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/work/archive/142_milestone_yarn-workspace-modularization/plans/09-test-ledger.json
  - scripts/workspace-runtime-audit.json
  - test/arch/command/acd-cli-entry-executes.test.mjs
  - test/bundle/core-workspace.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 179/01 · --teach enters through the build door

## User story

As **an operator who wants to be taught the code a story touches while I write it**,
I want **`aof work continue <ref> --teach` to be answered by the same door that answers `--manual`,
refusing what it cannot teach here (a milestone, another node, `--manual` alongside it) before
anything moves, and naming `/aof:teach <ref>` when it can**,
so that **teaching inherits every refusal 149 proved in code, the board can offer it, and
`@aof/work` stays a core that names no practice**.

What lands (ADR-002, ADR-004): the `@aof/learning` package with its mode descriptor, the door's
`operatorModes` seam, core composing the one into the other, and FF-17902.

## Tasks

- [x] 00 [--teach is answered by the build door](tasks/00_teach-is-answered-by-the-door.feature)
- [x] 01 [@aof/work never names the practice](tasks/01_work-never-names-the-practice.feature)

## Notes

- `yarn.lock` gains a workspace entry only. Run `node scripts/supply-chain-audit.mjs` after the
  install (AGENTS.md). No third-party dependency is added.
- The `aof:teach` command itself is 02's. Until 02 lands, the door names a command that no render
  carries yet, which is expected between the two stories on one branch.
- FF-17902 admits `packages/core/src/practices.mjs` as an importer before 02 creates it.
