---
type: story
number: 02
slug: a-focused-run-loads-only-what-it-names
title: "A focused run loads only what it names — a selection launches the light shard entry, and the registry stays where its readers look"
parent: 160
status: done
owner: product-owner
created: 2026-10-14
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-003-a-selection-launches-a-light-entry-and-the-registry-stays-where-its-readers-look, packages/work/src/testing/toolchain.mjs, packages/work/src/commands/test.mjs, packages/work/src/audit/census.mjs, scripts/test.mjs, scripts/test-shard.mjs, scripts/test-harness.mjs, scripts/test-sharded.mjs, schemas/aof.schema.json, .aof/aof.config.json, .claude/hooks/aof/guard-test-isolation.mjs, packages/work/test/testing.test.mjs, packages/work/test/work-audit-hook-wiring.suite.mjs, test/work/work-toolchain-declaration.test.mjs, test/work/lifecycle/work-test-declared.test.mjs, test/testing/test-command-contract.test.mjs, test/testing/repo-test-isolation-guard.test.mjs, test/arch/command/acd-declared-program-single-speller.test.mjs, test/arch/testing/acd-one-selector-one-changed-set.test.mjs, test/arch/testing/acd-test-command-reports-not-decides.test.mjs]
files: [packages/work/src/testing/toolchain.mjs, scripts/test-shard.mjs, .aof/aof.config.json, .claude/hooks/aof/guard-test-isolation.mjs, packages/work/test/testing.test.mjs, test/work/work-toolchain-declaration.test.mjs, test/testing/test-command-contract.test.mjs, test/testing/repo-test-isolation-guard.test.mjs]
---
# 02 · A focused run loads only what it names

## User story

As a builder running a story's own suites, or the operator re-running one red file,
I want a focused run to load only the files it names,
so that it starts in about a second instead of spending 15 s importing 1,177 suites it will not run.

## Tasks

- [x] `tasks/00_a-selection-launches-its-declared-entry.feature`: the `selectProgramArgs` declaration, compiled and launched; absent means exactly today.
- [x] `tasks/01_the-shard-entry-runs-a-named-selection.feature`: the light entry takes several files, reports an unusable one by path, stays guarded, and loads nothing unnamed.

## Notes

ADR-003 is the decision. Measured at refine, importing `scripts/test.mjs` takes 14.8 s. About
twenty suites and the census read that file's import text, so the registry does not move. What
changes is which program a selection launches. `node scripts/test.mjs --only …` keeps working, and
keeps its cost: the fast path is `aof test` with a selection (every story lane), or
`node scripts/test-shard.mjs <files>` by hand.

`.aof/aof.config.json` gains `selectProgramArgs` and changes `selectArgs` to `["{file}"]`. A
loop lane's reconcile resets `.aof/`, so commit the config change by hand on the lane branch.

Discovery: not applicable (EXAMPLES.md).
