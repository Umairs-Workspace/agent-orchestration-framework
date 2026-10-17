---
type: story
number: 12
slug: tests-keep-their-state-their-own
title: "Tests keep their state their own — a test run trusts folders in its own claude home, and a store opens without rewriting a current schema"
parent: 160
status: in-progress
owner: product-owner
created: 2026-10-17
updated: 2026-10-17
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-013-tests-keep-their-state-their-own, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-008-a-tests-child-aof-runs-from-one-bundle-built-at-the-start-of-the-run, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-005-the-gate-launches-clean-and-dies-with-its-session, packages/core/src/application/bindings/claude-trust.mjs, test/mesh/worker/mesh-worker-trust-worktree.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/bundle/core-workspace.test.mjs]
files: [packages/execution/src/claude-trust.mjs, packages/mesh/src/projection-store.mjs, packages/effects/src/journal.mjs, scripts/test-harness.mjs, scripts/test-sharded.mjs, scripts/workspace-runtime-audit.json, test/testing/test-sharded-report.test.mjs, test/arch/store/acd-shared-store-concurrency.test.mjs, test/arch/loop/acd-loop-suite-registration.test.mjs]
---
# 12 · Tests keep their state their own

## User story

As the operator whose machine runs the whole-tree gate,
I want a test run to write claude's folder trust into a claude home of its own, never my
`~/.claude.json`, and the projection store and effects journal to open without rewriting a schema
that is already current,
so that the tests stop growing and racing my real claude config (12 MB, 106,899 leftover temp
entries before the 2026-10-17 cleanup) and the gate stops paying for that file and for a write
transaction on every store open — the two costs the 160 round-3 trial measured as about a third of
the tree's summed time.

## Tasks

- [ ] `tasks/00_a-test-run-trusts-folders-in-its-own-claude-home.feature` — a test process writes claude's folder trust into a claude home of its own
- [ ] `tasks/01_a-store-opens-without-rewriting-a-current-schema.feature` — opening a current store only reads

## Notes

- Measured in the round-3 trial (STATE.md): the six heaviest loop and lane suites alone 914 s → 574 s
  with both changes; the whole tree at 12 workers 205.8 → 140.8 summed minutes.
