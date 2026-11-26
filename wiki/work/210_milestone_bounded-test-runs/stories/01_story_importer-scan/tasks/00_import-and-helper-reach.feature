@cli @work @validate
Feature: a change reaches the suites that import it, directly or through test helpers

  WHY. The agent needs a short list of suites that can actually see its change (ADR-003). The list
  is read fresh from the tree on every call, so it never depends on a code graph that may be stale
  or missing. It follows test helpers, but never source-to-source imports, because on this repo
  that walk reaches the application assembly and selects the whole tree (STATE, the measurement).
  The cases drive `importers.mjs` over a temporary project tree with a fixed export map.

  Rule: R1 · A suite is selected when it imports a changed file, directly or through test helpers

    @executable
    Scenario: E1 · a suite that imports the changed module relatively is selected as imports
      Given a project whose suite "test/testing/record.test.mjs" imports "../../src/record.mjs"
      When the scan is asked about the changed file "src/record.mjs"
      Then "test/testing/record.test.mjs" is selected, reached by "src/record.mjs" as "imports"

    @executable
    Scenario: E2 · a workspace specifier resolves through the export map
      Given the export map resolves "@acme/work/record" to "packages/work/src/record.mjs"
      And the suite "test/work/record.test.mjs" imports "@acme/work/record"
      When the scan is asked about the changed file "packages/work/src/record.mjs"
      Then "test/work/record.test.mjs" is selected as "imports"

    @executable
    Scenario: E3 · a suite reaches the change through a test helper
      Given the helper "test/support/gate-fixture.mjs" imports "src/record.mjs"
      And the suite "test/run/gate.test.mjs" imports "../support/gate-fixture.mjs"
      When the scan is asked about the changed file "src/record.mjs"
      Then "test/run/gate.test.mjs" is selected as "via test/support/gate-fixture.mjs"

    @executable
    Scenario: E4 · a suite that reaches the change only through source imports is not selected
      Given the suite "test/app.test.mjs" imports "src/assemble.mjs"
      And "src/assemble.mjs" imports "src/record.mjs"
      When the scan is asked about the changed file "src/record.mjs"
      Then "test/app.test.mjs" is not selected

    @executable
    Scenario Outline: helper chains are followed, and only through files under the test roots
      Given the suite "test/s.test.mjs" imports <chain>
      When the scan is asked about the changed file "src/record.mjs"
      Then the suite is <outcome>

      Examples:
        | chain                                                                 | outcome                                                        |
        | "test/support/a.mjs" which imports "test/support/b.mjs" which imports "src/record.mjs" | selected as "via test/support/a.mjs"                |
        | "test/support/a.mjs" which imports "src/util.mjs" which imports "src/record.mjs"       | not selected                                        |
        | "test/support/a.mjs" which imports "test/support/a.mjs"                                | not selected, and the scan completes                |

    @executable
    Scenario: the scan reads the tree on every call and keeps nothing between calls
      Given a project where no suite imports "src/record.mjs"
      And the scan is asked about "src/record.mjs" and selects nothing
      When a new suite "test/new.test.mjs" importing "../src/record.mjs" is written
      And the scan is asked about "src/record.mjs" again
      Then "test/new.test.mjs" is selected

    @executable
    Scenario: a file under the test roots that is not a suite is never itself selected
      Given "test/support/gate-fixture.mjs" imports "src/record.mjs"
      And the declared suite suffixes are ".test.mjs"
      When the scan is asked about the changed file "src/record.mjs"
      Then "test/support/gate-fixture.mjs" is not in the selection
