@cli @work @board
Feature: Drive the loop over a recorded board and recover from a conflict
  Rule: R3 · The loop runs end to end over a board and recovers from a conflict
    @executable
    Scenario: E4 · The loop drives a story to in-review over the board
      Given a board-backed project with a refined story and a stubbed phase session
      When "aof work loop" drives the story from build to review
      Then each status change appears on the recorded board in the order the loop made it
      And the story's local documents stay in its folder

    @executable
    Scenario: E5 · A competing edit halts the loop and resync lets it resume
      Given the loop is building a story linked to a recorded board item
      When a recorded competing edit changes that item's state
      Then the loop halts with board-conflict naming the story, its board ID and the revision
      And a status change written at the old revision is refused as stale
      When the operator runs "aof work resync-board" for the story and resumes the loop
      Then the board shows AOF's values at a new revision and the loop drives its next phase
