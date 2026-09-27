@executable @cli @work @work-stream
Feature: Cap exhaustion carries the record it could not close, not an empty list

  `src/commands/loop.mjs:494` reports a cap-exhausted halt with a hardcoded `findings: []`. That is
  the SPEC's *"stop-and-flag"* delivered as a stop with nothing flagged: the loop tried its bounded
  number of times, failed to close, and then threw away the only account of what it could not close.
  An operator reading that halt learns the cap was reached and nothing else.

  **"Accumulated" means the union over the loop's OWN runs, keyed by `loopRunId`** — the one
  genuinely open question RESEARCH left, ruled here. `53/ADR-004` already says a loop's aggregate
  history *"is a query over run records rather than a single document"* and that `loopRunId` makes it
  *"a one-key filter"*. So this builds no store, no document and no second aggregation: it filters
  the runs this loop minted and unions the grades their briefs already carry (task 00).

  **The exhausting cycle has no successor run to ride**, which is precisely why the halt must carry
  the final record itself: there is no re-drive to hand it to. Everything earlier in the loop is on a
  run record; the last grade would otherwise exist nowhere.

  The halt itself is unchanged — the same `cap-exhausted` stop, the same producer, no new stop id.
  What changes is that the report beside it says what happened.

  ADR-008 §4; `53/ADR-004`; `53/ADR-016`.

  Scenario: the exhausted halt reports the record instead of an empty list
    Given a loop whose story failed its gate on every cycle up to the cap
    And a grade recorded on each of those cycles
    When the cap is reached
    Then the loop halts on `cap-exhausted`
    And the halt's report carries the accumulated record
    And the record is not empty

  Scenario: the final cycle's own grade is in the record
    Given a loop at its last permitted cycle
    And a grade on that cycle that returned `fail`
    When the cap is reached
    Then that grade is present in the accumulated record
    And it is present even though no successor run was started to carry it

  Scenario: accumulation is the union over this loop's runs, keyed by its own loop run id
    Given a loop that graded three cycles on one story
    When the cap is reached
    Then the accumulated record covers all three cycles
    And it was assembled by filtering run records on this loop's own id
    And no new store, document or aggregation was written to disk

  Scenario: another loop's runs on the same item are not in this loop's record
    Given an earlier loop over the same story that recorded two failing grades
    And a later loop that reaches its cap after one failing grade
    When the later loop halts
    Then its accumulated record carries only its own cycle
    And the earlier loop's grades are absent

  Scenario: an exhausted loop that graded nothing reports an honest empty record
    Given a repository that declares no `work.rubric`
    And a loop whose story failed its validate gate on every cycle up to the cap
    When the cap is reached
    Then the halt carries the validate findings it accumulated
    And it fabricates no grade
    And an item that was never graded contributes nothing rather than a fictional entry

  Scenario: the stop, its producer and the refusal set are unchanged
    Given a loop that reaches its cap
    When it halts
    Then the stop reads `cap-exhausted`
    And its producer is the one it reports today
    And no stop id was minted for exhaustion
    And the loop refusal set is unchanged

  Scenario: the record survives the process that produced it
    Given a loop that reached its cap and halted
    When the item's run records are read in a fresh process
    Then every cycle's grade is still readable from the runs this loop minted
    And the accumulated record can be rebuilt from them without the halted process
