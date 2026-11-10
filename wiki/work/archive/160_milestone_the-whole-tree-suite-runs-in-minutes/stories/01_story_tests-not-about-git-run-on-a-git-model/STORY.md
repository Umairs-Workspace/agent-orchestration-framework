---
type: story
number: 01
slug: tests-not-about-git-run-on-a-git-model
title: "Tests that are not about git run on a git model — an in-memory repository behind the same exec port, held honest by a parity control"
parent: 160
status: done
owner: product-owner
created: 2026-10-14
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: [00, 06]
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-002-tests-that-are-not-about-git-run-on-a-git-model-behind-the-same-port, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-001-a-loop-step-reads-each-git-fact-once, packages/execution/src/worktrees.mjs, packages/work-loop/src/dispatch.mjs, packages/work-loop/src/wave.mjs, packages/work-loop/src/commands/loop.mjs, packages/work/src/commands/doctor.mjs, test/support/loop/lane-fixture.mjs, test/loop/loop-command-wave.test.mjs, test/loop/loop-command-reconcile.test.mjs, test/loop/loop-command-stops.test.mjs, test/loop/lane-is-local-slot.test.mjs, test/loop/loop-command-probe.test.mjs, test/arch/loop/acd-loop-ask-waits-in-place.test.mjs, test/arch/loop/acd-lane-records-and-the-declaration.test.mjs, test/arch/loop/acd-lane-grade-is-lane-scoped.test.mjs, test/arch/testing/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
files: [test/support/loop/git-fake.mjs, test/support/loop/lane-fixture.mjs, test/loop/loop-command-wave.test.mjs, test/loop/loop-command-reconcile.test.mjs, test/loop/loop-command-stops.test.mjs, test/loop/lane-is-local-slot.test.mjs, test/loop/loop-command-probe.test.mjs, test/arch/loop/acd-loop-ask-waits-in-place.test.mjs, test/arch/testing/acd-git-fake-parity.test.mjs, test/arch/testing/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 01 · Tests that are not about git run on a git model

## User story

As the operator waiting on the whole-tree gate,
I want the loop suites whose subject is not git to stop spawning git,
so that the slowest files in the tree run in seconds rather than spending most of their time
starting processes.

## Tasks

- [x] `tasks/00_the-git-model-answers-as-git-does.feature`: the model, its filesystem effects, its loud refusal of anything unmodelled, and the parity control.
- [x] `tasks/01_loop-suites-move-onto-the-model-by-rule.feature`: the classification rule applied to the loop suites; the git-subject cases stay on real git.

## Notes

ADR-002 is the decision. `loop-command-wave` alone sums to 5,134 s in the pool, and the next four
lane-fixture users together sum to another 3,800 s or so. Git took 70% of a wave case's wall time when
it ran alone at refine. The suites moved are the lane-fixture users whose subject is the loop. The
dispatch-lane, gate-propagation and mesh-worker suites keep real git, because git is their subject.

The rule is case by case, not file by file. A case in a moved file that asserts merge-home, worktree
reuse, a dirty or residue refusal, or branch cleanup keeps `exec: realExec` and a real repository. A
case that reaches git outside the port also keeps real git. After story 06, a real `work:doctor` or
`work:validate` over a fixture stream whose citations all resolve spawns no git, so such a case may
move: the model's loud failure tells you if it cannot. Every case keeps its name and its assertion.
A move changes the port, never the claim.

The fake models exactly the verbs story 00 leaves the loop calling. That is why this story depends
on 00 and 06. The two new files raise the `test/support/loop` and `test/arch/testing` budget rows by one
each, with their reasons.

Discovery: not applicable (EXAMPLES.md).
