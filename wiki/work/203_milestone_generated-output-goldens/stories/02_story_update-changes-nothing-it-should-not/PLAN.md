# 203/02 · Update changes nothing it should not — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

One new capability and one lane.

**The rebuild** (`baseline-store.mjs`, beside materialisation). `rebuild(laneScenario, ctx)`
materialises the committed baseline (ADR-003 §2). It fills `<project>`, `<home>`, `<version>`,
`<build-id>` and `<timestamp>` with the run's values, then recomputes every `sha256:<hash>` in the
lock's `work.files[]` and in the journal from the rebuilt file at that entry's path, using
`hashContent` from `packages/core/src/lock.mjs`, the function that wrote them. Before that, it
checks the drift guard. The stored hashes are placeholders, so drift is read from the step record:
a baseline whose step reported a drift-warning is refused, and so is a lock entry whose file the
baseline lacks. It returns a `Map<path, text>` and writes nothing.

**The lane** (`test/golden/work-update.lane.mjs`). A scenario's starting `files` may be a function
of the rebuild, which is how both scenarios start. The harness already writes starting files
before the first step, so it needs no new step kind:

- `customised-update`: `rebuild("work-init/customised")`, plus the appended line and the new user
  file. Then `work update`.
- `upgrade`: `rebuild("work-init/default")`, plus the three mutations, the lock edited to match
  each. Then `work update`.

Idempotence is not a scenario. `work-update.test.mjs` reads `work-init`'s scenarios from its lane
module, runs each with an extra `work update` step, and compares the files only against that
scenario's committed baseline. It asserts the update's summary separately, because the extra step
would otherwise diff the step records.

Write the two baselines once with `node scripts/golden.mjs --lane work-update --update`. Before
committing, read the `upgrade` delta: it must hold `steps.golden` and no project file (E10).

## Verification step

Measured at refine on a fresh init: the three mutations update to exactly 1 created, 1 updated,
1 deleted and 230 skipped, and the tree then equals a fresh init. The lock holds the same 232
paths in the same order, and only its instants differ. Reproduce that through the rebuild. If the
`upgrade` delta stores `.aof/aof.lock.json.golden`, the rebuild or the lock's order differs from
init's, and that is a finding, not a baseline to accept.

Task 03 (amended at verify, 2026-11-21) shapes every committed scenario as a Windows capture would
hold it, and normalises it back to its baseline, on any OS.

## Out of scope

- A frozen snapshot of a past release, or git history, as the previous tree (ADR-006, alternatives).
- Changing update's drift or ownership rules. The lane holds them as they are.
- 207's own "empty diff" run. It uses this rebuild, in its own item.

## Known traps

- The rebuilt lock must keep the baseline's entry order. Recompute hashes in place and never
  re-sort, or the upgrade's lock diff is self-inflicted.
- Codex outputs carry recorded ownership (`codex-output-conflict` refused a force in 192/02). A
  mutation on a codex path would meet those rules. Keep the three mutations on `.claude/` paths, as
  measured.
- Two new files under `test/golden/` move that directory's row in `acd-source-directory-budget`
  again, after story 01's move.
