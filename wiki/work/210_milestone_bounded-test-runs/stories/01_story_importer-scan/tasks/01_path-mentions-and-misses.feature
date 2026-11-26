@cli @work @validate
Feature: a suite that names a changed path is selected, and what the scan cannot place is said

  WHY. At m191/R4 a fix was checked against the suites that import the changed file, and a size
  bound held by a suite that reads the file's text was missed until the gate. A suite that names
  a changed path is therefore selected too (ADR-003). A scan that silently drops what it cannot
  resolve would look complete when it is not, so every unresolved specifier is reported, and a
  change that reaches nothing says so.

  Rule: R2 · A suite that names a changed path is selected, and what cannot be placed is said

    @executable
    Scenario: E5 · a suite that reads a file by its path is selected as names
      Given the suite "test/loop/loop-size.test.mjs" contains the text "packages/loop/src/loop.mjs"
      And it imports nothing that reaches that file
      When the scan is asked about the changed file "packages/loop/src/loop.mjs"
      Then "test/loop/loop-size.test.mjs" is selected as "names"

    @executable
    Scenario: E6 · a change no suite imports or names reaches nothing
      Given no suite imports or names "wiki/work/210_milestone_x/STATE.md"
      When the scan is asked about that changed file
      Then the selection is empty
      And the answer lists "wiki/work/210_milestone_x/STATE.md" as reaching no suite

    @executable
    Scenario: E7 · an unresolvable specifier is reported, and the scan completes
      Given the helper "test/support/h.mjs" imports "@acme/missing/thing"
      And the export map has no entry for "@acme/missing/thing"
      When the scan is asked about the changed file "src/record.mjs"
      Then the scan completes
      And it reports 1 unresolved specifier, "@acme/missing/thing" in "test/support/h.mjs"

    @executable
    Scenario: one suite reached by two changed files in two ways lists both
      Given the suite "test/a.test.mjs" imports "src/one.mjs" and contains the text "src/two.mjs"
      When the scan is asked about the changed files "src/one.mjs" and "src/two.mjs"
      Then "test/a.test.mjs" appears once
      And it lists "src/one.mjs" as "imports" and "src/two.mjs" as "names"

    @executable
    Scenario Outline: a path is matched whole, as the project writes it
      Given the suite "test/a.test.mjs" contains the text <text>
      When the scan is asked about the changed file "src/two.mjs"
      Then the suite is <outcome>

      Examples:
        | text                | outcome               |
        | "src/two.mjs"       | selected as "names"   |
        | "src/two.mjs.bak"   | not selected          |
        | "two.mjs"           | not selected          |

    @executable
    Scenario: the scan reads no code graph
      Given a project with no code graph built
      When the scan is asked about a changed file a suite imports
      Then that suite is selected
      And the scan reads no file under "graphify-out/"
