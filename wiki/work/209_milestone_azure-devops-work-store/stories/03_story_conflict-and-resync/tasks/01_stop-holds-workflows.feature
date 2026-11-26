@cli @work @board
Feature: A recorded stop holds board writes and the workflows that contain the item
  Rule: R2 · A recorded stop survives a restart and is checked before every board write and workflow step
    @executable
    Scenario: E5 · The stop survives a restart and refuses the next status change
      Given a stop is recorded for 17/02 at revision 7 of board item 411
      When the daemon restarts and the operator runs "aof work status 17/02 in-review"
      Then the command fails with work-board-conflict naming 17/02, 411 and revision 7
      And no change for 411 reaches the board and the local status of 17/02 is unchanged

    @executable
    Scenario: E6 · A stale write is classified and recorded as a stop
      Given 17/02 is acknowledged at revision 6 but a teammate changed its state at revision 7
      When AOF writes 17/02's status expecting revision 6
      Then the board refuses the write as stale
      And AOF rereads 411, records a stop naming revision 7, and leaves the local status unchanged

    @executable
    Scenario: E7 · Only the workflows that contain the item halt
      Given a stop is recorded for 17/02 and loops are driving milestones 17 and 18 in the same workspace
      When each loop reaches its next phase
      Then the loop driving 17 halts with board-conflict naming 17/02, 411 and the resync command
      And the loop driving 18 continues and its status change for 18/00 reaches the board

    @executable
    Scenario: A board conflict is the operator's stop
      Given the loop driving 17 halted with board-conflict
      When the loop decides how to hand over the halt
      Then it starts no repair session and waits for the operator

    @executable
    Scenario Outline: The stop is checked at each door into the workflow
      Given a stop is recorded for 17/02
      When <door> is asked to act on <ref>
      Then it <answer>

      Examples:
        | door                         | ref   | answer                                          |
        | a status change              | 17/02 | is refused with work-board-conflict             |
        | a status change              | 17/01 | is applied and reaches the board                |
        | a loop phase for milestone   | 17    | halts with board-conflict                       |
        | a loop phase for the story   | 17/02 | halts with board-conflict                       |
        | a loop phase for milestone   | 18    | proceeds                                        |
        | dispatch of a lane for       | 17/03 | is refused naming the stop on 17/02             |
        | a read with "aof work find"  | 17/02 | answers with the local values                   |
