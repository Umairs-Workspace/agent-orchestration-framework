@executable @cli @assets @scaffold
Feature: A practice that is on installs its variant

  WHY. A practice can change the form of a document: milestone 193 adds a provenance label and
  two question classes to the example map. The template a project copies must then teach that
  project's forms, and a project without the practice must keep the template it has (ADR-004).

  The fixture bundle holds the shipped story template and a practice "notes", keyed on
  "work.notes.enabled", with a variant of the story template's "EXAMPLES.md" whose text is
  "# Variant map". "INSTALLED" is ".aof/templates/work/story/EXAMPLES.md" in a scratch project.

  Rule: R1 · A practice that is on installs its variant of a template in place of the default

    Scenario: E1 · the variant is installed where the default would be
      Given a project whose config sets "work.notes.enabled" to true
      When "aof work update" runs
      Then INSTALLED opens with the bundle's stamp and holds "# Variant map"
      And it holds no line of the default template

    Scenario: E2 · with the practice off, the default is installed, unchanged
      Given a project with no "work.notes" in its config
      When "aof work update" runs
      Then INSTALLED is byte for byte what a bundle with no variant installs

    Scenario: E3 · turning the practice on and off moves between the two
      Given the project, rendered with the key absent
      When the key is set to true and "aof work update" runs
      Then INSTALLED is reported "updated" and holds the variant
      When the key is removed and "aof work update" runs again
      Then INSTALLED is reported "updated"
      And it is byte for byte the default again

    Scenario: the other files of the template are untouched
      Given a project whose config sets "work.notes.enabled" to true
      When "aof work update" runs
      Then every other file under ".aof/templates/work/story" is byte for byte the default

    Scenario: a variant is rendered once, whatever the runtimes
      Given a project installed for Claude, Codex and opencode, with the key on
      When "aof work update" runs
      Then the install manifest lists INSTALLED once

    Scenario Outline: only the boolean true installs the variant
      Given a project whose config sets "work.notes.enabled" to <value>
      When "aof work update" runs
      Then INSTALLED holds the <installed>

      Examples:
        | value   | installed |
        | true    | variant   |
        | false   | default   |
        | "true"  | default   |
        | absent  | default   |

    Scenario: a template a person edited is kept when the practice is turned on
      Given the project, rendered with the key absent
      And a person has edited INSTALLED
      When the key is set to true and "aof work update" runs
      Then INSTALLED is reported as a drift warning and is left as the person wrote it

    Scenario: the shipped bundle installs the templates it installs today
      When the shipped bundle is rendered with an empty config
      Then every template file has the hash the shipped manifest records for it
