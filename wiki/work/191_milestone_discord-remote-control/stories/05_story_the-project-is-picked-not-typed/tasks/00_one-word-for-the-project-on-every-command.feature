@executable @cli @work @work-stream
Feature: one word for the project on every command

  WHY. The SPEC's agreed command reads `project:<p>`, and every reply already prints the project's
  folder. The old `workspace` option goes, and the per-guild bulk overwrite leaves nothing stale
  behind (ADR-006 §1).

  Background:
    Given a channel serving "aof" (id "ws-a") and "notes" (id "ws-n"), the user allowed on both

  Scenario Outline: each command addresses the project it is given, by folder or by id
    When the user runs <command> with project <given>
    Then it addresses only "aof"

    Examples:
      | command                | given  |
      | /status                | "aof"  |
      | /asks                  | "ws-a" |
      | /loop resume scope:191 | "ws-a" |

  Scenario: an unknown project is refused naming the ones there are
    When the user runs `/status project:aoff`
    Then the reply is refused `discord-scope-ambiguous` and names "aof" and "notes"

  Rule: R1 · Every command names the project the same way

    Scenario: E1 · `/loop stop` takes `project:` where it took `workspace:`
      Given a loop on scope "191" in "aof"
      When the user runs `/loop stop scope:191 project:aof`
      Then the stop request is written for scope "191" in workspace "ws-a"

    Scenario: E2 · after READY no command offers a `workspace` option
      Given a guild whose last overwrite carried the old table
      When the bot receives READY
      Then the guild's commands are overwritten once with the new table
      And `/status`, `/asks`, `/loop stop` and `/loop resume` each take an optional string option "project" with `autocomplete: true`
      And no command or subcommand has an option named "workspace"
