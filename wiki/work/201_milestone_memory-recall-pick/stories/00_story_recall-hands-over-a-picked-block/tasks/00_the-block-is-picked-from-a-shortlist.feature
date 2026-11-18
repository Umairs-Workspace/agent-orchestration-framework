@executable @cli @work @memory
Feature: The block is picked from a shortlist

  WHY. Today's block is the ranker's first five, and 177 measured two of them as noise on average.
  The ranker stays, as a shortlist of 20, and a picker chooses at most 5 from it or none
  (ADR-001, ADR-002). The picker here is a stub handed to the seam. Story 01 supplies the model.

  Background:
    Given a memory index in which 60 records match the query "worktree junction"
    And a picker stub that records the cards it is handed and answers as each scenario says

  Rule: R1 · A block is what a picker chose from the 20 best-ranked records in scope: at most 5, or none

    Scenario: E1 · the picker is handed the 20 best-ranked records, and the block is what it picked
      Given the picker answers cards 7, 2 and 15
      When "aof memory recall 'worktree junction' --block" runs
      Then the picker was handed 20 cards, numbered 1 to 20 in rank order
      And the block is 3 lines: the records ranked 7th, 2nd and 15th, in that order
      And each line ends with its record's "path:line"

    Scenario: a card carries what the picker needs to judge a record
      When "aof memory recall 'worktree junction' --block" runs
      Then each card carries its record's block line and its text
      And a record whose text is 4,000 characters long is handed over as its first 1,500
      And the picker is handed the query "worktree junction"

    Scenario: E3 · scope is applied before the shortlist
      Given 12 of the 60 matching records are findings
      When "aof memory recall 'worktree junction' --kind finding --block" runs
      Then the picker was handed 12 cards, every one a finding

    Scenario: E5 · a pick of nothing prints nothing
      Given the picker answers "[]"
      When "aof memory recall 'worktree junction' --block" runs
      Then stdout is empty
      And stderr is empty
      And the exit code is 0

    Scenario: E6 · an empty shortlist asks no picker
      When "aof memory recall 'no record says this' --block" runs
      Then stdout is empty
      And the picker was not asked

    Scenario Outline: the shortlist and the cap, at their edges
      Given <matching> records match the query
      And the picker answers <answer>
      When "aof memory recall 'worktree junction' --block" runs
      Then the picker was handed <cards> cards
      And the block is <block>

      Examples:
        | example | matching | answer                   | cards | block                                      |
        | E2      | 3        | "[1, 3]"                 | 3     | the records ranked 1st and 3rd             |
        | E4      | 60       | "[9, 8, 7, 6, 5, 4, 3, 2]" | 20  | the records ranked 9th, 8th, 7th, 6th, 5th |
        |         | 20       | "[20]"                   | 20    | the record ranked 20th                     |
        |         | 21       | "[20]"                   | 20    | the record ranked 20th                     |
        |         | 60       | "[4, 4, 99, 2]"          | 20    | the records ranked 4th and 2nd             |
        |         | 60       | "Here: [2, 5]. Done."    | 20    | the records ranked 2nd and 5th             |
        |         | 60       | "[0, -1, 3]"             | 20    | the record ranked 3rd                      |

    Scenario: the result says how the block was made
      Given the picker answers cards 7 and 2
      When the seam's recall runs in process with the block asked for
      Then the result's keys are exactly "query", "scope", "records" and "text"
      And its pick report says mode "model", no code and 20 shortlisted
