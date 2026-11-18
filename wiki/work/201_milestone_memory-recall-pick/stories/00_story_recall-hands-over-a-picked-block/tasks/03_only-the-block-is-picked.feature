@executable @cli @work @memory
Feature: Only the block is picked

  WHY. The pick is for the block a prompt pastes into an agent's context. Hooks read
  `recall --json`, a retry reads an item's whole history with `--all`, and `recurrence` and
  `status` read every record. Each of those must return what it returns today (ADR-002 §5), and
  `recurrence` must still see a promoted lesson, because a promoted lesson that recurs is a failed
  promotion (ADR-005 §4).

  Background:
    Given a memory index in which 60 records match the query "worktree junction"
    And the best-ranked record is a lesson whose promotion is "control:171/FF-17104"
    And a picker stub that records whether it was asked

  Rule: R4 · Only the block is picked

    Scenario: E13 · the JSON recall is the ranker's first five, as today
      When "aof memory recall 'worktree junction' --json" runs
      Then it prints a JSON array of the 5 best-ranked records, the promoted lesson first
      And the picker was not asked

    Scenario: E14 · a whole-history recall is never picked
      Given item 157 has 34 delivery records
      When "aof memory recall '' --item 157 --area delivery --all --json" runs
      Then it prints all 34 records
      And the picker was not asked

    Scenario: E15 · recurrence still sees a promoted lesson
      Given a new lesson whose text repeats the promoted lesson's
      When "aof memory recurrence '<the new lesson's text>' --json" runs
      Then its qualifying reference is the promoted lesson
      And the picker was not asked

    Scenario: E16 · a limit on a block is the block's cap
      Given the picker answers cards 1, 2, 3, 4 and 5
      When "aof memory recall 'worktree junction' --block --limit 3" runs
      Then the picker was handed 20 cards
      And the block is 3 lines

    Scenario Outline: which recalls ask the picker
      When "aof memory <command>" runs
      Then the picker <asked>
      And the output is <output>

      Examples:
        | command                                         | asked                     | output                                         |
        | recall 'worktree junction'                      | was not asked             | the text view of the 5 best-ranked records     |
        | recall 'worktree junction' --limit 8 --json     | was not asked             | a JSON array of the 8 best-ranked records      |
        | recall 'worktree junction' --block --all        | was not asked             | a block of all 60 records                      |
        | recall 'worktree junction' --block --limit 30   | was handed 30 cards       | a block of at most 30 lines                    |
        | recall 'worktree junction' --block --json       | was handed 20 cards       | a JSON array of the records the picker chose   |
        | status                                          | was not asked             | a record count that includes the promoted lesson |

    Scenario: the in-process door and the CLI hand out the same block
      Given the picker answers cards 7 and 2
      When the same recall runs through "aof memory recall … --block" and through the in-process entry
      Then both blocks are the records ranked 7th and 2nd
