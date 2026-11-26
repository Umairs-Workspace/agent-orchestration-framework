# 210/03 · Gate runs twice — build plan

## Mechanism

The gate already reads the milestone's `REGRESSION.md` rows through `regression-record.mjs` before
it launches (resume needs the newest not-finished row). Add one count beside that read: rows that
recorded a launched run. Skip `override` rows. Collapse a row that `--resume` completed into the
not-finished row it resumed, so each launched run counts once. Check the count before the
dirty-tree and toolchain checks, and before anything spends a minute. When it is 2 or more, refuse
as `regression-gate-runs-spent`. The refusal names the two rows (commit, result) and the hand-over:
a `STATE.md` blocker, or in a driven session the loop's question. `--resume` of a not-finished row
is still allowed, because it finishes a counted run rather than starting one.

**`--again "<reason>"`** (210/03 Q1) applies only when the count is spent. With `n` = count + 1,
collect the milestone's harness answers through the answers binding's `collectAnswers`. Do not read
a transcript in the gate (FF-13401). Honour the flag only for an answer whose token is
`<ref> G<n>` and whose text is `Run gate <n>`. Otherwise refuse with the exact question line to
ask. Widen `TOKEN_ID` and `TOKEN_AT_HEAD` in the map grammar from `[EQ]` to `[EQG]`. A `G` token is
never an example-map claim, so the map parser's claim builder ignores it. The honoured row's detail
carries the reason and the token.

**Attribution:** the gate builds its record's failures from the sharded report. Map each
`failures[].unit` onto its cases as `{ case, message, file: unit }`. A failure the report gives no
unit for keeps `file: null`.

## Verification step

Use the regression-gate fixture with a stub runner. Write two red rows for milestone 17 and invoke
the gate: no runner launch, the coded refusal, and both rows named. Add an `override` row, and the
answer is the same. Then a red row plus a not-finished row: `--resume` launches. Check a written
record's failures carry the units.

## Out of scope

The gate's program, sharding, budget and accept door. `aof test --all`'s own refusal (04). Fix
rounds from a gate red (05).
