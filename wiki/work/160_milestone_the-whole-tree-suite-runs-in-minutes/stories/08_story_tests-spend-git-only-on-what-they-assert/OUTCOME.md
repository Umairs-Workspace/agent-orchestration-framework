# 160/08 · Tests spend git only on what they assert — Outcome

## Delivered

### The git model merges a lane home
`test/support/loop/git-fake.mjs` answers and writes `merge --no-ff` of a lane branch as real git does, refuses a merge in which both sides changed one path, and refuses any merge form it does not model; sixteen more loop cases run on it (12 wave, 4 reconcile).

### A real-git fixture starts from a template
The lane, dispatch and mesh-worker fixtures copy a repository built once per process instead of running `init` and `config` per case; `work-dispatch-lanes` makes 1 `init` and 2 `config` calls where it made 88 and 176.

### The loop suites spend fewer git calls
`loop-command-wave` makes 2,219 git calls (4,023 before) and `loop-command-reconcile` 1,160 (1,518), every case still green.

## Assumptions

- **A suite whose subject is git keeps real git** — a case that asserts a merge home's history, a reused lane, a dirty or cleanup refusal stays on real git by ADR-002 §3, so its cost moves only by the template.
