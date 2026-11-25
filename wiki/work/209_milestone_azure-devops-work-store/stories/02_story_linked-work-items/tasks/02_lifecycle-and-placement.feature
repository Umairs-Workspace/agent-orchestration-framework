@cli @work @board
Feature: Keep board identity and local history through lifecycle and placement changes
  Rule: R3 · Lifecycle and placement preserve the item's identity and document history
    @executable
    Scenario: E5 · Inserting before a linked milestone preserves its board identity
      Given milestone 17 is linked to 410 and contains a decision record
      When insertion before 17 moves it to 18
      Then find returns it once at 18 with the same board identity and the intended rank
      And its decision record resolves from the new document home and dependent refs are repaired

    @executable
    Scenario: E6 · A legal status change preserves the document body
      Given 17 is linked to 410 at revision 8 and both show in-progress
      When I move 17 to in-review through the public status command
      Then the patch expects revision 8 and readback confirms in-review on 410
      And the local record shows in-review and preserves its decision text

    @executable
    Scenario: E10 · A completed board-backed milestone stays in its document home
      Given 17 is ready for its legal move to done and is linked to 410
      When the final board update is pending and later verified
      Then the local history and recovery data remain accessible while the update is pending
      And after confirmation 410 is done and the history remains at the same document home
      When I run "aof work archive 17" in that workspace
      Then the result identifies archive as local-mode only and leaves the folder, link and board unchanged

    @executable
    Scenario Outline: Archive follows the workspace store
      Given milestone 17 is done and eligible for archive in local file mode
      When I run <command> in <mode>
      Then I observe <result>

      Examples:
        | command                     | mode             | result                                           |
        | aof work archive --done     | board-backed     | local-mode-only result and no moves or writes    |
        | aof work archive --done --yes | board-backed   | local-mode-only result and no moves or writes    |
        | aof work archive 17         | local file       | folder moves to archive and its history resolves |

    @executable
    Scenario Outline: Ordinary moves retain their existing preconditions and identity
      Given a linked item with a readable decision record
      When I request <operation>
      Then I observe <result> and the decision remains readable

      Examples:
        | operation                      | result                                                  |
        | placement preview              | proposed moves with zero local or remote writes          |
        | a move with a conflicting lock | refusal before local or remote placement changes         |
        | an illegal status edge         | refusal with both statuses preserved                     |
        | rollback after status advanced beyond the guard | newer status survives on both sides     |
        | reparenting a linked story     | same board ID, verified new parent and repaired local ref |
