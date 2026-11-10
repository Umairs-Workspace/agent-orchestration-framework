---
type: story
number: 04
slug: an-existing-project-declares-its-test-layout
title: "An existing project is told what its test declaration leaves out, and one skill declares it"
parent: 190
depends: ["190/01", "190/02"]
status: done
owner: product-owner
created: 2026-11-10
updated: 2026-11-10
adrs: [ADR-008]
reads:
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/SPEC.md
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-003
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-005
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-008
  - packages/work/src/testing/select.mjs
  - packages/work/src/testing/record.mjs
  - packages/work/src/commands/regression-gate.mjs
  - scripts/test-sharded.mjs
  - packages/core/src/application/bindings/commands/project-doctor.mjs
  - packages/core/src/application/bindings/work/toolchain.mjs
  - packages/core/assets/commands/init.md
  - packages/core/assets/commands/add-uat.md
  - test/work/lifecycle/work-test-declared.test.mjs
  - test/testing/test-command-contract.test.mjs
  - test/arch/testing/acd-test-record-one-writer.test.mjs
files:
  - packages/work/src/testing/layout.mjs
  - packages/work/src/testing/select.mjs
  - packages/work/src/audit/census.mjs
  - packages/work/src/commands/test.mjs
  - .aof/aof.config.json
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md
  - packages/work/src/testing/toolchain.mjs
  - packages/work/src/testing/changed.mjs
  - packages/work/src/commands/test.mjs
  - packages/work/package.json
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/core/src/application/bindings/commands/init-update.mjs
  - packages/core/src/application/bindings/commands/test.mjs
  - packages/core/src/application/assemble.mjs
  - packages/core/assets/commands/map-tests.md
  - packages/core/assets/bundle.json
  - packages/core/assets/manifest.json
  - packages/core/assets/variants/codex/workflow.md
  - .claude/commands/aof/map-tests.md
  - .agents/skills/aof-map-tests/SKILL.md
  - .agents/skills/aof-map-tests/agents/openai.yaml
  - .opencode/commands/aof/map-tests.md
  - .codex/aof/workflows/workflow-contract.md
  - .aof/aof.lock.json
  - .aof/aof.apply-journal.json
  - test/testing/test-layout-check.test.mjs
  - test/testing/test-plan-commit.test.mjs
  - test/testing/index.mjs
  - test/work/lifecycle/work-update-test-layout.test.mjs
  - test/work/lifecycle/map-tests-command.test.mjs
  - test/work/lifecycle/index.mjs
  - test/arch/testing/acd-suite-registration-single-decider.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/arch/command/acd-cli-entry-executes.test.mjs
  - test/bundle/yarn-installation.test.mjs
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - packages/core/test/bundle.suite.mjs
  - packages/core/test/bundle-runtime-variants.suite.mjs
  - wiki/prompt-audit.md
  - scripts/workspace-runtime-audit.json
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/VERIFICATION.md
schema: 1
aofVersion: 0.1.0
---
# 190/04 · An existing project is told what its test declaration leaves out, and one skill declares it

## User story

As **an operator of a project that was on aof before 190**,
I want **`aof work update` and `aof project doctor` to name each part of my test declaration that
190's narrowing and resume cannot use, and `/aof:map-tests` to declare it and show me, commit by
commit, what changed**,
so that **taking 190 actually makes my project's runs smaller, instead of quietly keeping the
old whole-tree behaviour with nothing to say so**.

What lands (ADR-008):
- **a `test-layout` check family in `aof project doctor`:** suites, couplings and resume;
- **the same warnings at the end of `aof work update`**;
- **`aof test --plan` and `--commit <rev>`:** replay a commit's selection without running it;
- **`/aof:map-tests`:** declares `work.test.*`, `--dry-run` previews, and the report is the
  before-and-after replay.

## Tasks

- [x] 00 [the project doctor names what the declaration leaves out](tasks/00_the-project-doctor-names-what-the-declaration-leaves-out.feature)
- [x] 01 [work update prints the test-layout warnings](tasks/01_work-update-prints-the-test-layout-warnings.feature)
- [x] 02 [a commit is replayed without running anything](tasks/02_a-commit-is-replayed-without-running-anything.feature)
- [x] 03 [map-tests says what it does](tasks/03_map-tests-says-what-it-does.feature)
- [x] 04 [map-tests proves a real declaration](tasks/04_map-tests-proves-a-real-declaration.feature) — E14 and E15 pass after the rework, E19 passes, E16 not triggered (VERIFICATION)
- [x] 05 [the doctor and the selector agree on what a suite is](tasks/05_the-doctor-and-the-selector-agree-on-what-a-suite-is.feature) — `@bug` F-05, F-06, F-07

## Notes

- Added at verify (operator, 2026-11-10). The operator rejected deferring it to a follow-up
  milestone. The refine that framed 190 never asked how a project already on aof adopts the keys,
  and that lesson is in the milestone's FEEDBACK.
- The check goes in `aof project doctor`, not `aof work doctor` as first proposed (ADR-008
  alternatives).
- Depends on 01 and 02: the check reads their keys, and the skill declares them.
- The `.claude/`, `.agents/`, `.opencode/` and `.codex/` renders come from `aof work update`, never
  from hand edits.
- This repo's own `work.test` block is already complete (190/01, 190/02), so the skill's live proof
  runs on a scratch clone with the pre-190 block (task 04). It never rewrites this repo's config.
