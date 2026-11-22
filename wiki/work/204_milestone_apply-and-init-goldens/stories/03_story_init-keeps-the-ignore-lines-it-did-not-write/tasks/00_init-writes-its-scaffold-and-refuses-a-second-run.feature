@executable @cli @assets @scaffold
Feature: Init writes its scaffold and refuses a second run

  WHY. `aof init` is a project's first contact with aof. Held whole on an empty folder, and held
  unchanged by a second run that refuses, any change to what init writes or to its refusal shows
  as a diff (ADR-001).

  Background:
    Given the "project-init" lane is registered with the harness

  Rule: R1 · Init writes its scaffold, and a second init refuses and changes nothing

    Scenario: E1 · init on an empty folder renders to its whole baseline
      Given scenario "empty" names no base, starts with no file, and its step is "init --runtime claude,codex,opencode --json"
      When the harness compares scenario "empty" in lane "project-init"
      Then it passes
      And the captured home tree of "empty" holds no file

    Scenario Outline: the scaffold holds exactly init's three files
      When scenario "empty" runs
      Then "<file>" <holds>

      Examples:
        | file                 | holds                                                                 |
        | .aof/aof.config.json | names the runtimes "claude", "codex" and "opencode", and no resource   |
        | .aof/aof.lock.json   | holds "items" as an empty list and the runtimes "claude", "codex" and "opencode" |
        | .aof/.gitignore      | holds exactly "/work/\n"                                               |

    Scenario: E2 · a second init refuses and changes nothing
      Given scenario "re-init" names base "empty", and its steps are "init --runtime claude,codex,opencode --json" twice, the second declared to exit 1
      When the harness compares scenario "re-init" in lane "project-init"
      Then it passes
      And the second step's envelope names the code "config-exists"
      And the stored delta of "re-init" holds "steps.golden" and no file
