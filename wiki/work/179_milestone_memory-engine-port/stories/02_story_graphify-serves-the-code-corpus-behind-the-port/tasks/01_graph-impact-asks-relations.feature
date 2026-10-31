Feature: aof graph impact is the code corpus's relations, with the same answer and one degrade path

  WHY. `relations(paths)` is graphify's structured edge read, formalised. 176 found no other engine
  that reproduces it. `graph:impact` answers from the port instead of opening `graph.json` itself, so
  the code graph has one reader that also owns its absence: `no-graph` when the artifact is missing,
  `graph-unreadable` when it does not parse. The walk becomes one pass over the edges per call, so a
  caller can ask about every file at once (179/ADR-002).

  THE FIXTURE: a hand-written NetworkX `graph.json` under "graphify-out/" in a temp project.
  - "src/a.mjs" imports "src/b.mjs".
  - "src/c.mjs" calls into "src/a.mjs".
  - "src/lonely.mjs" is a node with no cross-file edge.
  - "src/missing.mjs" is on disk but is no node.

  @executable @cli @adapter @memory
  Scenario Outline: impact answers each file's dependents and dependencies through the port
    When "aof graph impact <path> --json" runs
    Then it exits 0
    And the file "<path>" is present <present>, with dependents <dependents> and dependencies <dependencies>
    And "builtAt" is the artifact's own modification instant

    Examples:
      | path            | present | dependents  | dependencies |
      | src/a.mjs       | true    | src/c.mjs   | src/b.mjs    |
      | src/lonely.mjs  | true    | (none)      | (none)       |
      | src/missing.mjs | false   | (none)      | (none)       |

  @executable @cli @adapter @memory
  Scenario: the human render still separates a coverage gap from real isolation
    When "aof graph impact src/lonely.mjs src/missing.mjs" runs
    Then "src/lonely.mjs" is labelled as in the graph with no cross-file edges
    And "src/missing.mjs" is labelled as not covered by this graph
    And the closing line names "src/missing.mjs" as coupling unknown, not zero

  @executable @cli @adapter @memory
  Scenario: the impact answer over a fixed artifact matches the golden answer captured before the port
    Given a golden "--json" answer for "aof graph impact src/a.mjs src/c.mjs src/missing.mjs" over the fixture, captured from the pre-port command and committed with the suite
    When the same command runs through the port, with the artifact's modification time pinned
    Then stdout is byte-identical to the golden answer

  @executable @cli @adapter @memory
  Scenario: with no artifact, impact is refused with no-graph, ahead of the empty-paths check
    Given the project has no "graphify-out/graph.json"
    When "aof graph impact --json" runs with no path
    Then it exits non-zero with code "no-graph"

  @executable @cli @adapter @memory
  Scenario Outline: relations reports the code corpus unavailable from one place, with its cause
    Given the code backend's artifact is <state>
    When the port is asked relations of "src/a.mjs"
    Then the answer is served true and available false
    And "unavailable" is "<unavailable>" and "cause" is <cause>
    And "files" is empty and "builtAt" is null

    Examples:
      | state                          | unavailable      | cause                         |
      | absent                         | no-graph         | "ENOENT"                      |
      | a file holding "{not json"     | graph-unreadable | the JSON parser's message     |
      | valid JSON with no "links" key | graph-unreadable | the normaliser's message      |

  @executable @cli @adapter @memory
  Scenario: status of the code corpus reports binary and artifact from the same availability check
    Given no graphify binary resolves and the project has no artifact
    When the port is asked status of "code"
    Then the answer's binary is "graphify-missing" and "unavailable" is "no-graph"

  @executable @cli @adapter @memory
  Scenario: relations walks the edges once per call, however many paths are asked
    Given a graph of 200 files whose edges are counted as they are read
    When the port is asked relations of 50 of those files
    Then the edges were walked exactly once
    And each file's answer equals the answer it gets when asked about alone

  @executable @cli @adapter @memory
  Scenario: two calls in one process read the artifact twice, so a rebuilt graph is seen
    Given the port answered relations of "src/a.mjs" over the fixture
    And "graphify-out/graph.json" is rewritten so "src/a.mjs" also imports "src/lonely.mjs"
    When the port is asked relations of "src/a.mjs" again
    Then its dependencies are "src/b.mjs" and "src/lonely.mjs"
