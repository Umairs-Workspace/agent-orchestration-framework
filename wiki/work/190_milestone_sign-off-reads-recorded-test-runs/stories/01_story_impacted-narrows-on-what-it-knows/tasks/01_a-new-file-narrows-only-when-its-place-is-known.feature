@executable @cli @work @validate
Feature: a new file narrows only when its place is known

  WHY. A story nearly always creates a file. The graph is read, never rebuilt (72/ADR-002 §1), so a
  created file is absent from it, and 72/ADR-002 §2a widens every absent file. That made 58 of 76
  recent stories run everything (RESEARCH Q1). ADR-003 §3 narrows only on positive knowledge:
  - a suite is a leaf, so a new suite selects itself;
  - a new module that a changed file imports by a literal specifier inherits that importer's
    suites;
  - under `--story`, a declared path that exists nowhere has no behaviour yet.

  Anything else absent, such as a module reached only by a computed `import()`, still widens.
  The cases plant the graph, the changed set and the files on disk in a temp project.

  Rule: R2 · A new file narrows only when its place is known

    Scenario: E3 · a new suite selects itself
      Given `test/testing/test-run-record.test.mjs` exists on disk and is absent from the graph
      When it is the changed set
      Then the scope is `impacted`
      And it is selected with the reason `suite-itself`
      And nothing widens

    Scenario: E4 · a new module imported by a changed file inherits its importer
      Given `packages/work/src/testing/record.mjs` exists on disk and is absent from the graph
      And `packages/work/src/commands/test.mjs` is present in the graph with the suite `packages/work/test/testing.test.mjs` among its dependents
      And `test.mjs` contains `import { createTestRecord } from "../testing/record.mjs";`
      When both files are the changed set
      Then the scope is `impacted`
      And `record.mjs` is resolved with the reason `imported-by-changed`
      And `packages/work/test/testing.test.mjs` is selected

    Scenario: a chain of new modules resolves through its changed importers
      Given `a.mjs` and `b.mjs` are absent from the graph, `b.mjs` imports `a.mjs`, and the present changed file `c.mjs` imports `b.mjs`
      When `a.mjs`, `b.mjs` and `c.mjs` are the changed set
      Then all three resolve and nothing widens

    Scenario Outline: E5 · what a literal-specifier scan cannot see still widens
      Given `packages/work/src/lazy.mjs` exists on disk and is absent from the graph
      And the only changed file that refers to it does so as <reference>
      When both are the changed set
      Then the scope is `all`
      And `packages/work/src/lazy.mjs` is a widening with the reason `not-in-graph`

      Examples:
        | reference                                             |
        | `import(path.join(dir, name))`                        |
        | a string `"lazy.mjs"` in a registry table             |
        | nothing at all                                        |

    Scenario: E6 · a declared path that exists nowhere is not yet written
      Given story 190/01's `files:` declares `test/testing/later.test.mjs`
      And it is neither on disk nor in the graph
      When `aof test --scope impacted --story 190/01` selects
      Then `test/testing/later.test.mjs` is reported `not-yet-written`
      And it selects nothing and widens nothing

    Scenario: a git-changed file absent from disk and graph still widens
      Given `git` reports `old.mjs` deleted, and the graph does not hold it
      When `aof test --scope impacted` selects from git's changed set
      Then `old.mjs` is a widening with the reason `not-in-graph`

    Scenario: FF-19003 · narrowing is closed and positive
      When `test/arch/testing/acd-test-selection-widens-never-narrows.test.mjs` runs
      Then it fails if the selector's narrowing reasons are not exactly `graph-dependent`, `suite-itself`, `imported-by-changed`, `declared-coupling` and `not-yet-written`
      And it fails if a selected suite in a narrowed result carries no reason
      And it fails if a widened result carries a narrowing reason
