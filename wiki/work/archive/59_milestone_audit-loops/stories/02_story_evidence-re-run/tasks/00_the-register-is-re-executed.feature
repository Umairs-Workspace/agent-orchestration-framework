@executable @cli @work @validate
Feature: The recorded evidence is executed, and the register is confirmed or contradicted by what happened

  A milestone's fitness register says, row by row, which control enforces which invariant and what
  result it had. Today that row is read. It was also written by the same run that produced the thing
  it certifies, which is precisely the arrangement this milestone exists to stop trusting.

  So the rows are re-run. Each row's control is resolved to a file, the file is executed in a bounded
  child process by something that did not write it, and the row is then confirmed by what the child
  did or contradicted by it. A row that says GREEN over a control that fails is the finding this lane
  exists to produce, and it is reported against the item whose register makes the claim.

  ADR-002 §2, §3. FF-5906.

  Scenario: a row whose control passes is confirmed
    Given a fitness register row recording a green result
    And the control it names passes when it is run
    When the evidence lane runs
    Then the row is reported as confirmed
    And the report says that the control was executed, not read

  Scenario: a row claiming green over a control that fails is contradicted
    Given a fitness register row recording a green result
    And the control it names fails when it is run
    When the evidence lane runs
    Then the row is reported as contradicted
    And the finding is anchored on the item whose register makes the claim
    And the finding carries the message the control actually produced

  Scenario: the verdict is not reachable from the register alone
    Given a fitness register row recording a green result
    And no result from running its control
    When the evidence lane runs
    Then the row is not reported as confirmed
    And it is reported as unrunnable instead

  Scenario: every row in the register is accounted for
    Given a fitness register holding several rows
    When the evidence lane runs
    Then every row is reported with a verdict of its own
    And no row is silently skipped

  Scenario: a control cited by more than one row is run for each row it is cited by
    Given two fitness register rows naming the same control
    When the evidence lane runs
    Then both rows receive a verdict
    And neither row's verdict is inferred from the other's

  Scenario: the item's own scope is respected
    Given a stream holding several items with fitness registers
    When the evidence lane runs scoped to one item
    Then only that item's rows are re-run
    And the report says which item it read

  Scenario: an item with no fitness register is reported as having none
    Given an item that declares no fitness register
    When the evidence lane runs over it
    Then it is reported as declaring no controls
    And it is not reported as clean
