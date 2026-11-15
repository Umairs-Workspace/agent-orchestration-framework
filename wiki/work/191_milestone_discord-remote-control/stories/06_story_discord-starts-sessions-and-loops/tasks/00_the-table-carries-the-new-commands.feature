@executable @cli @work @work-stream
Feature: the table carries the new commands

  WHY. Discord shows only what the bot registers, so the new commands are rows in the one frozen
  table, bulk-overwritten per guild like the rest (ADR-006 §3).

  Scenario: the session command and its three subcommands
    When `COMMANDS` is read
    Then `/session start` takes "project" (required, autocomplete), "node" and "item" (optional, autocomplete)
    And `/session list` takes "project" (optional, autocomplete)
    And `/session end` takes "session" (required, autocomplete)

  Scenario: the loop command gains start beside stop and resume
    When `COMMANDS` is read
    Then `/loop` has the subcommands "stop", "resume" and "start"
    And `/loop start` takes "scope" (required) and "project" (optional, autocomplete)

  Scenario Outline: each new option is offered from its own source
    Given a channel serving "aof" (id "ws-a"), the user allowed on it
    And live node "node-6eb3", in-progress item "191/02" in "aof", and live session "aof-0b9e6c1e" in "aof"
    When an autocomplete interaction for `/session <sub>` arrives with "<option>" focused and value ""
    Then the choices include <choice>

    Examples:
      | sub   | option  | choice                                                               |
      | start | node    | {name:"node-6eb3",value:"node-6eb3"}                                 |
      | start | item    | {name:"191/02",value:"191/02"}                                       |
      | end   | session | {name:"aof-0b9e6c1e",value:"0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10"}   |

  Scenario: a session in a project the user may not address is not offered
    Given live session "notes-5d2a7f40" in "notes", where the user is not allowed
    When the user types "" into `/session end`'s "session" option
    Then "notes-5d2a7f40" is not among the choices
