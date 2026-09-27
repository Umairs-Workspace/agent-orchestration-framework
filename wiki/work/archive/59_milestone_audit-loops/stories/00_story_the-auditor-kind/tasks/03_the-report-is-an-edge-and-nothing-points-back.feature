@executable @cli @work @validate
Feature: The report is an edge out of the auditor, and no record may point back at one

  Where the audit's findings go is not a policy note — it is an edge on the graph, so it can be read,
  drawn and checked. `reporting` is that edge, and it is declared outbound from the auditor like every
  other edge in this registry.

  It is a sixth edge key rather than a reuse of `monitoring` because `monitoring` already means
  something precise that another milestone's independence legs read — *this node computes a
  counter-metric on that optimizer*. Overloading it would make "the audit found something about your
  gate" indistinguishable from "you have a watcher", which is the one distinction this milestone is
  about.

  Nothing points at an auditor. No record may name one as an endpoint, which is the structural form
  of the claim that nothing in the machinery can supervise the audit into silence.

  ADR-001 §3. FF-5901.

  Scenario: an auditor declares where its findings go
    Given an auditor declaring a reporting edge to a declared actor
    When the registry is loaded
    Then the edge is parsed as an outbound edge of the auditor
    And the actor is its endpoint

  Scenario: the edge may name any node the registry already admits as an endpoint
    Given an auditor declaring reporting edges to a declared actor and a declared loop
    When the registry is loaded
    Then both edges are parsed
    And no bad-value finding names the reporting key

  Scenario: a reporting edge to a node nobody declares is dangling
    Given an auditor declaring a reporting edge to an id no record declares
    When the registry is loaded
    Then the existing dangling-endpoint finding names the missing endpoint

  Scenario: no record may point at an auditor
    Given a loop declaring a monitoring edge whose endpoint names a declared auditor
    When the registry is loaded
    Then a bad-value finding names the edge key
    And the auditor is not reachable as the endpoint of any edge

  Scenario: the edge vocabulary is closed at six
    Given the loaded edge vocabulary
    When it is read back
    Then it holds exactly the six declared edge keys
    And the five that existed before this milestone are all still members

  Scenario: an edge key nobody has declared is still refused
    Given a record declaring a seventh edge key
    When the registry is loaded
    Then the record's unknown key is refused
    And no edge is parsed from it
