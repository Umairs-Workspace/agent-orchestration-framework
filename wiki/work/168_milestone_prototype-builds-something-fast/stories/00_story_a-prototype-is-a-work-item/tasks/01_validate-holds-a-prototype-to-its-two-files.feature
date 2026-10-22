@executable @cli @work @validate
Feature: Validate holds a prototype to its two files, and nothing schedules one

  WHY. A prototype has no stories, features, criteria or accept door, so validate must stay green
  over one that is well formed. The four moves edit named sections, so a prototype missing one
  is broken for its next continue, and validate is where that shows. A prototype gates nothing,
  so the loop must never offer one and no item may wait on one.

  Background:
    Given an isolated work tree whose stream ends at item 168

  Rule: R3 · Validate holds a prototype to its two files and nothing else

    Scenario Outline: E8 · a well-formed prototype is clean in each of its statuses
      Given prototype 169 at status "<status>" with "PROTOTYPE.md" holding Intent, Wants and Shortcuts
      And its "STATE.md" holding Hand-off and Log
      And no "stories", "tasks", ".feature" or "VERIFICATION.md" in its folder
      When "aof work validate" runs
      Then it exits 0
      And "aof work doctor 169 --json" reports no finding on 169

      Examples:
        | status    |
        | active    |
        | paused    |
        | done      |
        | abandoned |

    Scenario Outline: a prototype missing a part it needs draws one finding naming it
      Given prototype 169 at status "active" that is well formed except <defect>
      When "aof work validate" runs
      Then it exits non-zero with exactly one finding on 169, naming <named>

      Examples:
        | example | defect                                         | named                 |
        | E9      | "PROTOTYPE.md" has no "## Shortcuts" heading   | "## Shortcuts"        |
        |         | "PROTOTYPE.md" has no "## Wants" heading       | "## Wants"            |
        | E10     | the folder has no "STATE.md"                   | "STATE.md"            |
        |         | "STATE.md" has no "## Hand-off" heading        | "## Hand-off"         |
        | E11     | its status is "in-progress"                    | the four status words |
        | E12     | it carries "depends: [12]"                     | "depends:"            |
        |         | it carries "parent: 168"                       | "parent:"             |

    Scenario: a prototype with no Diagrams section is still clean
      Given prototype 169 at status "active", well formed, with no "## Diagrams" heading
      When "aof work validate" runs
      Then it exits 0

    Scenario: the untouched template is not a prototype yet
      Given a folder "169_prototype_csv-importer" copied from the prototype templates with only the frontmatter filled
      When "aof work validate" runs
      Then it reports that 169's Intent and Wants are still the template's

  Rule: R4 · A prototype is never scheduled and nothing waits on it

    Scenario: E13 · the loop offers nothing when only a prototype is open
      Given every milestone in the stream is "done"
      And prototype 169 at status "active"
      When "aof work next --json" runs
      Then it offers no item

    Scenario: E14 · a depends edge on a prototype does not resolve
      Given prototype 169 at status "active"
      And milestone 170 carrying "depends: [169]"
      When "aof work validate" runs
      Then it reports that "169" does not resolve to a top-level item, on 170
