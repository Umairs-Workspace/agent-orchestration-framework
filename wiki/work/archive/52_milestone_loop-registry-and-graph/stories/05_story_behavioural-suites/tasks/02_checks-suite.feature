@executable @cli @work @validate @bug @finding-F-52-04-H
Feature: The checks suite — six pure algorithms over literal models, with every negative carrying its positive control

  `test/work-loops-checks.test.mjs`, registered in `scripts/test.mjs`. It mechanises all six features of
  52/01 — `00_scc-decomposition` (17), `01_groundedness-check` (14), `02_unpaired-and-unowned` (22),
  `03_shared-actuator-arbitration` (19), `04_timescale-comparability` (21) and `05_frozen-finding-codes`
  (22) — 115 scenarios, of which roughly 80 are this suite's to decide.

  THIS SUITE TOUCHES NO FILESYSTEM, and that is a design constraint rather than an accident. The six
  exported subjects — `decomposeLoopGraph` and the five checks — each take one argument and read only
  `model.nodes` and `model.source`. Every fixture is therefore a literal `{source, nodes}` object, which
  is what makes the purity claim assertable at all: the same literal driven from a different cwd, with a
  different environment, and with `present` flipped, must produce identical findings.

  WHAT IS ALREADY DECIDED AND MUST NOT BE REBUILT. FF-5205 owns the checks module's source purity, the
  transitive import disjointness, the `CHECK_IDS`-to-function mapping, the arity, and byte-stability
  in-process and across processes. FF-5206 owns the exhaustive 6×6 cadence cross-product and the
  out-of-domain sweep. FF-5209 owns the four-key envelope, the frozen code set, the ternary `path` rule,
  the five checks' literal oracles and the combined loader-then-checks order emitted by the real
  `work:loops-validate`. Roughly 50 of the 115 are theirs; each is a ledgered exclusion naming its gate.

  THE VACUITY TRAP THIS SUITE IS BUILT AGAINST. Eighteen of the covered scenarios assert an EMPTY
  result, and all eighteen are green over a check that returns `[]` unconditionally. Every such case
  therefore carries, in the same case, the same model with one field changed that DOES fire. That is not
  belt-and-braces; it is the only thing separating "the rule holds" from "the check is dead".

  THE SCOPING RULE, measured at refine. `checkReferenceOwnership` reports `loop-unowned-reference` for
  EVERY `kind: loop` node with no inbound `target-setting` from another node — so any second loop
  introduced into a fixture as a watcher or a target-setter draws its own finding. Every assertion in
  this suite is scoped by node id or path, never by array length, and `02_unpaired-and-unowned`'s
  Examples row at line 208 supplies the third-party inbound edge its scenario at lines 141-146 leaves
  implicit. Completing an under-specified Given from the feature's own case table is reading the feature
  whole; it is not licence to rewrite a scenario to match the code.

  ADR-005 §2–§3, ADR-007 §3, ADR-011 §1, §8, §9, §10, §12, ADR-012 §3.

  Scenario: the decomposition is over the union of all five edge types
    Given an acyclic chain, a mutual pair, a three-cycle and a five-cycle whose edges use all five edge keys
    When the graph is decomposed
    Then the chain yields singletons and each cycle yields one component holding exactly its members
    And the five-cycle is one component, so no single edge type decided it

  Scenario: the decomposition returns every component, not the first it finds
    Given two disjoint cycles, a self-loop, an isolated node and an actor inside a cycle
    When the graph is decomposed
    Then both multi-member components are returned
    And the self-loop is a singleton and raises nothing
    And the actor is a member of its component like any other node

  Scenario: only declared nodes are members
    Given "loop:a" declaring edges to an undeclared loop, a command, a module, a config key and an item
    When the graph is decomposed
    Then one component holds exactly "loop:a"
    And no component holds an undeclared or extra-registry endpoint

  Scenario: component and member order are canonical
    Given a mutual pair "loop:z" and "loop:a", plus singletons "loop:m" and "actor:b"
    When the graph is decomposed
    Then members are ordered by node id, code unit by code unit
    And components are ordered by their least member
    And an empty model yields no components and raises nothing

  Scenario: ground flows forward out of a ground-bearing actor
    Given "actor:operator" carrying "ground: exogenous" and a target-setting edge into "loop:a", with "loop:a" and "loop:b" in a mutual pair
    When the grounding check runs
    Then that component reports "loop-graph-grounded-exogenous-only" at warn
    And the message names the ground class and the component's members
    And the same shape with the edge reversed reports the component ungrounded

  Scenario: ground off an actor grounds nothing, and neither does an actor without ground
    Given a model whose only "ground:" key sits on a "kind: loop" node
    And a second model whose actor carries a target-setting edge but no "ground:" key
    And a third model with no ground-bearing node at all
    When the grounding check runs over each
    Then every component of all three is reported ungrounded
    And no grounded verdict is reported anywhere in any of them

  Scenario: a verdict is per component, never per member, and anchors at the graph
    Given a three-node cycle reachable from a ground-bearing actor
    When the grounding check runs
    Then exactly one finding is reported for that component
    And no finding is reported per member
    And every verdict's path is the model's source directory, never a node's own file

  Scenario: pairing turns on a third party's INBOUND monitoring edge and nothing else
    Given "loop:a" declaring "optimizing: true", with its inbound monitoring edge in turn absent, from a third-party loop, from an actor, declared OUTBOUND from itself, and of another edge type
    When the pairing check runs
    Then "loop-unpaired-optimizer" is reported for "loop:a" in every case except the third-party inbound one
    And each finding is anchored at "loop:a"'s own file
    And every assertion names "loop:a", so a second loop's own findings cannot satisfy or break the case

  Scenario: a named owner never clears an unowned reference
    Given "loop:a" with its inbound target-setting edge in turn absent, from an actor, from another loop, and declared outbound from itself
    And the same four models with "owner: actor:product-owner" and with "owner: unknown"
    When the reference-ownership check runs
    Then "loop-unowned-reference" turns on the inbound edge alone
    And a named owner field never clears it — the check is about blindness upward, not about attribution

  # THE NEAR MISS. FF-5209 pins pairing→monitoring and reference-ownership→target-setting on two
  # SEPARATE models, so cross-attribution is invisible to it. One node carrying both is the only shape
  # that catches it.
  Scenario: a self-edge is attributed to the check that owns its edge type
    Given one node declaring "optimizing: true", a monitoring self-edge AND a target-setting self-edge
    When the pairing and reference-ownership checks run
    Then exactly two "loop-self-referential-edge" findings are reported — the monitoring one from pairing, the target-setting one from reference-ownership
    And each check reports the one that belongs to it and not the other
    And both inbound verdicts still fire, because a node cannot satisfy an independence requirement with itself

  Scenario: a self-edge of an unrelated type is not a self-referential finding
    Given one node declaring data-feed, veto and parameter-tuning self-edges and no monitoring or target-setting self-edge
    And the same model with a monitoring self-edge added
    When the two checks run over each
    Then the first model reports no "loop-self-referential-edge"
    And the second does — the positive control that makes the first case mean something

  Scenario: a shared actuator is arbitrated only by a single non-member covering the whole set
    Given "loop:a" and "loop:b" declaring the same actuator, with a veto edge in turn absent, from a non-member over the whole set, from a non-member over part of it, split across two non-members, and from a member
    When the arbitration check runs
    Then "loop-shared-actuator-unarbitrated" is reported in every case except the single non-member over the whole set
    And the finding names the actuator and every contender
    And it is anchored at the model's source directory

  Scenario: actuator matching is exact, scheme-agnostic and counted per actuator
    Given "a:[x,y] b:[x] c:[y]", then "a:[x] b:[y]", then "a:[x,x]" alone, then a "prose:" actuator shared by two loops
    When the arbitration check runs
    Then two findings are reported for the first — one per contested actuator, never one per pair
    And none for the second, none for the third
    And one for the fourth, because matching is on the raw value and not on its scheme

  Scenario: a timescale finding is anchored at the declaring node and names both sides
    Given "loop:a" declaring a target-setting edge to "loop:b", the two on incomparable axes
    When the timescale check runs
    Then the finding is anchored at "loop:a"'s own file
    And it is not anchored at "loop:b"'s file and not at the model's source
    And its message names the non-clock side and its cadence

  Scenario: the exclusion is per EDGE, never per node
    Given "loop:a" declaring "target-setting: [loop:a, loop:b]" with both loops periodic and the ratio 1
    When the timescale check runs
    Then exactly one finding is reported — the inversion on the edge to "loop:b"
    And nothing is reported for the self-edge
    And the same holds with the self-edge at an unknown cadence and at an event cadence

  Scenario: the check runs over target-setting edges and reports each of a node's edges in frozen order
    Given "loop:a" at an unknown cadence declaring target-setting edges to "loop:b" and "loop:c"
    And the same pair joined instead by monitoring, veto and parameter-tuning edges
    When the timescale check runs over each
    Then two not-comparable findings are reported for the first, both anchored at "loop:a"'s file and ordered by message
    And the second reports nothing at all

  Scenario: the checks read the model they are handed and nothing else
    Given one literal model whose source and node paths name locations that do not exist on disk
    When each check runs from a different working directory, under a different environment, and with "present" flipped to false
    Then the findings are identical across all four runs
    And no check raises
    And a model whose findings array already holds loader-lane findings comes back with its nodes and findings arrays unchanged

  Scenario: the suite's negatives are controlled and its subjects are the exported functions
    Given every case in this suite
    When the suite runs
    Then every case asserting an empty result carries, in the same case, the same model with one field changed that DOES fire
    And every assertion that a finding fired names its code, never merely a length
    And every assertion is scoped by node id or path, never by the length of the findings array
    And no case reads a file, so a fixture path that does not exist is harmless

  # THE SUITE'S CASE TABLE. Every fixture is a literal model; the deciding observation always names a
  # CODE, because a length assertion is green over a check emitting the wrong one.
  Examples:
    | covered feature                | fixture the case needs                                                                                  | deciding observation                                                                                         |
    | 00_scc-decomposition           | acyclic chain; mutual pair; 3-cycle; 5-cycle spanning all five edge keys                                 | singletons / one {a,b} / one {a,b,c} / one 5-member component — the UNION of edge types, not one              |
    | 00_scc-decomposition           | two disjoint cycles; a self-loop; an isolated node; an actor in a cycle                                   | BOTH components returned; the self-loop a singleton raising nothing; the actor a member like any other        |
    | 00_scc-decomposition           | "loop:a" with edges to an undeclared loop and to all four extra-registry schemes                          | one component holding exactly "loop:a"; no component holds any of the five                                    |
    | 00_scc-decomposition           | mutual "loop:z"/"loop:a" plus "loop:m" and "actor:b"; and the empty model                                 | members by id code units, components by least member; the empty model gives 0 components and no throw          |
    | 01_groundedness-check          | grounded actor → "loop:a", with "loop:a"↔"loop:b"; then the same with the edge reversed                   | grounded-exogenous-only at warn naming class AND members; the reversed shape ungrounded                       |
    | 01_groundedness-check          | ground on a loop; an actor with no ground; a graph with no ground at all                                  | every component ungrounded in all three; NO grounded verdict anywhere                                         |
    | 01_groundedness-check          | a 3-node cycle reachable from ground                                                                      | EXACTLY one verdict for the component, never per member; path is the model's source                           |
    | 02_unpaired-and-unowned        | "optimizing: true" × inbound monitoring ∈ {absent, third-party, actor, OUTBOUND, other edge type}         | unpaired-optimizer anchored at the node's own file in every case but the third-party inbound one              |
    | 02_unpaired-and-unowned        | inbound target-setting ∈ {absent, actor, another loop, outbound} × owner ∈ {named, unknown}               | unowned-reference turns on the INBOUND EDGE alone; a named owner never clears it                              |
    | 02_unpaired-and-unowned        | ONE node with "optimizing: true", a monitoring self-edge AND a target-setting self-edge                    | exactly 2 self-referential findings, one from each check, neither cross-attributed; both inbound verdicts fire |
    | 02_unpaired-and-unowned        | data-feed/veto/parameter-tuning self-edges alone; then the same model with a monitoring self-edge          | zero self-referential findings; then one — the positive control                                               |
    | 03_shared-actuator-arbitration | a:[x] b:[x] × veto ∈ {absent, non-member over all, non-member over part, two half-arbiters, a member}      | one finding naming the actuator and every contender, anchored at source, cleared ONLY by the single non-member |
    | 03_shared-actuator-arbitration | a:[x,y] b:[x] c:[y]; a:[x] b:[y]; a:[x,x] alone; a "prose:" actuator shared by two loops                   | 2 / 0 / 0 / 1 — one finding per contested ACTUATOR, matching exact and scheme-agnostic                        |
    | 04_timescale-comparability     | "loop:a" → "loop:b" on incomparable axes                                                                   | anchored at "loop:a"'s file, NOT "loop:b"'s and NOT source; message names the non-clock side and its cadence   |
    | 04_timescale-comparability     | "target-setting: [loop:a, loop:b]" with both periodic at ratio 1; self-edge also at unknown and event      | exactly 1 finding — the a→b inversion; nothing for a→a at any cadence; exclusion is per EDGE                   |
    | 04_timescale-comparability     | unknown-cadence "loop:a" → "loop:b","loop:c"; then the same pair on the other three edge types             | 2 not-comparable, both at "loop:a"'s file, ordered by message; the other three edge types emit nothing         |
    | 05_frozen-finding-codes        | one literal model whose paths do not exist, run from four different process states                         | identical findings in all four, no throw, and the input model's nodes and findings arrays unchanged           |
