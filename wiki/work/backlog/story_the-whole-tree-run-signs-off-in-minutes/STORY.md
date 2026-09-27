---
type: story
number:
slug: the-whole-tree-run-signs-off-in-minutes
title: "The whole-tree test run signs off in minutes, not half a day — per-case timing, sharded workers, and the slow tail trimmed"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
schema: 1
aofVersion: 0.1.0
---
# The whole-tree test run signs off in minutes, not half a day

## User story

As **the operator accepting a milestone**,
I want **`aof work regression-gate` to run the whole tree across worker processes, report where its
time goes, and finish in minutes**,
so that **signing off a milestone costs minutes of waiting, not a day. A slow serial run on a busy
machine will no longer produce the load flakes and deadline kills that force a rerun, or push the
door onto `--gate-override`.**

## Tasks

<!-- Authored by `aof:refine` after promotion. Proposed partition:
     (1) per-case timing in the runner, with a granted 53/FF-5311 re-pin;
     (2) a sharded whole-tree run that `aof work regression-gate` uses;
     (3) the slow tail trimmed. -->

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
- The profile harness used on 2026-09-26 was a scratch script, not committed. It ran each file
  through `scripts/test.mjs --only` in N processes, with one isolated `AOF_GLOBAL_HOME` each.
