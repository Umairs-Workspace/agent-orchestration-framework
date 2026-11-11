# 144 · The whole-tree test run signs off in minutes — example map
<!--
Drafted at refine's discovery beat (134's live run, 2026-10-02). Every example is the PO's until a
person's recorded answer to its token says otherwise.
Measured at drafting: `scripts/test-sharded.mjs` exists since 142 (16 workers, longest-first,
failed unit re-run once alone); `aof work regression-gate` still runs the serial `aof test --scope all`,
so 142, 133 and 131 were accepted on `--gate-override` rows citing a sharded run.
-->

## R1 · The gate's whole-tree run finishes in minutes on the operator's machine
- E1 · ~11,600 registered cases: the whole-tree sign-off finishes inside 15 min; slower is a defect [stated Q1]
- E2 · The real gate over this repo from a clean worktree: every registered case executes and the row records its wall time [proposed]

## R2 · A run that loses a case is a failure, never a pass
- E3 · One registered case maps to no suite file: no unit runs, and the gate row is red and says so [proposed]
- E4 · A case is red in the pool and green re-run alone: it is logged as a test that is not isolated [stated Q2]
- E5 · A case is red in the pool and red again alone: the gate row is red and names it [proposed]

## R3 · The gate row is written by the run itself, so a green run needs no override
- E6 · `aof work regression-gate 134` on a clean checkout runs sharded and appends a `all | green` row [proposed]
- E7 · A dirty checkout: refused, naming what is dirty, and no suite runs [proposed]
- E9 · The gate run takes its settings (how it runs, how many workers) from what the operator passes in [stated Q3]

## R4 · The run says where its time went
- E8 · The report lists the slowest files with their summed seconds and case counts [proposed]
- E10 · A green run that took 24.1 min against the 15 min budget: the row stays green and logs the overrun [proposed]

## Questions
- Q1 · business · answered · What is the longest a whole-tree sign-off may take? (no more than 15 min)
- Q2 · business · answered · What happens to a test that fails under load and passes alone? (logged: it is not isolated)
- Q3 · business · answered · Should the sign-off command run the tests in parallel? (it takes settings passed in)
- Q4 · business · answered · Is speeding up the slowest test files part of this story? (no: another item optimizes them)
- Q5 · technical · defaulted scripts/test-sharded.mjs · How many workers by default (cores − 4, at most 16)?
- Q6 · technical · defaulted scripts/test-sharded.mjs · Does per-case timing need a granted 53/FF-5311 re-pin of the serial runner? (no: the sharded runner times each unit outside the pinned runner)
