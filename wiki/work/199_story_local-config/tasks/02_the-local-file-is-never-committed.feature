@executable @cli @work @scaffold
Feature: The local file is never committed

  WHY. A committed local file is one person's settings imposed on everyone who pulls, which is the
  problem this story removes. aof adds the file to `.aof/.gitignore` itself, and the doctor says
  when git is tracking one anyway.

  Background:
    Given a scratch git repository with aof initialised, and its own global home, named through "AOF_GLOBAL_HOME"

  Rule: R3 · The local file is never committed

    Scenario Outline: E9 · init and update add the ignore entry when it is missing
      Given ".aof/.gitignore" holds no "aof.config.local.json" entry
      When <command> runs
      Then ".aof/.gitignore" holds the entry "aof.config.local.json" exactly once
      And every line ".aof/.gitignore" held before is still there, in order

      Examples:
        | example | command            |
        | E9      | "aof work init"    |
        | E9      | "aof work update"  |

    Scenario: the entry is not added twice
      Given ".aof/.gitignore" already holds "aof.config.local.json"
      When "aof work update" runs twice
      Then ".aof/.gitignore" holds the entry exactly once

    Scenario: E10 · a tracked local file is reported with its fix
      Given ".aof/aof.config.local.json" exists and is tracked by git
      When "aof work doctor --json" runs
      Then it reports a warning with code "config-local-tracked" naming the file
      And the message names "git rm --cached .aof/aof.config.local.json"

    Scenario: an ignored local file raises nothing
      Given ".aof/aof.config.local.json" exists and is ignored by git
      When "aof work doctor --json" runs
      Then it reports no "config-local-tracked"
