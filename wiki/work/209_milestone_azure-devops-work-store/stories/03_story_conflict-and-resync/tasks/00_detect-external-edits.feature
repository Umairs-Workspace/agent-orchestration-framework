@cli @work @board
Feature: Detect a board edit AOF did not make
  Rule: R1 · A board change AOF did not make to a linked item stops the workflow
    @executable
    Scenario: E1 · A state change with no pending edit records a stop
      Given 17/02 is linked to board item 411 at acknowledged revision 6 and has no pending edit
      When a teammate moves 411 to Closed at revision 7 and the board store polls its change feed
      Then a stop is recorded naming 17/02, board item 411 and revision 7
      And a status change for 17/02 is refused naming the conflict and "aof work resync-board 17/02"

    @executable
    Scenario: E2 · AOF's own acknowledged write is not an external edit
      Given AOF's status write for 17/02 was acknowledged at revision 8
      When the change feed reports revision 8 of 411
      Then no stop is recorded and the workflow for 17 continues

    @executable
    Scenario: E3 · A comment on a linked item does not stop the workflow
      Given 17/02 is linked to 411 at acknowledged revision 8
      When a teammate adds a comment to 411 at revision 9 and changes nothing AOF tracks
      Then no stop is recorded and revision 9 becomes the acknowledged revision of 411

    @executable
    Scenario: E13 · A reorder on the board stops the workflow
      Given 17/02 is linked to 411 at acknowledged revision 8
      When a teammate drags 411 to a new position and only its order changes, at revision 9
      Then a stop is recorded naming 17/02, board item 411 and revision 9

    @executable
    Scenario: E4 · A repeated observation keeps the one stop
      Given a stop is recorded for 17/02 at revision 7 of 411
      When the daemon restarts and the change feed reports revision 7 of 411 again
      Then exactly one stop exists for 17/02 and it still names revision 7

    @executable
    Scenario Outline: Only a change to a tracked value stops the workflow
      Given 17/02 is linked to 411 at acknowledged revision 8
      When a teammate changes <change> on 411
      Then a stop is <recorded>

      Examples:
        | change                                       | recorded     |
        | the title                                    | recorded     |
        | the state                                    | recorded     |
        | the parent link                              | recorded     |
        | a dependency link                            | recorded     |
        | the order                                    | recorded     |
        | a tag                                        | not recorded |
        | a field AOF does not map                     | not recorded |
        | an attachment                                | not recorded |
        | the state, to the value AOF already intends  | not recorded |

    @executable
    Scenario: The feed position advances only after its observations are saved
      Given the change feed returns revision 7 of 411 and a new feed position
      When the process stops after reading the feed and before saving its observations
      Then the next poll reads from the earlier position and records the stop for 17/02
