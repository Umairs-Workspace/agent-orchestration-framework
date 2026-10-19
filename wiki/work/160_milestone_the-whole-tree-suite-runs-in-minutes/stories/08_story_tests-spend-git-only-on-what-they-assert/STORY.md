---
type: story
number: 08
slug: tests-spend-git-only-on-what-they-assert
title: "Tests spend git only on what they assert — the model merges a lane home, and a real-git fixture starts from a template"
parent: 160
status: done
owner: product-owner
created: 2026-10-15
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-009-tests-spend-git-only-on-what-they-assert, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-002-tests-that-are-not-about-git-run-on-a-git-model-behind-the-same-port, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-001-a-loop-step-reads-each-git-fact-once, packages/execution/src/worktrees.mjs, packages/work-loop/src/wave.mjs, packages/work-loop/src/dispatch.mjs, test/arch/loop/acd-loop-git-reads-once-per-step.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/work/lifecycle/work-dispatch-lanes.test.mjs, test/grade/gate-propagation-refusals-leave-branch.test.mjs, test/assignment/blocked-run-parking.test.mjs]
files: [test/support/loop/git-fake.mjs, test/support/loop/lane-fixture.mjs, test/support/cli-spawn.mjs, test/support/dispatch-lane-fixture.mjs, test/support/gate-propagation-fixture.mjs, test/support/mesh-assign-fixture.mjs, test/arch/testing/acd-git-fake-parity.test.mjs, test/loop/loop-command-wave.test.mjs, test/loop/loop-command-reconcile.test.mjs, test/loop/loop-command-stops.test.mjs, test/loop/loop-command-resume.test.mjs, test/loop/loop-cap-exhaustion-carries-the-record.test.mjs, test/loop/lane-is-local-slot.test.mjs]
---
# 08 · Tests spend git only on what they assert

## User story

As the operator waiting on the whole-tree gate,
I want a test to spawn git only for the git behaviour it is checking,
so that the 10,867 git calls in the heaviest suites shrink, and the loop and lane suites stop dominating the run.

## Tasks

- [x] `tasks/00_the-git-model-merges-a-lane-home.feature`: `merge --no-ff` joins the model with parity rows, and the loop suites' real-git cases are re-sorted by ADR-002's rule.
- [x] `tasks/01_a-real-git-fixture-starts-from-a-template.feature`: one template repository per process, copied per fixture, and held to an `init`-built one by FF-16009.

## Notes

ADR-009 is the decision. Measured at refine, run alone: `loop-command-wave` still made 4,018 git calls
(1,056 `rev-parse`, 368 `status`, 365 `merge-base`), `work-dispatch-lanes` 1,836,
`loop-command-reconcile` 1,507, `gate-propagation-refusals-leave-branch` 918 and
`blocked-run-parking` 517. In those last two, `init`, `config`, `add` and `commit` are the fixture's
setup, repeated for every case.

160/01 moved 31 case sites. Of what stayed on real git, most cases end in a merge home, which the
model refused. Apply the rule as 160/01 did: run every remaining real-git case on the model, and
move a case only when it passes there and its subject is not merge, worktree or cleanup behaviour.
`work-dispatch-lanes` stays on real git by its own header; only its fixture setup gets cheaper.

FF-16001 counts the loop's calls at the port, not the fixture's, so the template does not move its
ceiling. FF-16002's `MOVED` list grows with the moved cases.

Discovery: not applicable (EXAMPLES.md).
