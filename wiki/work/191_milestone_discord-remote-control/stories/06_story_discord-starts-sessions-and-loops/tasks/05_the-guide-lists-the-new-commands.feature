@manual @docs @work @work-stream
Feature: the guide lists the new commands

  WHY. The guide is the operator's reference on the phone. It must say what each new command does,
  who sees its reply, and what a start needs on the machine.

  Scenario: the slash-command table carries the four new commands
    When `wiki/architecture/discord-notifications.md` is read
    Then its table lists `/session start`, `/session list`, `/session end` and `/loop start`, each with its options and who sees the reply
    And it says `/session start` replies only to the person who ran it, with the link or the session's name

  Scenario: the guide says what a start needs
    When the same guide is read
    Then it says the session is Claude with Remote Control, signed in as the machine's own `claude`, never a shell
    And it says a session runs until `/session end`, Quit or a restart, with no idle limit
