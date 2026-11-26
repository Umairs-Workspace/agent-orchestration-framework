# 210/03 · Gate runs twice — example map

## R1 · A milestone's gate launches the whole tree at most twice
- E1 · Milestone 17 has no gate rows. The gate launches and appends a row [proposed]
- E2 · Milestone 17 has one red row. The gate launches the confirming run and appends a second row [proposed]
- E3 · Milestone 17 has two red rows. The gate refuses as `regression-gate-runs-spent`, launches nothing, and names both rows and the hand-over [proposed]

## R2 · Rows that are not a new whole-tree launch do not count
- E4 · Milestone 17 has a red row, then a not-finished row. `--resume` completes the not-finished row, and it still counts as the second run [proposed]
- E5 · Milestone 17 has two red rows and an `override` row. The override does not open a third run [proposed]

## R4 · A third launch needs the operator's recorded confirmation
- E7 · Milestone 17 has two red rows. `aof work regression-gate 17 --again "fixed F-03"` with no recorded answer is refused as `regression-gate-confirmation-missing`, and prints the question `17 G3 · Run a third whole-tree gate for milestone 17?` [stated Q1]
- E8 · The operator answered `17 G3` with "Run gate 3". The same command launches, and its row records the reason and `17 G3` [stated Q1]
- E9 · After that third red row, `--again` with only the `17 G3` answer on record is refused. A fourth launch needs `17 G4` [stated Q1]

## R3 · A gate record's failures carry their suite
- E6 · A gate run's sharded report lists a failure in unit `test/surfaces/work-ui-verb-rename.test.mjs`. The record's failure carries that file [proposed]

## Questions
- Q1 · business · answered · When the confirming gate run is still red, how can a third whole-tree run happen for that milestone?
- Q2 · technical · defaulted ADR-007 · Is the count read from REGRESSION.md rows or from test records? From the milestone's REGRESSION.md rows.
- Q3 · technical · defaulted ADR-007 · How is the operator's confirmation read? As a harness-recorded answer to a `<ref> G<n>` question, through the one answer reader.
