@manual @docs @assets @scaffold
Feature: A capture with --in-stream lands numbered in the stream

  WHY. Task 00 pins what the prompts say; this is the one observation that the prose really drives
  an agent to the right tree. A developer runs it in a scratch project — never the live work tree —
  and pastes the folder listing and the promote envelope into VERIFICATION.md.

  Rule: R1 · `--in-stream` sends one capture straight into the stream, at the tail

    Scenario: a standalone story captured with --in-stream under a backlog intake is numbered at once
      Given a scratch project whose ".aof/aof.config.json" sets "work.intake" to "backlog"
      And its stream's highest top-level number is 3
      When "aof:add-story probe-capture --in-stream" is run in that project
      Then the folder "04_story_probe-capture" exists at the root of its work tree
      And no "backlog/story_probe-capture" folder remains
      And "aof work find probe-capture --json" answers ref "04"
      And "aof work validate" is green

    Scenario: the same capture without the switch stays in the backlog
      Given the same scratch project
      When "aof:add-story probe-later" is run in that project
      Then the folder "backlog/story_probe-later" exists
      And "aof work find probe-later --json" answers "number" null
