@executable @docs @work @work-stream
Feature: The graph, scoped to what ran

  A per-item graph that redrew the framework-wide picture would be worthless — `SPEC.md` says so, and
  it is the reason this milestone exists rather than a `--out` flag on the command 52 shipped. So the
  scope is the execution model's own answer: the loops the item ENGAGED, the actuators those loops
  declare, and the reference owners they answer to. Nothing else is drawn.

  THE CONVENTIONS ARE 52's, AND MOST OF THEM ARE RESTATED — `flowchart LR`, code-unit sort on nodes
  and on edges, collision-safe node keys. ONE is imported rather than restated: `KIND_SHAPES`
  (`src/commands/loops-graph.mjs:32`), because a second hand-copied glyph table drifts the first time
  a seventh kind lands, and 58 and 59 each landed one (ADR-006). Importing an export changes no bytes
  of the frozen renderer; FF-7802 asserts both halves of that — one table, and `loops-graph.mjs`
  byte-unmodified.

  Scenario: only the loops that ran are drawn
    Given a registry of 17 loop records
    And an execution model reporting engagements of 2 of them
    When the graph is rendered
    Then it carries a node for each of those 2 loops
    And it carries no node for the 15 that did not run

  Scenario: a loop's actuators and reference owners are drawn with it
    Given an engagement of a loop declaring one actuator and one reference owner
    When the graph is rendered
    Then the loop, its actuator and its reference owner each carry a node
    And the edges between them carry the edge types the registry declares

  Scenario: the glyph for each node kind comes from the one shared table
    Given an execution model whose engaged loops reach a node of every declared kind
    When the graph is rendered
    Then each node is drawn with the shape `KIND_SHAPES` gives its kind
    And no glyph literal appears in this renderer that is not obtained from that table

  Scenario: an endpoint the vocabulary does not admit falls to the undeclared shape
    Given an engagement reaching an endpoint whose kind the loader does not admit
    When the graph is rendered
    Then that node is drawn with the undeclared-endpoint shape
    And it borrows no declared kind's glyph

  Scenario: node keys are collision-safe
    Given two endpoint ids that mangle to the same key
    When the graph is rendered
    Then the two nodes carry distinct keys
    And each edge names the key of the node it meant

  Scenario: node and edge order is canonical
    Given an execution model whose engagements are supplied in one order
    And the same model with its engagements supplied in the reverse order
    When the graph is rendered from each
    Then the two renderings are byte-identical

  Scenario: an empty scope renders a graph, not a blank
    Given an execution model reporting no engagements
    When the graph is rendered
    Then the output states that no loop ran for this item
    And it is distinguishable from a rendering that failed to run

  Scenario: the frozen renderer is not called and not changed
    Given the item-scoped graph is rendered
    Then `renderLoopGraph` produced none of these bytes
    And `src/commands/loops-graph.mjs` is unmodified by this story
