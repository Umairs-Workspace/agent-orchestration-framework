Feature: aof graph build is the code corpus's ingest, answers what it answers today, and leaves graphify-out ignored

  WHY. `graph:build` drives graphify, classifies egress and checks the artifact itself. After this
  task, the graphify code backend does all three behind the port's `ingest("code")`, and the command
  is a face over it that keeps 174's share wrapping. Agents parse the `BuildResult`, so it does not
  change by a field. The one thing that does change is 149's open gap: a build now writes the nested
  `graphify-out/.gitignore`, so `aof graph build .` no longer leaves the artifact untracked
  (179/ADR-002).

  THE FIXTURE: a temp git repository under an isolated "AOF_GLOBAL_HOME", holding two `.mjs` files
  where one imports the other, with no `.gitignore` that mentions `graphify-out`. "The pinned
  graphify" is the managed binary the existing graph suites use. Scenarios marked as needing it are
  skipped, and say so, where it is absent.

  @executable @cli @adapter @memory
  Scenario: a code-only build through the face carries today's BuildResult fields
    Given the pinned graphify is available
    When "aof graph build . --json" runs
    Then it exits 0
    And the result carries "graphPath", "projectRoot", "nodeCount", "edgeCount", "hyperedgeCount", "builtAt", "backend", "egress", "unchanged" and "stdout"
    And "egress" is "none" and "backend" is null
    And "nodeCount" and "edgeCount" are the counts of the graph.json the build wrote

  @executable @cli @adapter @memory
  Scenario: a build leaves graphify-out ignored in a repository that did not ignore it
    Given the pinned graphify is available
    When "aof graph build . --json" runs
    Then "graphify-out/.gitignore" exists
    And "git status --porcelain" lists nothing under "graphify-out/"

  @executable @cli @adapter @memory
  Scenario: a rebuild over an unchanged tree still answers unchanged, and the ignore file stays
    Given the pinned graphify is available
    And "aof graph build . --json" has run once
    When "aof graph build . --json" runs again
    Then "unchanged" is true
    And "graphify-out/.gitignore" exists

  @executable @cli @adapter @memory
  Scenario: with the binary absent, the build is refused before any spawn, as today
    Given no graphify binary resolves
    When "aof graph build . --json" runs
    Then it exits non-zero with code "graphify-missing"
    And no process was spawned
    And no "graphify-out" directory was created

  @executable @cli @adapter @memory
  Scenario Outline: egress is classified from the one backend table, as today
    When the code corpus is ingested with extraction backend "<backend>" and the spawn is stubbed
    Then the result's "egress" is "<egress>"

    Examples:
      | backend    | egress     |
      | (none)     | none       |
      | claude-cli | docs-media |
      | ollama     | docs-media |

  @executable @cli @adapter @memory
  Scenario: a zero-exit build over an unreadable artifact is still a failed build
    Given a stubbed spawn that exits 0 and leaves a truncated graph.json
    When the code corpus is ingested
    Then it fails with code "graphify-no-persist"

  @executable @cli @adapter @memory
  Scenario: a build under another out root writes its ignore there and leaves the project's graph alone
    Given a stubbed spawn that writes a valid graph.json under the out root it is given
    And the project already has a "graphify-out/graph.json" at its root
    When "graph:build" is invoked with path "wiki/work" and out root ".aof/memory-graph", as the graphify memory backend invokes it
    Then ".aof/memory-graph/graphify-out/graph.json" and ".aof/memory-graph/graphify-out/.gitignore" exist
    And the project root's "graphify-out/graph.json" is byte-unchanged
