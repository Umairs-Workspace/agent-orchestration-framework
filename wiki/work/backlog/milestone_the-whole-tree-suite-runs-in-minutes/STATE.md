---
doc: state
---
# The whole-tree suite signs off in minutes — State

## Progress

Captured 2026-10-14 on the backlog; not yet promoted or broken down.

## Notes & decisions in flight

- The measurements behind the Objective were taken on the Windows control node with a git-call
  profiler (child_process wrapped by an `--import` preload) and `--cpu-prof` over `aof work doctor`.
  Refine should re-measure from the branch that carries `ae1495a6` and `79b926b7`, not from `main`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] Whole-tree gate green under the enforced budget on the control node
