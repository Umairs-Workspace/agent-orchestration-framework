---
type: story
number: 00
slug: the-loop-reads-each-git-fact-once-per-step
title: "The loop reads each git fact once per step — a step-scoped read memo on the exec port, and no work on a lane already at its base"
parent: 160
status: not-started
owner: product-owner
created: 2026-10-14
updated: 2026-10-14
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-001-a-loop-step-reads-each-git-fact-once, packages/execution/src/worktrees.mjs, packages/work-loop/src/wave.mjs, packages/work-loop/src/dispatch.mjs, packages/work-loop/src/commands/loop.mjs, packages/core/src/application/bindings/loop/wave.mjs, packages/core/src/application/bindings/commands/loop.mjs, packages/core/src/application/bindings/mesh/worktree.mjs, test/support/loop/lane-fixture.mjs, test/loop/loop-command-wave.test.mjs, test/work/lifecycle/work-dispatch-lanes.test.mjs, test/grade/gate-propagation-refusals-leave-branch.test.mjs, test/arch/grade/acd-gate-propagation-never-discards.test.mjs, test/mesh/mesh-worktree-branch-not-detached.test.mjs, packages/execution/test/worktrees.test.mjs, packages/execution/test/index.mjs, test/arch/loop/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
files: [packages/execution/src/worktrees.mjs, packages/work-loop/src/wave.mjs, packages/work-loop/src/dispatch.mjs, packages/work-loop/src/commands/loop.mjs, packages/core/src/application/bindings/loop/wave.mjs, packages/core/src/application/bindings/commands/loop.mjs, packages/core/src/application/bindings/mesh/worktree.mjs, packages/execution/test/worktrees.test.mjs, test/arch/loop/acd-loop-git-reads-once-per-step.test.mjs, test/arch/loop/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 00 · The loop reads each git fact once per step

## User story

As the operator running the loop and the gate on the Windows control node,
I want one loop step to ask git each ref or topology question once,
so that a lane cycle spends its time on the work rather than on process spawns, both in the real loop
and in the suites that drive it.

## Tasks

- [ ] `tasks/00_a-step-memoises-its-git-reads.feature`: the memo's rule (what it keeps, what clears it, what it never keeps), at the port.
- [ ] `tasks/01_a-lane-cycle-stays-under-its-call-ceiling.feature`: a wave tick wraps the port, a lane already at its base is left alone, the commit path's calls collapse, and the measured ceiling.

## Notes

ADR-001 is the decision. Profiled at refine over real git: one lane cycle asked `rev-parse HEAD` 28
times, and `advanceBranchToBase` made four calls on a lane already at the base. The ceiling FF-16001
pins is the count measured after the cut, recorded in this story's VERIFICATION evidence. It is not
a number chosen here.

The memo is invisible to callers. If a case in the owning suites changes its answer, the memo is
wrong; the case is right. Run the importer sweep over the changed modules (the suites in `reads:`)
before handing the story to review.

The new arch file raises the `test/arch/loop` budget row by one, with its reason (FF-11904).
Story 01 depends on this one.

Discovery: not applicable (EXAMPLES.md). Each rule here is an engineering property of a process
boundary, with no business owner.
