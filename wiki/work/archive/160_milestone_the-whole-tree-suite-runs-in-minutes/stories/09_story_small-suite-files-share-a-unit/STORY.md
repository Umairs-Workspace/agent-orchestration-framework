---
type: story
number: 09
slug: small-suite-files-share-a-unit
title: "Small suite files share a unit — the sharded runner packs short files into one process and keeps every account per file"
parent: 160
status: done
owner: product-owner
created: 2026-10-15
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: [07]
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-010-small-suite-files-share-a-unit, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-006-the-runner-enforces-the-budget-and-a-timeout-is-not-finished, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-003-a-selection-launches-a-light-entry-and-the-registry-stays-where-its-readers-look, scripts/test.mjs, scripts/test-sharded.mjs, test/arch/grade/acd-gate-result-is-evidence.test.mjs, test/run/regression-gate.test.mjs, test/arch/loop/acd-loop-suite-registration.test.mjs]
files: [scripts/test-sharded.mjs, scripts/test-sharded-pool.mjs, scripts/test-sharded-report.mjs, scripts/test-shard.mjs, scripts/test-harness.mjs, scripts/workspace-runtime-audit.json, test/testing/test-sharded-report.test.mjs, test/testing/test-command-contract.test.mjs]
---
# 09 · Small suite files share a unit

## User story

As the operator waiting on the whole-tree gate,
I want the runner to run short suite files together in one process,
so that about a thousand process start-ups leave the run, and its timings, failures and not-finished reports still name each file.

## Tasks

- [x] `tasks/00_short-files-pack-into-one-unit.feature`: the packing rule. Under the threshold a file packs, at or over it a file is its own unit, a file is never split, and every registered case runs once.
- [x] `tasks/01_a-packed-unit-accounts-per-file.feature`: per-file timings, per-file lost-case detection, the alone-retry and the not-finished report for a packed unit; the measured cut.

## Notes

ADR-010 is the decision. Measured on the verify run's timings: 975 units under 15 s summed to
4,102 s, and 616 units under 5 s summed to 1,229 s. 422 of the 503 arch files took under 10 s each,
1,380 s in all. Twenty small arch suites took 20.7 s as twenty processes and 11.1 s as one, on an
idle node.

The story follows 07 because both change `scripts/test-sharded.mjs` and its runtime-audit entries.
A packed unit's children load 07's bundle like any other unit's.

Probe the runner through `node scripts/test-shard.mjs` and `node scripts/test-sharded.mjs --plan`,
never through `aof test` (m160/02 R2).

Discovery: not applicable (EXAMPLES.md).
