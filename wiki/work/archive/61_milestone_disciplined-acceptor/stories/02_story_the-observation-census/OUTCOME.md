# 02 · The observation census — Outcome

## Delivered

### Every population the acceptor counts declares what it read, against a floor
Each population is emitted with a declared read record and a floor, driven from the lane registry —
so a lane added without one fails rather than passing silently over nothing, and a sweep that read
nothing says so instead of returning a confident zero.

### Test fixtures are excluded and dispatch worktrees fold into their parent, in ONE home
`src/work-acceptor/observations.mjs` is the only module in `src/` that classifies a fixture `itemDir`
or a dispatch worktree. It derives the dispatch case from `src/mesh-worktree.mjs`'s exported
predicate and slug rather than spelling `dispatch-worktrees` a second time, and a worktree nested
inside a worktree folds all the way home rather than half-way.

### A census that filtered nothing is a finding rather than a count
Below its floor the census reports a finding. The read record, the floor discipline and the problems
list are imported from the audit family's zero-import leaf (`src/work-audit/reads.mjs`) rather than
re-spelled, so the acceptor's shape and the auditor's cannot drift; only the finding code differs,
because that code is the auditor's.

## Assumptions

- **The floors are half the counts measured on 2026-08-30**, after the dispatch collapse — a floor
  is a tripwire for a sweep that stopped seeing, not a target, so it sits below the observed level
  rather than at it.
- **This module counts and says what it counted; it does not decide what an observation means, price
  it, or rule on it.** Its independence from the rule, the ledger and the command surface is what let
  it build in stage 1.
