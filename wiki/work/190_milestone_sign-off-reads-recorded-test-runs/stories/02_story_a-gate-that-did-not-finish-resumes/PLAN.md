<!-- Build brief — advisory, the builder's alone. The task features are the contract. -->
# 190/02 · A gate that did not finish resumes — build plan

## Mechanism

Two seams, one on each side of the process boundary the gate already has.

- **In `scripts/test-sharded.mjs`:** add a `--files <list file>` input. It narrows the plan to the
  named suite files before packing and splitting, plus `--lanes` / `--no-lanes`, which exists
  already. The report already names `notFinished` and `notStarted` by unit key, and every unit key
  resolves to its files (packed units name each file). So the resume list is the files of those
  units. A plan for a named list still runs the assignment census over that list only, and refuses
  a named file that registers no case.
- **In `packages/work/src/commands/regression-gate.mjs`:**
  - on a `not-finished` end, store the sharded report JSON beside the run's ADR-001 record, through
    the record leaf;
  - on `--resume`, read the newest row, check it is `not-finished`, compute the clean tree's key,
    load the stored report with the same key, launch the sharded run with `--files`, then merge the
    finished units' results with the new ones;
  - write one row, and on any finished run, one ADR-001 record of scope `all`.

The merge is `scripts/test-sharded-report.mjs`'s verdict over the union. Do not write a second
verdict function, because the report module is already the pure one (144).

## Verification step

On a scratch clone with an isolated `AOF_GLOBAL_HOME`:
1. run `aof work regression-gate <NN> --budget-min 1` so it stops `not-finished`;
2. run `--resume` with no budget. The appended row's detail says `resumed from <instant>: n of m`,
   and the resumed run's `# planned` line counts only those units;
3. `git commit --allow-empty`, then `--resume` again. It refuses, tree changed.

A wrong result looks like a resumed run whose plan is the whole tree. That means `--files` was
ignored.

## Out of scope

- Resume on CI — the runner's git dir is gone after the job (STORY Notes).
- Checking the gate's commit against the accepted head — RESEARCH Q5, a later item.
- Any change to the accept door.

## Known traps

- A packed unit is one process over several files. If it was killed, every file in it is
  unfinished, including the ones whose `# file` line printed before the kill. Resume those too,
  rather than trusting a partial unit.
