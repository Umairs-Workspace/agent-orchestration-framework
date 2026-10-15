---
type: story
number: 11
slug: a-test-that-needs-a-suite-run-starts-the-shard-entry
title: "A test that needs a suite run starts the shard entry — the registry runner is spawned only where it is the subject"
parent: 160
status: done
owner: product-owner
created: 2026-10-15
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-012-a-test-that-needs-a-suite-run-starts-the-shard-entry, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-003-a-selection-launches-a-light-entry-and-the-registry-stays-where-its-readers-look, scripts/test-shard.mjs, scripts/site/build-site.mjs, test/support/workflow/workflow-lint.mjs, test/bundle/release-workflow-lint.test.mjs, test/testing/test-command-contract.test.mjs]
files: [.github/workflows/pages.yml, test/bundle/site-build.test.mjs, test/bundle/core-workspace.test.mjs, test/notify/notify-channels.test.mjs, test/arch/testing/acd-test-suite-registration.test.mjs]
---
# 11 · A test that needs a suite run starts the shard entry

## User story

As the operator waiting on the whole-tree gate,
I want a test that only needs one suite to run to start the light shard entry,
so that it stops paying the whole registry's import, about 19 s a spawn under load, for a suite it could run in about a second.

## Tasks

- [x] `tasks/00_a-suite-run-starts-the-shard-entry.feature`: the rule, the Pages gate step, the three suites that spawn the runner without it being their subject, and FF-16013's allowlist; the measured cut.

## Notes

ADR-012 is the decision. Measured at refine (census preload, four suites at a time): 10 spawns of
`node scripts/test.mjs` took 194 s. `site-build` made 3 of them (115 s), `test-command-contract` 3,
`core-workspace` 2 and `notify-channels` 2. `test-command-contract`'s rows have the runner as their
subject (72/ADR-004 §6), so they stay and go on the allowlist.

`core-workspace` also imports `scripts/test.mjs` in-process to read the registered cases. That
import's subject is the registry, so it stays; only its spawn is in scope.

The Pages workflow is the deploy gate. It runs the same control, `acd-loop-document-current`,
through the shard entry, so the same cases still gate the deploy.

Discovery: not applicable (EXAMPLES.md).
