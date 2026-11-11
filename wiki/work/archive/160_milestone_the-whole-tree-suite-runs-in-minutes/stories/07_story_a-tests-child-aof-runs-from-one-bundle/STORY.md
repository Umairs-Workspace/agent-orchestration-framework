---
type: story
number: 07
slug: a-tests-child-aof-runs-from-one-bundle
title: "A test's child aof runs from one bundle — built once at the start of the run, held to the source by a parity control"
parent: 160
status: done
owner: product-owner
created: 2026-10-15
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-008-a-tests-child-aof-runs-from-one-bundle-built-at-the-start-of-the-run, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-004-a-child-process-compiles-once-and-loads-only-its-verbs-closure, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-005-the-gate-launches-clean-and-dies-with-its-session, packages/core/src/cli.mjs, packages/core/src/asset-base.mjs, scripts/sea-entry.mjs, scripts/test-sharded-pool.mjs, scripts/test-shard.mjs, test/support/cli-spawn.mjs, packages/work/src/commands/regression-gate.mjs, test/run/regression-gate.test.mjs, test/arch/grade/acd-gate-result-is-evidence.test.mjs, test/testing/test-sharded-report.test.mjs]
files: [packages/core/bin/aof.mjs, scripts/build-sea.mjs, scripts/test-sharded.mjs, scripts/workspace-runtime-audit.json, test/arch/command/acd-cli-entry-executes.test.mjs, test/arch/command/acd-single-entry-command-core.test.mjs, test/arch/session/acd-session-verb-boots-no-registry.test.mjs, test/testing/build-sea-recipe-guards.test.mjs]
---
# 07 · A test's child aof runs from one bundle

## User story

As the operator waiting on the whole-tree gate,
I want every child `aof` a test starts in that run to load one prebuilt bundle instead of 706 source files,
so that the ~800 child spawns in the heaviest suites alone cost about 0.6 s each instead of about 2 s, and the gate moves toward its 10-minute budget.

## Tasks

- [x] `tasks/00_the-runner-builds-one-bundle-for-its-units.feature`: the sharded runner builds the bundle once from the release recipe, its units' children load it, and a failed build falls back to the source, visibly.
- [x] `tasks/01_the-bundle-answers-as-the-source-does.feature`: FF-16008's parity over a fixed command set; where the subject is the source, the source runs; the measured cut.

## Notes

ADR-008 is the decision. It is the start-up lever F-03 left open. 160/03's compile cache is engaged
and hit, but a child still resolves and evaluates 706 modules. Measured at refine, side by side
under the same load: `aof work find 160 --json` took about 2.0 s from source and 0.56 s from an
esbuild bundle of `cli.mjs`, with byte-identical output.

The spawn census at refine counted 799 child `aof` spawns, 1,620 s in all, in the 49 heaviest suites
alone. The rest of the tree has more.

The operator answered 160/07 Q1 on 2026-10-15 with "Yes, bundle in the gate" (EXAMPLES.md): the
sharded gate's child `aof` runs the bundle, and focused runs and module-loading tests stay on the
source.

Probe the bin seam through `node scripts/test-shard.mjs`, never through `aof test` (m160/02 R2).
`scripts/workspace-runtime-audit.json` keys each reviewed site on its file's digest, so editing
`scripts/test-sharded.mjs` or `scripts/build-sea.mjs` re-keys their entries.
