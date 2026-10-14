Feature: R4 · Recall preserves separate sources and reflects the next full rebuild

  @executable @cli @adapter @memory
  Scenario: E9 · A known duplicate remains visible beside the repository records
    Given an isolated corpus with the junction auto-memory lesson and matching work records
    And the work records have identities "45/R13", "68/R10" and "72/ADR-007"
    And memory.sources is ["claude-auto-memory"]
    When I ingest and recall "junction" without an item filter and with limit 20
    Then all four distinct records appear
    And the operator record cites its absolute source while the work records retain their own sources

  @executable @cli @adapter @memory
  Scenario: E10 · Deleted source entries disappear on rebuild
    Given whole-stream ingest indexed "keep.md" and "remove.md" from the enabled source
    When "remove.md" is deleted and I ingest the whole stream again
    Then "remove.md" has no record and "keep.md" still has one
    And existing work records remain

  @executable @cli @adapter @memory
  Scenario: E11 · Disabling and rebuilding removes only adapter contributions
    Given whole-stream ingest indexed eligible operator entries beside baseline work records
    When memory.sources becomes [] and I ingest the whole stream again
    Then no operator auto-memory record remains
    And the ordered baseline records equal the source-disabled baseline

  @executable @cli @adapter @memory
  Scenario Outline: Rebuild follows edits without accumulating stale records
    Given "entry.md" was indexed as a feedback reminder containing "old instruction"
    When its source changes to <change> and I ingest again
    Then the source contributes <count> records
    And <outcome>

    Examples:
      | change                                         | count | outcome                                                     |
      | feedback with body new instruction              | 1     | the same id cites the updated text without old instruction    |
      | project with body new instruction               | 1     | the same id has tags [project] and kind near-miss               |
      | reference with body old instruction             | 0     | no operator record for entry.md remains                      |

  @executable @cli @adapter @memory
  Scenario: A scoped rebuild preserves the existing work-item-only behavior
    Given eligible auto-memory entries exist and memory.sources is ["claude-auto-memory"]
    And work items 45 and 68 each have a lesson
    When I run "aof work memory ingest --item 45 --json"
    Then only work-item 45 records are indexed
    And no operator auto-memory record or work-item 68 record is included

  @manual @cli @adapter @memory
  Scenario: The measured live junction example is reproducible on the owning node
    Given the verifier uses an isolated AOF global home on the node holding the junction entry
    And the local work corpus contains the recorded lessons for items 45 and 68 and the decision for item 72
    When the verifier builds source-enabled records in memory for the existing workspace without persisting an index
    And recalls "junction" over those records with a limit covering all matches
    Then evidence names the operator record and the three work records with their distinct locators
    And evidence confirms the operator record retains why and how-to-apply without copying its personal body into the work stream

  @manual @docs @work @memory
  Scenario: The operator can enable and undo the source using the memory guide
    Given wiki/memory.md documents the optional sources setting, supported types and fixed kind mapping
    And it explains the selected local Claude directory, full versus scoped ingest and node-local availability
    When the verifier follows its enable, ingest, recall, disable and re-ingest example in an isolated workspace
    Then operator lessons appear while enabled and disappear after the disabled full rebuild
    And the guide explains read-only source ownership, no deduplication and the need to promote worker-required knowledge
