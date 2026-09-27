@executable @cli @work @validate
Feature: The pairing is the monitoring edge already in the schema, declared outbound from the watcher

  There are five edge keys and there will still be five. The pairing this milestone enforces is the
  monitoring edge milestone 52 already froze, already declared outbound from the source node only,
  and which the pairing check already reads. Adding a sixth key would mean two ways to say the same
  thing, and the second one would be the one that drifts.

  The direction matters as much as the key. The edge is declared by the watcher, pointing at what it
  watches — so the watched loop declares nothing at all. That is milestone 55's ruling about anchors
  applied again for the same reason: a requirement satisfiable by writing a line in your own record
  is a requirement satisfiable by fabrication. A loop nothing points at is simply a loop nothing
  points at.

  ADR-001. FF-5701, FF-5702.

  Scenario: a watcher declares the loop it watches
    Given a watcher declaring a monitoring edge to a loop
    When the registry is loaded
    Then the edge is declared on the watcher
    And the loop it names is the endpoint

  Scenario: loading the edge does not synthesize a reverse declaration on the watched loop
    Given a watcher declaring a monitoring edge to a loop
    When the registry is loaded
    Then the parsed loop carries no watcher field or reverse edge

  Scenario: a loop attempting to name its own watcher is refused
    Given a loop record declaring a watcher key
    When the registry is loaded
    Then the existing unknown-key finding names it
    And the parsed loop carries no watcher field or edge

  Scenario: an edge to an endpoint that does not exist is still dangling
    Given a watcher declaring a monitoring edge to an id no record declares
    When the registry is loaded
    Then the existing dangling-endpoint finding names the missing endpoint

  Scenario: a watcher may watch more than one loop
    Given a watcher declaring monitoring edges to two loops
    When the registry is loaded
    Then both loops are endpoints of that watcher
