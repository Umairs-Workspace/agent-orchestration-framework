@executable @cli @assets @distribution @design
Feature: The design-system practice is registered on its key, and changes no render while it has no fragments

  WHY. A project turns the practice on with one boolean key, read from its own config (ADR-005 §1,
  192/ADR-003). The practice lives in a new package, `@aof/design-system`, registered the way
  `@aof/specification-by-example` is (ADR-008). Stories 02 and 03 give it fragments. Until then,
  turning it on must change nothing a runtime renders, and the practice list must still show the
  key, so an operator can find it (the adoption path).

  Rule: R1 · The design-system practice is registered on its key, and it changes no render while it has no fragments

    Scenario: E1 · the practice list names the practice and its key
      Given a project installed for claude, codex and opencode, with no "work.ui" block
      When "aof work update" runs
      Then its practice list holds a "design-system" row keyed on "work.ui.designSystem.enabled", reading off
      And its JSON entry for "design-system" holds no "runtimes"
      When "work.ui.designSystem" is set to {"enabled": true, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]}
      And "aof work update" runs again
      Then the "design-system" row reads on

    Scenario: E2 · turning the practice on changes no rendered file
      Given the shipped bundle
      When it is rendered for claude, codex and opencode with "work.ui.designSystem.enabled" off
      And again with it on
      Then every rendered file is byte-identical between the two renders

    Scenario Outline: only the boolean true turns the practice on
      Given "work.ui.designSystem.enabled" is <value>
      When the practice states are resolved
      Then "design-system" is <state>

      Examples:
        | value       | state |
        | true        | on    |
        | false       | off   |
        | "true"      | off   |
        | absent      | off   |

  Scenario: the package is a workspace package that core's practice registry names
    When the practice registry is read
    Then it lists "@aof/design-system" after "@aof/specification-by-example"
    And the root "package.json" and core's "package.json" declare "@aof/design-system" as a workspace dependency
    And "yarn.lock" holds the workspace entry for "@aof/design-system"
    And the package's suites run through the test registry in "scripts/test.mjs"

  Scenario: the packaged binary carries the package's assets
    When the package asset manifest is generated
    Then it holds "@aof/design-system"'s "assets/bundle.json" and "assets/commands/design-system.md"
