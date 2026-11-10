Feature: Recall returns an item's whole episodic history and renders a run's failure

  WHY. A retry and a retrospective need every record an item holds, not the top five the block
  shows by default, and a failed run's block line is useless without the reason it failed.
  ADR-003 gives recall the already-parsed "--all", puts an episodic record's summary on its block
  line, and keeps every lesson-only consumer exactly as it was.

  THE FIXTURE: the task 00 store, plus 4 more findings on milestone "39" so it holds 12 delivery
  records, one of them a failed run with failureReason "cap-exhausted".

  Rule: R2 · A recall returns an item's whole episodic history when asked

    @executable @cli @work @memory
    Scenario: E3 · --all returns every scoped record
      When "aof work memory recall \"\" --item 39 --area delivery --all --json" runs
      Then it returns 12 records
      And each carries the frozen record fields plus "score"

    @executable @cli @work @memory
    Scenario Outline: E4 · without --all the limit still applies
      When "aof work memory recall \"\" --item 39 --area delivery <flags> --json" runs
      Then it returns <count> records

      Examples:
        | example | flags              | count |
        | E4      |                    | 5     |
        |         | --limit 3          | 3     |
        |         | --limit 3 --all    | 12    |

    @executable @cli @work @memory
    Scenario: E5 · a failed run's block line shows its failure reason
      When "aof work memory recall \"cap-exhausted\" --item 39 --kind run --block" runs
      Then the run's line holds "cap-exhausted", its kind, its area and its tags
      And the line's last field is its source

    @executable @cli @work @memory
    Scenario: an ingest with --all still rebuilds the whole stream
      When "aof work memory ingest --all" runs
      Then the whole stream is rebuilt exactly as before this change

  Rule: R3 · Indexing episodes changes no lesson-only consumer

    @executable @cli @work @memory
    Scenario: E6 · tune counts each lesson once over an ingested stream
      Given the stream's tune corpus is assembled with no memory index
      When the memory index is ingested with 3 findings, 2 feedback and 3 runs and the corpus is assembled again
      Then its lesson population, lineage counts and recall accounting are equal to the first assembly

    @executable @cli @work @memory
    Scenario: E7 · a lesson's block line is unchanged
      Given a lesson "R2" on milestone "39" and its block line rendered before this change
      When "aof work memory recall \"<the lesson's title>\" --item 39 --block" runs
      Then the lesson's line is byte-identical to the line rendered before

    @executable @cli @work @memory
    Scenario: lesson recurrence never matches an episodic record
      Given a finding on milestone "41" whose text repeats lesson "39/R2" word for word
      When "aof work memory recurrence \"<that text>\" --json" runs
      Then it matches "39/R2" and no finding record
