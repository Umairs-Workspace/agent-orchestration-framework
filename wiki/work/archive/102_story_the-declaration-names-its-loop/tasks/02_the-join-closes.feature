@executable @cli @work @work-stream
Feature: The join closes — built by the producer, minted, read back, and joined by the reader

  78's finding is not that the join is wrong; it is that the join can only ever be exercised by
  FIXTURES. `declarationOf` (`src/loop-record.mjs:78-82`) requires `brief.loop.id`, nothing in the
  repository writes it, and every green test on that path hands the reader a literal it wrote
  itself. So nothing in the suite would have noticed if the producer had never existed — which is
  precisely what happened.

  **No scenario here writes a `brief.loop` literal by hand.** The record under test is built by
  `buildLoopDeclaration`, minted through the run store's own verb, read back through `readRuns`, and
  joined by `projectExecution` — the real four, end to end. That is the only shape of test that
  could have caught F-78-A, and it is what discharges 78's `OUTCOME.md` gap in its own words:
  *"`buildLoopDeclaration` mints a registry-resolvable loop id into the declaration envelope, and at
  least one run record on disk carries it."*

  **Zero is a measurement, never an absence (78/ADR-003), and that survives.** Measured at this
  refine, over this repository: 64 run records under `wiki/work`, 3 carrying a `sessionId`, **0**
  carrying any `brief.loop`. Those 61-plus records do not disappear and do not error once the
  producer lands — they stay counted in `runsFound` and absent from `runsCarryingDeclaration`, so
  the ratio falls between zero and one and an operator can see how much of an item's history
  predates the instrument.

  **The run record's own key set does not move.** The declaration rides the `brief` bag, which the
  store persists opaque and verbatim (`src/run-store.mjs`), so the record's sixteen keys, their
  order and the transition edges are untouched by this story — the same restraint 53 kept.

  Scenario: a declaration survives the round trip through the store
    Given a declaration built by the engine carrying the loop id
    When a run is minted with it as its brief and then read back from disk
    Then the run's `brief.loop.id` is byte-identical to the built declaration's
    And every other key of the declaration is byte-identical too
    And no key was reshaped, added or dropped by the store

  Scenario: the projection joins a run the producer really wrote
    Given an item whose only run carries a declaration built by the engine
    When the execution is projected for that item
    Then `runsFound` is 1 and `runsCarryingDeclaration` is 1 and the ratio is 1
    And exactly one engagement is reported
    And its `loop` is the id the producer wrote
    And its `declared` is true, because a registry record declares that id

  Scenario: the loop is no longer reported as never having run
    Given the registry that declares the shell's loop
    And an item with a run carrying that loop's id
    When the execution is projected
    Then `declared-never-ran` does not name that loop
    And it still names every declared loop that no run carried

  Scenario: an id the registry does not declare is reported, not refused
    Given an item whose run carries a declaration naming a loop no registry record declares
    When the execution is projected
    Then the projection returns normally — no error is raised
    And the engagement's `declared` is false
    And `ran-undeclared` names that id

  Scenario: a run minted before the producer existed is counted, never dropped
    Given an item with one run carrying a declaration and one run whose brief is empty
    When the execution is projected
    Then `runsFound` is 2 and `runsCarryingDeclaration` is 1 and the ratio is one half
    And one engagement is reported, built from the carrying run alone
    And the empty-brief run raises no error and invents no engagement

  Scenario: two invocations over one item are two engagements
    Given two runs on one item carrying the same loop id under different loop run ids
    When the execution is projected
    Then two engagements are reported
    And both name the same loop
    And neither engagement absorbed the other's runs

  Scenario: the run record shape is untouched
    Given a run minted with a declaration carrying the loop id
    When the record is read back
    Then its key set is exactly the sixteen the store already froze, in that order
    And the declaration is inside `brief`, which the store never reshaped

  Examples:
    | runs on the item                        | runsFound | carrying | ratio | engagements |
    | one carrying, none empty                | 1         | 1        | 1     | 1           |
    | one carrying, one empty brief           | 2         | 1        | 0.5   | 1           |
    | none carrying, three empty briefs       | 3         | 0        | 0     | 0           |
    | two carrying under two loop run ids     | 2         | 2        | 1     | 2           |
    | two carrying under one loop run id      | 2         | 2        | 1     | 1           |
