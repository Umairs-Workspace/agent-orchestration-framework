@manual @docs @work @work-stream
Feature: the guide says project, and shows the pick

  WHY. The guide is where the operator learns the commands. It must name the option the bot now
  registers, and say that the list offers only the projects they may address.

  Scenario: the command table and the several-projects paragraph say `project`
    When `wiki/architecture/discord-notifications.md` is read
    Then its slash-command table names `project` for each command and never `workspace`
    And its "Several projects in one channel" paragraph says to pick the project from the list
    And it says the list offers only projects whose channel allowlist holds the user
