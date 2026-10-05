@executable @cli @work @memory
Feature: The retrieval eval holds each pair within the first five ranks and names the pair it loses

  WHY. An agent at a declared edge is shown the first five recalled records (the "--block"). A
  change that pushes a lesson to sixth hides it from every later recall, and nothing fails. The
  eval (ADR-005) runs a fixed table of pairs through "rankRecords" and reports each pair as held,
  lost or gone. This feature pins the runner on small record sets; task 01 runs it over the live
  corpus.

  THE FIXTURE BELOW: a record set of frozen MemoryRecords built for each scenario, and the pair
  "pin line endings" with no scope, expecting "01/R2" (the record with item "01" and id "R2").

  Scenario: a pair whose record ranks within the first five is held
    Given a record set in which the query "pin line endings" ranks "01/R2" third
    When the eval runs the pair
    Then the pair is reported held at rank 3
    And the eval passes

  Scenario Outline: the pass line is the fifth rank
    Given a record set in which the query "pin line endings" ranks "01/R2" at rank <rank>
    When the eval runs the pair
    Then the pair is reported <verdict>

    Examples:
      | rank | verdict |
      | 1    | held    |
      | 5    | held    |
      | 6    | lost    |

  Scenario: a lost pair is named with its query and the rank it was found at
    Given a record set in which the query "pin line endings" ranks "01/R2" seventh
    When the eval runs the pair
    Then the eval fails
    And its message names "01/R2", the query "pin line endings" and rank 7

  Scenario: a record the ranking never returns is lost, not held
    Given a record set holding "01/R2" whose text shares no term with "pin line endings"
    And six other records that each match the query
    When the eval runs the pair
    Then the pair is reported lost

  Scenario: a pair whose record is gone fails as gone, not as lost
    Given a record set holding no record with item "01" and id "R2"
    When the eval runs the pair
    Then the pair is reported gone
    And the eval fails with a message that says "01/R2" is not in the corpus

  Scenario: an id that recurs in another item does not hold the pair
    Given a record set in which "07/R2" ranks first for "pin line endings" and no record is "01/R2"
    When the eval runs the pair
    Then the pair is reported gone

  Scenario: a pair is ranked under the scope it was recorded with
    Given the pair "requiring grep fitness function smell" with scope area "architecture", expecting "01/R1"
    And a record "02/R9" in area "process" that would rank first with no scope
    When the eval runs the pair
    Then "02/R9" is not among the ranked records
    And the pair is reported held at rank 1

  Scenario: the eval fails under a ranker that reverses the base ranking
    Given a record set of twelve records, the expected record ranking first for its query
    When the eval runs the pair with a ranker that returns the base ranking reversed
    Then the pair is reported lost

  Scenario: building the live record set writes no memory index
    Given an isolated "AOF_GLOBAL_HOME"
    And a copy of a project whose ".aof" holds no memory index file
    When the eval builds its record set from that project's "wiki/work" and runs
    Then the project's ".aof" holds no "aof.memory.index.json" and no "aof.memory.graphify.index.json"
