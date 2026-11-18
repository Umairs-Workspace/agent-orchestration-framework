# 201/03 · The recorded recalls replay against the shipped block — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

One script, in three passes over a seeded sample of the ledger's recall rows.

1. **Collect.** Read every item's ledger through the ledger's own reader, keep the `recall` rows,
   drop the two edges that ask with `--all`, drop a repeated id, and take the sample with a seeded
   shuffle. The seed decides which recalls are replayed and nothing else.
2. **Replay.** For each recall, build two blocks over the index as it stands. The lexical block
   comes from the seam with no picker injected, which is exactly the path that yields the first
   five. The shipped block comes from the seam with the application's own picker, the one the CLI
   runs. Read the pick report on each result to count a degraded recall. Do not parse stderr.
3. **Judge.** Pool the records the two blocks showed, shuffle them so the judge cannot tell which
   block a record came from, and ask a judge model once per recall through story 01's one-shot
   call. Read grades back by card number, the way the pick's answer is read.

Then score and write the report. The scoring is pure arithmetic over grades, so it is a function
the tests drive with grades and no model. Keep it apart from the passes that start processes.

The judge's instruction needs a short rubric per edge, because "should change the decision" means
something different for a triage than for a build. 177 used one, and its table is per edge for
the same reason.

## Verification step

Run it for real, small: `--sample 5 --seed 177` on this project. Five picks and five judge calls,
about two minutes. Read the report. Each of the five recalls should show two blocks that differ,
a grade for every pooled record, and a direction line.

A wrong answer looks like this. Two identical blocks on every recall means the picker was not
wired and every recall degraded. A judge call that takes the pick's 20 s limit and dies means the
judge is sharing the pick's time limit, and opus needs longer: 177 measured p95 23.7 s.

## Out of scope

- Tuning the pick's instruction. If the direction does not hold at verify, that is a finding
  against story 01's instruction, routed there.
- Pooling over more candidates than the two blocks. 177 pooled six rankers; this replays two.
- Recording replay results on any ledger. A replay is not a recall edge.
- A CLI verb. It is project tooling under `scripts/`, run with `node`.

## Known traps

- A replayed query that is item-scoped cannot retrieve records from outside its item, and a
  recorded `refine-po` recall scoped to an item with no records replays as two empty blocks. Count
  it and report it. It is not a failure.
- The index has grown since each recall was recorded. Both blocks are built over the same index,
  so the comparison is fair, but the lexical block is not the block the agent originally saw.
- The judge must not see which block a record came from, or it can learn that fewer is better.
- The script starts model processes through story 01's leaf. If it adds a spawn of its own, that
  spawn owes a runtime-audit entry.
- Run it with `AOF_GLOBAL_HOME` isolated in tests. A replay over a scratch project must never
  read this checkout's ledgers.
