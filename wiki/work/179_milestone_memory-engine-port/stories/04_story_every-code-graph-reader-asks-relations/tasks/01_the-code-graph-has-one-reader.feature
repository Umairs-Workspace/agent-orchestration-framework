Feature: The code graph has one reader, and a new one is refused by name

  WHY. The milestone's outsider check is "one engine seam, and two faces that reach the graph only
  through it". That stops being true the day a new selector imports `normalizeGraph` because it is
  quicker. FF-17904 fixes the set of modules that may read the graph's edges, and names the one
  exception, the retiring graphify memory backend, so that the exception has to be deleted with it
  (179/ADR-004, FF-17904).

  @executable @cli @adapter @work
  Scenario: only the allowed modules import the graph's readers
    When the static imports across "packages/*/src" are scanned for "readGraph", "normalizeGraph" and "computeImpact"
    Then the importing modules are a subset of "graphify-code-backend.mjs", "graph-normalize.mjs", "graph-impact.mjs", "graphify.mjs" and "memory/graphify-backend.mjs"
    And no core binding imports any of the three

  @executable @cli @adapter @work
  Scenario: FF-17904 is registered in the graph arch index
    When the graph arch index is loaded
    Then it spreads the cases of "acd-code-graph-one-reader"

  @executable @cli @adapter @work
  Scenario: FF-17904 fails naming a new reader
    Given "packages/work/src/testing/select.mjs" is edited to import "readGraph" from the graph-normalize module
    When FF-17904 runs
    Then it fails naming "packages/work/src/testing/select.mjs", the line of that import, and "readGraph"

  @executable @cli @adapter @work
  Scenario: the retiring backend's exception is named, not a wildcard
    When FF-17904's allowlist is read
    Then "memory/graphify-backend.mjs" appears as one exact path with the reason "reads its own .aof/memory-graph artifact until retire-graphify-memory-backend"
    And the allowlist holds no glob
