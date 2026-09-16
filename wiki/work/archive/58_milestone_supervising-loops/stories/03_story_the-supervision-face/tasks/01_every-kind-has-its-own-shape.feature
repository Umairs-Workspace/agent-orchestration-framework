@executable @cli @work @work-stream
Feature: work:loops graph — one shape per declared kind, and the fallback left exactly where it is

  `aof work loops graph [--format mermaid] [--json]` draws a rectangle for `kind: loop`, a stadium
  for `kind: actor`, and drops every other kind through the parallelogram it uses for an endpoint
  nobody declared. So an `anchor`, a `watcher` and — from this milestone — an `arbiter` are the same
  picture as each other and the same picture as a dangling `loop:` reference: a reader cannot tell an
  authority from an observer from a judge, and adding a fifth kind makes it worse.

  This story gives each of the five declared kinds a shape of its own, and every declared node keeps
  its `id · title` label whatever its kind. Nothing else about the picture moves: the fallback for an
  endpoint nobody declared stays the parallelogram carrying the raw endpoint text, node lines stay in
  lexicographic id order, node keys keep their total mangling, edge lines keep their arrow form and
  their label, and both counts keep their meanings.

  The restraint: the glyph ASSIGNED to each kind is a choice made here, but the property that
  outlives the choice is the one the guard holds — the number of distinct shapes the renderer emits
  equals the number of declared kinds, so a sixth kind fails CI until somebody gives it a glyph
  instead of silently borrowing a shape that says something it is not.

  ADR-003 §1 · ADR-006 §1 and §Codebase health · FF-5808 · 52/FF-5208 (the frozen bytes, order and
  fallback this story must not move)

  Scenario: the five declared kinds are five different pictures
    Given a registry declaring loop:build, actor:operator, anchor:policy, watcher:eye and arbiter:trade-off
    When I run `aof work loops graph`
    Then the diagram's first line begins with "flowchart"
    And each of the 5 nodes has its own node line
    And the 5 lines use 5 different shape delimiters — no two kinds collide
    And the process exits 0

  Scenario: the three kinds that render identically today are told apart
    Given a registry declaring anchor:policy, watcher:eye and arbiter:trade-off
    When I run `aof work loops graph --json`
    Then the anchor line, the watcher line and the arbiter line each use different delimiters from the other two
    And none of the three uses the delimiters an endpoint nobody declared is given
    And each carries the label `<id> · <title>`, not the bare id an undeclared endpoint carries

  Scenario: the fallback for an endpoint nobody declared is unchanged
    Given loop:build declares `monitoring: [command:work:next]`, `parameter-tuning: [config:work.foo]`, `data-feed: [module:src/run-store.mjs#isStale]` and `veto: [loop:nowhere]`
    And no record declares loop:nowhere
    When I run `aof work loops graph --json`
    Then each of those four endpoints renders as the parallelogram, carrying its raw text verbatim and no title
    And those four lines are byte-identical to the lines the same registry emitted before this story
    And no declared kind is rendered in that shape

  Scenario: a record whose kind the vocabulary does not admit borrows no kind's glyph
    Given `loops/odd.md` declares an id and a `kind:` value that is none of the five declared kinds
    When I run `aof work loops graph --json`
    Then the diagram is emitted and the process exits 0
    And that node renders in the undeclared-endpoint shape
    And it is drawn as none of loop, actor, anchor, watcher or arbiter

  Scenario: the same registry renders byte-identically, twice over and in a second process
    Given a registry holding one node of each of the five declared kinds and 5 edges between them
    When I render the graph twice in one process and once more in a separate process
    Then the three texts are byte-identical

  Scenario: the picture does not depend on the order the records were discovered
    Given workspace A whose records were authored in the order anchor, actor, arbiter, loop, watcher
    And workspace B holding the same five records authored in the reverse order
    When I run `aof work loops graph` in each workspace
    Then the two texts are byte-identical
    And in both, the node lines appear in lexicographic id order — the shapes do not group the picture by kind
    And the order is unchanged when the record files are renamed to change directory read order

  Scenario: a registry holding every declared kind draws every one of them, and the edges between them
    Given actor:operator declares `target-setting: [arbiter:trade-off]`
    And arbiter:trade-off declares `veto: [loop:build]` and `parameter-tuning: [config:work.loop.reviewRounds]`
    And anchor:policy declares `data-feed: [loop:build]`
    And watcher:eye declares `monitoring: [loop:build]`
    When I run `aof work loops graph --json`
    Then the text carries a node line for each of the 5 declared nodes and one for the config: endpoint
    And it carries 5 edge lines, each labelled with its own edge type
    And every key named on an edge line is the key of a node line in the same text
    And nodeCount is 5 — the declared records — and edgeCount is 5, both meaning exactly what they meant before the new kinds existed

  Scenario: every declared node carries its id and its title, whatever its kind
    Given records declaring one node of each of the five kinds, one of which declares no `title:`
    When I run `aof work loops graph --json`
    Then each of the five labels is `<id> · <title>`, in the shape its own kind is given
    And the one with no title reads `<id> · -`, in its own kind's shape rather than a different one
    And an undeclared endpoint still carries its raw text alone, with no separator and no title

  Scenario: node keys and edge lines are untouched by the new shapes
    Given a registry declaring anchor:run-lifecycle-policy and arbiter:speed-thoroughness-autonomy
    When I run `aof work loops graph --json`
    Then their node keys are `anchor_run_lifecycle_policy` and `arbiter_speed_thoroughness_autonomy` — the same total mangling every id gets
    And no node key in the text contains a ":" or a "-"
    And no two node lines share a node key
    And an edge line is still `<source key> -->|<edge type>| <target key>`

  Scenario Outline: a declared kind, and the shape it renders as
    Given `loops/x.md` declares `kind: <kind>`, an id in that kind's own scheme and `title: T`
    When I run `aof work loops graph --json`
    Then that node's line is exactly `<the line emitted>`
    And no other declared kind emits that shape
    And that shape is not the one an endpoint nobody declared is given

    Examples: one shape per declared kind — five kinds, five shapes, and the count of DISTINCT shapes the renderer emits equals the count of declared kinds, which is the property a sixth kind fails until somebody gives it a glyph of its own
      | kind    | shape         | reads as       | the line emitted             |
      | loop    | rectangle     | a cycle        | loop_x["loop:x · T"]         |
      | actor   | stadium       | somebody       | actor_x(["actor:x · T"])     |
      | anchor  | circle        | a fixed point  | anchor_x(("anchor:x · T"))   |
      | watcher | hexagon       | an instrument  | watcher_x{{"watcher:x · T"}} |
      | arbiter | rhombus       | a decision     | arbiter_x{"arbiter:x · T"}   |

  Scenario Outline: an endpoint nobody declared keeps the shape it already has
    Given loop:build declares an edge naming <endpoint>
    And no record declares <endpoint>
    When I run `aof work loops graph --json`
    Then that endpoint's line is exactly `<the line emitted>`
    And its label is the raw endpoint text, carrying no title
    And no declared kind emits that shape

    Examples: the four undeclared-endpoint forms the render-determinism guard already pins — this story moves none of them, which is what keeps the repair additive
      | endpoint                          | the line emitted                                                       |
      | command:work:next                 | command_work_next[/"command:work:next"/]                               |
      | config:work.loop.reviewRounds     | config_work_loop_reviewRounds[/"config:work.loop.reviewRounds"/]       |
      | module:src/run-store.mjs#isStale  | module_src_run_store_mjs_isStale[/"module:src/run-store.mjs#isStale"/] |
      | loop:nowhere — declared by nobody | loop_nowhere[/"loop:nowhere"/]                                         |
