---
type: story
number: 04
slug: named-test-runs
title: "An agent runs the suites it names and states why, and the whole tree is refused inside story work"
parent: 210
depends: [00, 01, 02]
status: not-started
owner: product-owner
created: 2026-11-26
updated: 2026-11-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-002, ADR-003, ADR-007, ADR-008]
reads: [wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-002, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-003, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-007, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-008, packages/work/src/testing/toolchain.mjs, packages/work/src/testing/importers.mjs, packages/work/src/testing/record.mjs, packages/work/src/grade.mjs, packages/work/src/commands/resolve.mjs, packages/core/src/application/assemble.mjs, packages/work/src/audit/census.mjs]
files: [packages/work/src/commands/test.mjs, packages/work/src/testing/select.mjs, packages/work/src/testing/suites.mjs, packages/work/src/testing/declared.mjs, packages/work/src/testing/changed.mjs, packages/work/src/testing/toolchain.mjs, packages/work/src/testing/layout.mjs, packages/work/src/story-contract-derive.mjs, packages/work/package.json, scripts/workspace-runtime-audit.json, .aof/aof.config.json, packages/core/src/application/bindings/work/test-select.mjs, packages/core/src/application/bindings/work/test-changed.mjs, packages/core/src/application/bindings/commands/test.mjs, packages/core/src/application/bindings/command-core.mjs, packages/work-loop/src/dispatch.mjs, packages/work/test/testing.test.mjs, test/testing/test-command-contract.test.mjs, test/testing/test-plan-commit.test.mjs, test/testing/index.mjs, test/work/lifecycle/work-test-select.test.mjs, test/work/lifecycle/work-test-declared.test.mjs, test/work/lifecycle/index.mjs, test/work/story-context-contract.test.mjs, test/work/lifecycle/work-dispatch-lanes.test.mjs, test/integration/steps/lifecycle.steps.mjs, test/fixtures/application/command-inventory.json, test/bundle/yarn-installation.test.mjs, test/arch/testing/acd-test-selection-widens-never-narrows.test.mjs, test/arch/testing/acd-test-selection-reads-no-graph.test.mjs, test/arch/testing/acd-one-selector-one-changed-set.test.mjs, test/arch/testing/acd-test-command-reports-not-decides.test.mjs, test/arch/testing/acd-suite-registration-single-decider.test.mjs, test/arch/testing/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/arch/command/acd-declared-program-single-speller.test.mjs, test/arch/graph/acd-code-graph-one-reader.test.mjs, test/arch/planning/acd-derivation-proposes-never-writes.test.mjs, test/arch/planning/acd-contract-set-has-one-home.test.mjs]
---
# 04 · An agent runs the suites it names and states why, and the whole tree is refused inside story work

## User story

As an agent testing a story,
I want `aof test` to run exactly the suites I name with my reason recorded, to suggest the suites
that can see my change, and to refuse the whole tree while I am inside story work,
so that my runs are bounded by my own stated choice, and a whole-tree run is no longer something
I can reach for after every fix.

## Tasks

- [ ] [named runs and the suggestion](tasks/00_named-runs.feature)
- [ ] [the whole tree outside story work](tasks/01_whole-tree-outside-story-work.feature)
- [ ] [the old selection removed](tasks/02_old-selection-removed.feature)

## Notes

The command face and the removal: `--scope`, `impacted`, `--story`, `--since`, `--commit`, `--plan`,
the selector, the declared changed set and `work.test.couplings` all go, with their tests and
controls. The suite predicate moves to `suites.mjs`. FF-21001, FF-21002 and FF-21003 land here. The
`inheritCodeGraph` change in `packages/work-loop/src/dispatch.mjs` is its comment only.
