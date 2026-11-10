@executable @cli @work @work-stream
Feature: A question the transcript cannot show is still asked, answered and carried back

  WHY. Claude Code writes a pending AskUserQuestion call to the transcript only once it is
  answered, so a driven session waiting on one looked busy until it timed out, and its question
  was never posted (136's live run, 2026-10-03). A PreToolUse hook sees the call first; the
  driver, the owner and the re-drive read what it records (ADR-004).

  Rule: R1 · A question the session is waiting on is asked, though the transcript does not show it

    Scenario: E1 · the hook's record settles the run needs-input and the question is posted
      Given a driven session whose environment carries "AOF_RUN_ITEM_DIR" and "AOF_RUN_ID"
      And the hook has recorded an "AskUserQuestion" call with the question "08/00 Q1 · Discovery question" and options "A" and "B"
      And the session's transcript holds no record of that call
      When the driver's completion watch reads the session
      Then the run settles "needs-input", pending
      And the owner reads the question "08/00 Q1 · Discovery question" followed by "- A" and "- B"

    Scenario: E2 · a call that already has a result is not waiting
      Given the hook has recorded a call whose "tool_use_id" appears in a result in the transcript
      When the pending question is read
      Then there is none

    Scenario: E3 · a record from before this drive began is history
      Given the hook recorded a call before the drive began
      When the pending question is read for this drive
      Then there is none

  Rule: R2 · The answer reaches a session that never recorded its question

    Scenario: E4 · the re-drive carries the question it answers
      Given the owner read the question from the hook's record
      When the operator answers "Ellipsis counted"
      Then the run records the answer "Ellipsis counted" verbatim
      And the session is re-driven with "You asked:", the question, "The answer:" and "Ellipsis counted"

    Scenario: E5 · an answer to a transcript question is typed verbatim
      Given the owner read the question from the transcript
      When the operator answers "Ellipsis counted"
      Then the session is re-driven with exactly "Ellipsis counted"

  Rule: R3 · The hook never gets in the session's way

    Scenario Outline: E6 · the hook writes nothing and succeeds when it has nothing to record
      Given the hook runs with <environment> and <input>
      When it exits
      Then its exit code is 0, it prints nothing, and no pending record is written

      Examples:
        | environment             | input                   |
        | no run in the env       | a well-formed call      |
        | a run in the env        | input that is not JSON  |
