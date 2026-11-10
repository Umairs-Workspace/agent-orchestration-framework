# 160/05 · The runner enforces the budget, and a timeout is not-finished — build plan

## Mechanism

Three layers, one verdict.

**The declaration.** The gate declaration compiles `budgetArgs` beside `jobsArgs`, with the same
token rule, `{minutes}` expanding exactly once. `gateToolchain` appends the expanded vector when the
launch is sharded and a budget is declared. A `--serial` launch gets neither the vector nor the
budget deadline (160/05 Q2). The gate sets the launch deadline to the budget plus two minutes on a
sharded run.

**The pool.** It is extracted in story 04 and already stops on stdin end. Give it a deadline from
`--budget-min`. When the deadline passes, it kills the in-flight units, starts none of the queued
ones, and skips the retries (160/05 Q1). It also marks a unit killed at `--unit-timeout-min` as
not-finished rather than failed, and never retries one. The report module, already pure and
already tested without a pool, prints `# not finished - <unit key>` for each such unit and
`# not started: <n> units`. It exits non-zero. Only `not ok` lines stay failures: the TAP reader
skips `#` comments, so `aof test` counts no failure for a timeout.

**The row.** `GATE_RESULTS` gains `not-finished`. The gate reads the program's `# not finished`
lines (beside `# not isolated`) and its own launch outcome (`deadline-expired`). It then applies
ADR-006 §4's precedence: red over not-finished over green. The door's refusal for a not-finished
row has its own code and its own repair text. The verify prose learns the word, so a verify never
routes a not-finished row to repair.

## Verification step

Run the gate twice on this checkout, with `AOF_GLOBAL_HOME` isolated and from a clean detached
worktree. First with a deliberately tiny budget (`budgetMinutes: 1` in the worktree's config): the
row must be `not-finished`, name the in-flight units, and leave no unit process behind. Then with
the real budget: record the row and its wall time in VERIFICATION. A real run over 10 minutes is a
`not-finished` row, which is the milestone's open risk recorded in STATE, not this story's defect.

## Out of scope

- Making the suite fit the budget: stories 00–03 and 06, measured at the milestone gate.
- Rewording 144's delivered feature: it is immutable. Its pinned cases change as code.
