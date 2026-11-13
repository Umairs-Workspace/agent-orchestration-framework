@executable @cli @assets @distribution
Feature: A render reads the project's own config

  WHY. Rendered commands are committed files. If a render read the machine-wide config, two
  clones of one commit would render different commands, and a teammate's machine would decide
  what a project's refine says (ADR-003).

  The fixture bundle is the command "demo" with the slot "demo.notes" and the practice "notes",
  keyed on "work.notes.enabled". A scratch project is initialised from it under its own
  "AOF_GLOBAL_HOME", so the machine-wide config is the test's own file.

  Rule: R4 · What a render includes is decided by the project's own config file

    Scenario: E9 · a key set for the whole machine does not reach a render
      Given the machine-wide config sets "work.notes.enabled" to true
      And the project's config does not name it
      When "aof work update" runs in the project
      Then the rendered "demo" command holds no fragment

    Scenario: a key set in the project is honoured whatever the machine says
      Given the machine-wide config sets "work.notes.enabled" to false
      And the project's config sets it to true
      When "aof work update" runs in the project
      Then the rendered "demo" command holds the fragment

    Scenario: E10 · turning a key on is one update away, and turning it off restores the render
      Given the project, rendered with the key absent
      When the project's config sets "work.notes.enabled" to true and "aof work update" runs
      Then the "demo" command is reported "updated" and holds the fragment
      When the key is removed and "aof work update" runs again
      Then the "demo" command is reported "updated"
      And it is byte for byte what the first render wrote

    Scenario: a dry run shows the change and writes nothing
      Given the project, rendered with the key absent
      When the project's config sets the key to true and "aof work update --dry-run" runs
      Then the "demo" command is reported as an update
      And the file on disk is unchanged

    Scenario: an update with nothing to change says so
      Given the project, rendered with the key on
      When "aof work update" runs again
      Then every file is reported up to date

    Scenario: a command a person edited is not overwritten when a key changes
      Given the project, rendered with the key absent
      And a person has edited the rendered "demo" command
      When the project's config sets the key to true and "aof work update" runs
      Then the "demo" command is reported as a drift warning and is left as the person wrote it

    Scenario: a new project renders with every practice off
      When "aof work init" runs in an empty directory, from the shipped bundle
      Then every rendered file has the hash the shipped manifest records for it

    Scenario: a bundle loaded with no config is every practice off
      When the fixture bundle is loaded with no config and "demo" is rendered
      Then it holds no fragment and no slot marker

  Scenario: FF-19207 · a render reads the project's config and nothing else
    When "test/arch/practices/acd-render-reads-project-config-only.test.mjs" runs
    Then it fails unless "packages/core/src/work/bundle-compose.mjs" imports no module that reads a file, the environment or the home directory
    And it fails unless a fixture project whose machine-wide config turns a practice on renders without it

  Scenario Outline: FF-19207 · each planted reader turns the control red
    Given <planted>
    When the FF-19207 cases run
    Then the control fails and names what was read

    Examples:
      | planted                                                                |
      | the composing module imports "node:os"                                 |
      | the composing module reads "process.env"                               |
      | the update merges the machine-wide config before asking what is on     |
