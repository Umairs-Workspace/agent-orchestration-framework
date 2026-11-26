@cli @work @board
Feature: Restore AOF's tracked values with a verified resync
  Rule: R4 · Resync restores AOF's tracked values and clears the stop only after verification
    @executable
    Scenario: E10 · Resync restores tracked values and leaves other board content alone
      Given a stop is recorded for 17/02 at revision 7 of board item 411
      And 411 carries a comment and a value in a field AOF does not map
      When the operator runs "aof work resync-board 17/02"
      Then AOF writes 411's status, title, parent, dependencies and order under revision 7
      And reads 411 back at revision 8 with those values and clears the stop
      And the comment and the unmapped field on 411 are unchanged

    @executable
    Scenario: E11 · A second edit during resync leaves the workflow stopped
      Given a stop is recorded for 17/02 at revision 7 of 411
      When a teammate edits 411 to revision 8 after AOF reads it and before AOF writes
      Then the board refuses AOF's write as stale
      And the stop remains and now names revision 8

    @executable
    Scenario: E12 · A deleted item is not recreated by resync
      Given a stop is recorded because board item 411 was deleted
      When the operator runs "aof work resync-board 17/02"
      Then no board item is created and the stop remains
      And the message asks the operator to restore 411 from the recycle bin and run the resync again

    @executable
    Scenario: The workflow continues after a verified resync
      Given the loop driving 17 halted with board-conflict on 17/02
      When "aof work resync-board 17/02" verifies 411 and the loop is resumed
      Then the loop applies its ordinary readiness rules and drives its next phase

    @executable
    Scenario Outline: Resync clears the stop only on verified values
      Given a stop is recorded for 17/02 at revision 7 of 411
      When the resync write <write> and the readback shows <readback>
      Then the stop is <state>

      Examples:
        | write               | readback                                     | state   |
        | is applied          | revision 8 with AOF's values                 | cleared |
        | is applied          | revision 8 with a different title            | kept    |
        | gets no reply       | revision 8 with AOF's values                 | cleared |
        | gets no reply       | revision 7 unchanged                         | kept    |
        | is refused as stale | revision 9 from a teammate                   | kept    |

    @executable
    Scenario Outline: Resync refuses when there is nothing to recover
      When the operator runs "aof work resync-board <ref>" in <mode>
      Then the command answers <answer>

      Examples:
        | ref   | mode             | answer                                           |
        | 17/01 | board mode       | that 17/01 has no recorded stop, writing nothing |
        | 17/02 | local file mode  | a skip for local file mode                       |
        | 99    | board mode       | ref-not-found                                    |
