@executable @cli @work @validate
Feature: The SCC decomposition — every component, over the union of all five edge types

  The groundedness check needs a real decomposition, not a first-cycle probe: Tarjan
  over the UNION of `data-feed`, `target-setting`, `monitoring`, `veto` and
  `parameter-tuning`, returning EVERY strongly connected component of the declared
  graph. Nodes are the declared `loop:`/`actor:` records; intra-registry endpoints are
  the edges; extra-registry endpoints are not nodes and never enter the graph.
  Duplicate endpoint entries never reach here: the loader collapses each edge key's
  endpoint list silently, so a repeated entry is one edge and no finding.
  ADR-007 §3 check 1, ADR-004 §1 and §3, as ruled by ADR-012 §3/C2.

  Scenario: an acyclic graph decomposes to singleton components
    Given a model declaring `loop:a`, `loop:b` and `loop:c`
    And `loop:a` declaring `data-feed: [loop:b]` and `loop:b` declaring `data-feed: [loop:c]`
    When the graph is decomposed
    Then there are 3 components
    And each component holds exactly one node

  Scenario: a two-node mutual pair is one component
    Given a model declaring `loop:a` with `data-feed: [loop:b]`
    And `loop:b` with `data-feed: [loop:a]`
    When the graph is decomposed
    Then there is 1 component
    And that component holds exactly `loop:a` and `loop:b`

  Scenario: a three-node cycle is one component
    Given a model declaring `loop:a` with `data-feed: [loop:b]`
    And `loop:b` with `data-feed: [loop:c]`
    And `loop:c` with `data-feed: [loop:a]`
    When the graph is decomposed
    Then there is 1 component
    And that component holds exactly `loop:a`, `loop:b` and `loop:c`

  Scenario: a cycle spanning two different edge types is still one component
    Given a model declaring `loop:outer` with `target-setting: [loop:inner]`
    And `loop:inner` with `data-feed: [loop:outer]`
    When the graph is decomposed
    Then there is 1 component holding exactly `loop:outer` and `loop:inner`
    And no component is derived from any single edge type alone

  Scenario: a cycle spanning all five edge types is one component
    Given a model declaring `loop:a` with `data-feed: [loop:b]`
    And `loop:b` with `target-setting: [loop:c]`
    And `loop:c` with `monitoring: [loop:d]`
    And `loop:d` with `veto: [loop:e]`
    And `loop:e` with `parameter-tuning: [loop:a]`
    When the graph is decomposed
    Then there is 1 component holding all five nodes

  Scenario: disconnected subgraphs decompose independently
    Given a model declaring `loop:a` and `loop:b` in a mutual `data-feed` pair
    And `loop:c` and `loop:d` in a mutual `monitoring` pair
    And no edge between the two pairs
    When the graph is decomposed
    Then there are 2 components
    And one holds exactly `loop:a` and `loop:b`
    And the other holds exactly `loop:c` and `loop:d`

  Scenario: two disjoint cycles are BOTH reported — the decomposition is not a first-cycle probe
    Given a model declaring a cycle `loop:a` → `loop:b` → `loop:a`
    And a second, unconnected cycle `loop:c` → `loop:d` → `loop:c`
    When the graph is decomposed
    Then both multi-member components are reported
    And the result does not stop at the first cycle found

  Scenario: a node with no edges at all is its own component
    Given a model declaring `loop:orphan` with no edge key of any type
    When the graph is decomposed
    Then `loop:orphan` is a component holding exactly itself

  Scenario: an actor node is a graph node like any other
    Given a model declaring `actor:operator` with `target-setting: [loop:a]`
    And `loop:a` with `data-feed: [actor:operator]`
    When the graph is decomposed
    Then there is 1 component holding exactly `actor:operator` and `loop:a`

  Scenario: a self-loop does not crash and yields a singleton component
    Given a model declaring `loop:a` with `data-feed: [loop:a]`
    When the graph is decomposed
    Then no error is raised
    And `loop:a` is a component holding exactly itself

  Scenario: an edge to an endpoint with no declaring record does not crash and adds no member
    Given a model declaring `loop:a` with `data-feed: [loop:absent]`
    And no record declaring `loop:absent`
    When the graph is decomposed
    Then no error is raised
    And there is 1 component holding exactly `loop:a`
    And `loop:absent` appears in no component

  Scenario: an extra-registry endpoint is not a graph node
    Given a model declaring `loop:a` with `data-feed: [command:work:next, module:src/run-store.mjs#isStale, config:work.autonomous.maxAttempts, item:50]`
    When the graph is decomposed
    Then there is 1 component holding exactly `loop:a`
    And no component holds any `command:`, `module:`, `config:` or `item:` endpoint

  Scenario: a duplicate endpoint entry does not duplicate a member
    Given a literal model declaring `loop:a` with `data-feed: [loop:b, loop:b]`
    And `loop:b` with `data-feed: [loop:a]`
    And the loader deduplicates such a list before any real model reaches this check
    When the graph is decomposed
    Then there is 1 component
    And that component lists `loop:b` exactly once

  Scenario: the decomposition is deterministic across repeated invocation
    Given a model declaring a mixed graph of cycles, singletons and self-loops
    When the graph is decomposed twice in the same process
    Then the two results are identical — same component order, same membership order

  Scenario: the decomposition is deterministic in a fresh process
    Given the same literal model
    When the graph is decomposed in a newly started process
    Then the result is identical to the in-process result

  Scenario: components and their members are in a canonical order
    Given a model declaring `loop:z` and `loop:a` in a mutual pair, and singletons `loop:m` and `actor:b`
    When the graph is decomposed
    Then each component's members are ordered by node id
    And the components are ordered by their lexicographically-least member id

  Scenario: an empty graph decomposes to nothing
    Given a model declaring no nodes
    When the graph is decomposed
    Then there are 0 components
    And no error is raised

  Examples:
    | declared edge set                                                    | expected component partition |
    | none; nodes loop:a, loop:b                                           | {a} {b}                      |
    | a --data-feed--> b                                                   | {a} {b}                      |
    | a --data-feed--> b, b --data-feed--> a                               | {a,b}                        |
    | a --data-feed--> b --data-feed--> c --data-feed--> a                 | {a,b,c}                      |
    | a --target-setting--> b, b --data-feed--> a                          | {a,b}                        |
    | a --monitoring--> b, b --veto--> c, c --parameter-tuning--> a        | {a,b,c}                      |
    | a<->b (data-feed), c<->d (monitoring), no edge between               | {a,b} {c,d}                  |
    | a --data-feed--> a (self-loop)                                       | {a}                          |
    | actor:op --target-setting--> a, a --data-feed--> actor:op            | {actor:op,a}                 |
    | a --data-feed--> loop:absent (no record)                             | {a}                          |
    | a --data-feed--> command:work:next                                   | {a}                          |
    | a --data-feed--> b, b --data-feed--> a, plus isolated loop:m         | {a,b} {m}                    |
