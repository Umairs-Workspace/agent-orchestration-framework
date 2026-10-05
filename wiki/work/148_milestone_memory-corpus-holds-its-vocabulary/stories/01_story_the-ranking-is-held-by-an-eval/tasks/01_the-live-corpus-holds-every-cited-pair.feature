@executable @cli @work @memory
Feature: Over the live corpus, every cited pair keeps its record within the first five

  WHY. The milestones after this one add records to the ranked pool, and story 03 adds about 284
  lessons. FF-14801 runs the eval of task 00 over records built in memory from this repository's
  own "wiki/work", so a change to the pool or the ranking that loses a pair turns it red where the
  change is made (ADR-005). Each pair is drawn from a recall an item already recorded, and says
  which one.

  Scenario: the table holds at least twenty pairs, the two from the origin first
    When the eval's pair table is read
    Then its first pair is the query "content addressed hash cross platform" expecting "01/R2"
    And its second pair is the query "fitness function asserts a symbol appears in a file" expecting "01/R1"
    And it holds at least 20 pairs
    And no two pairs share the same query and scope

  Scenario: every pair cites the recall it was drawn from, by item ref
    When each pair's "from" is resolved
    Then it names an item ref that "aof work find" resolves, live or archived
    And a document of that item whose text contains the pair's expected id

  Scenario: every pair is held over the live corpus
    Given the record set built in memory from the repository's "wiki/work" under an isolated "AOF_GLOBAL_HOME"
    When the eval runs every pair
    Then every pair is reported held

  Scenario: the eval is registered where the arch runner finds it
    When the arch test index under "test/arch/memory" is read
    Then it imports and spreads the suite "acd-memory-retrieval-eval.test.mjs"
