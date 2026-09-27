@executable @cli @work @validate
Feature: How often the autonomous cascade needed a hand

  The cascade optimises items reaching done across a range without anyone watching. Its counter-metric
  is the thing that gets worse when that number is bought too cheaply: how often the run needed
  something other than itself to keep going.

  Milestone 20 already writes every fact this needs. A run record carries the attempt it is on, the
  run it is retrying, the state it reached, its outcome and, when it failed, why. A retry is an
  intervention the machine made; an exhausted attempt ceiling is one it could not make; a parked or
  resumed run is one a person made. Counting them is arithmetic over records on disk, which is what
  lets this watcher declare that a machine produces its number.

  ADR-002. FF-5707.

  Scenario: a retried run is an intervention
    Given an item whose run was retried once
    When the intervention counter runs
    Then one intervention is counted for that item

  Scenario: a clean first-attempt run is not an intervention
    Given an item whose run completed on its first attempt
    When the intervention counter runs
    Then no intervention is counted for that item

  Scenario: an exhausted attempt ceiling is an intervention
    Given an item whose run exhausted its attempt ceiling
    When the intervention counter runs
    Then an intervention is counted for that item

  Scenario: a resumed run is an intervention
    Given an item whose run was parked and later resumed
    When the intervention counter runs
    Then an intervention is counted for that item

  Scenario: a retry lineage of three attempts counts each retry
    Given an item whose run reached its third attempt
    When the intervention counter runs
    Then two interventions are counted for that item

  Scenario: interventions are attributed to the item whose run they belong to
    Given two items with one intervention each
    When the intervention counter runs
    Then each item is reported with its own count

  Scenario: the rate is reported against the runs it was computed from
    Given a range of items carrying ten runs of which two needed intervention
    When the intervention counter runs
    Then the count and the run total are both reported

  Scenario: the counter reads run records and writes nothing
    Given a work stream with runs
    When the intervention counter runs
    Then no run record is modified

  Scenario Outline: what counts as an intervention
    Given a run whose record shows <situation>
    When the intervention counter runs
    Then it <outcome>

    Examples: the machine needing another go, or a person stepping in
      | situation                       | outcome         |
      | a first attempt that completed  | is not counted  |
      | a retry of an earlier attempt   | is counted      |
      | an exhausted attempt ceiling    | is counted      |
      | a park and a later resume       | is counted      |
      | a failure that was not retryable | is counted     |
