Feature: The graph faces read no artifact and spawn nothing; the controls that guard them are amended, never deleted

  WHY. "Two faces that reach the graph only through the port" is a structural claim, and it decays the
  first time someone imports `computeImpact` back into a command because it is quicker. The
  milestone-09 bijection control already spawns every `aof graph` verb against a fixture with no
  binary and no graph. Amending it to pin the port is how the claim stays true. The graphify code
  backend also joins FF-17901's declaration check, because it is the one backend that serves `code`
  and so must never declare `recall` (179/ADR-002, ADR-003; FF-17903, FF-17901).

  @executable @cli @adapter @memory
  Scenario Outline: the graph faces import none of the graph's readers
    When the static imports of "<module>" are read
    Then it imports none of "readGraph", "normalizeGraph", "computeImpact" or the graphify driver

    Examples:
      | module                                         |
      | packages/knowledge/src/commands/graph-build.mjs  |
      | packages/knowledge/src/commands/graph-impact.mjs |

  @executable @cli @adapter @memory
  Scenario Outline: the amended bijection pins each face's miss to the port's code
    Given the bijection fixture: an aof project with no graphify binary and no built graph
    When "aof graph <verb> --json" is spawned
    Then stdout is a single JSON envelope with code "<code>"

    Examples:
      | verb                               | code             |
      | build .                            | graphify-missing |
      | impact packages/core/src/cli.mjs   | no-graph         |

  @executable @cli @adapter @memory
  Scenario: every graph verb is still registered with a CLI adapter and a route
    When the command registry is listed
    Then "graph:build", "graph:query", "graph:triage", "graph:impact", "graph:serve", "graph:export", "graph:import", "graph:fetch", "graph:publish" and "graph:prune" are each present with a route and an argv and render function

  @executable @cli @adapter @memory
  Scenario: the graphify code backend declares the code corpus and no recall
    When FF-17901 checks the graphify code backend's declaration
    Then it declares exactly "code" with "ingest", "relations" and "status"
    And no backend declaring "code" declares "recall"

  @executable @cli @adapter @memory
  Scenario: FF-17903 fails when a face reads the artifact itself
    Given "commands/graph-impact.mjs" is edited to import "computeImpact"
    When the amended bijection control runs
    Then it fails naming "commands/graph-impact.mjs" and "computeImpact"
