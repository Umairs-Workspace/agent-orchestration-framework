---
type: story
number: 144
slug: the-whole-tree-run-signs-off-in-minutes
title: "The whole-tree test run signs off in minutes, not half a day — the gate runs sharded, logs what is not isolated, and times itself"
status: in-review
owner: product-owner
created: 2026-09-27
updated: 2026-10-03
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/144_story_the-whole-tree-run-signs-off-in-minutes/EXAMPLES.md
  - packages/work/src/commands/test.mjs
  - packages/work/src/regression-record.mjs
  - packages/work/src/grade.mjs
  - scripts/test.mjs
  - scripts/test-shard.mjs
  - scripts/test-harness.mjs
  - test/arch/grade/acd-gate-result-is-evidence.test.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
files:
  - packages/work/src/commands/regression-gate.mjs
  - packages/work/src/testing/toolchain.mjs
  - packages/core/src/application/bindings/commands/regression-gate.mjs
  - packages/core/src/application/bindings/work/toolchain.mjs
  - packages/core/src/application/assemble.mjs
  - test/fixtures/application/command-inventory.json
  - packages/work/test/status-gate.test.mjs
  - scripts/workspace-runtime-audit.json
  - wiki/work/archive/142_milestone_yarn-workspace-modularization/plans/09-test-ledger.json
  - scripts/test-sharded.mjs
  - scripts/test-sharded-report.mjs
  - .aof/aof.config.json
  - docs/acd.md
  - test/run/regression-gate.test.mjs
  - test/support/regression-gate-fixture.mjs
  - test/work/work-toolchain-declaration.test.mjs
  - test/testing/test-sharded-report.test.mjs
  - test/testing/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
---
# 144 · The whole-tree test run signs off in minutes, not half a day

## User story

As **the operator accepting a milestone**,
I want **`aof work regression-gate` to run the whole tree across worker processes, report where its
time goes, and finish in minutes**,
so that **signing off a milestone costs minutes of waiting, not a day. A slow serial run on a busy
machine will no longer produce the load flakes and deadline kills that force a rerun, or push the
door onto `--gate-override`.**

## Tasks

- [x] [00 · the gate runs the declared whole-tree program with the operator's settings](tasks/00_the-gate-runs-the-declared-whole-tree-program-with-the-operators-settings.feature)
- [x] [01 · a lost or failing case is red, and a case that is not isolated is logged](tasks/01_a-lost-or-failing-case-is-red-and-a-case-that-is-not-isolated-is-logged.feature)
- [x] [02 · the run says where its time went, and measures itself against the budget](tasks/02_the-run-says-where-its-time-went-and-measures-itself-against-the-budget.feature)

## Notes

- **Why now.** 131's sign-off (2026-09-25 to 2026-09-27) produced eight whole-tree gate rows, in
  131's `REGRESSION.md`. Two were red on real defects. Two died on one load flake each, green alone.
  Three had no verdict: a host sleep, and two kills at the runner deadline, first 1 h, then 2 h.
  131 was accepted on a recorded `--gate-override`. Operator: "It shouldn't take an hour or more to
  run tests. Something is very wrong" and "This is a major problem with testing if it takes half a
  day to sign off."
- **The measured shape (a 16-shard profile, 2026-09-26).** `scripts/test.mjs` runs 11,228 cases one at a
  time in one process on a 22-core machine, and records no timing. Split across 16 processes through
  `--only`, the whole tree took 13.8 min of wall time. 254 cases (2%) hold over half of the 7,058 s
  summed, and `test/loop` is a third of it. The heaviest files: `loop-command-wave` (735 s, 47
  cases), `loop-command-reconcile` (412 s, 18 cases), `site-build/01` (126 s, one case, a full site
  build), and the cli-bijection check (76 s, every `work:*` command as a child process). Every case
  that reddened a 131 gate row sits in this slow, process-spawning tail.
- **The runner is frozen by 53/FF-5311 (REG-MUT-11).** It digest-pins `runSuite`'s loop body, the
  loop's `finally`, the per-test global-home handling and every line of runner logic. A timing
  change committed without a grant (`457420d`) was reverted (`8b83d3a`). This story's refine owns
  the grant and the re-pin, as FF-5311's own ceiling rows provide.
- **Kept whole.** The integration lane and the cargo lane still run once, the gate's scope stays
  `all`, and a sharded run that loses a case is a failure, never a pass.
- **Scope settled at refine (2026-10-03).** Making the slow suites faster is another item's work
  (144 Q4); this story logs an overrun of the 15-minute budget (Q1) rather than meeting it. The
  sharded runner (142) already times each unit outside `scripts/test.mjs`, so no FF-5311 grant or
  re-pin is needed (Q6).
- The profile harness used on 2026-09-26 was a scratch script, not committed. It ran each file
  through `scripts/test.mjs --only` in N processes, with one isolated `AOF_GLOBAL_HOME` each.

## Feedback (for retro)

- **Write set was short by six files (build, 2026-10-03).** The gate reaches the toolchain through
  `bindings/work/toolchain.mjs` and `assemble.mjs`; the command inventory fixture pins its usage;
  `packages/work/test/status-gate.test.mjs` builds the factory directly; and every edit to a suite or
  an audited file re-stamps 142's `09-test-ledger.json` and `scripts/workspace-runtime-audit.json`.
  All six are now in `files:`. Refine should census these two pins for any story touching tests.
- **Runner-side `--strict` and the timings write are proven through `test-sharded-report.mjs`**, not
  a spawned pool (PLAN's choice); the `@manual` gate run is the end-to-end witness.
