@executable @cli @work @validate
Feature: The groundedness check — forward reachability from a ground-bearing node, never a silent pass

  The milestone's headline algorithm. A component is grounded iff at least one of its
  members is reachable FORWARD from a `ground:`-bearing node, along any of the five
  edge types — ground flows INTO a loop. `ground: exogenous` on a `kind: actor` node is
  the only ground 52 admits, and it is the WEAKEST class, so a component grounded by it
  is reported at `warn` with the class named, never as a silent green. A component with
  no ground path is reported ungrounded. This check's findings are returned in the
  frozen order of ADR-012 §3/C6 — sorted by `(path, code, message)`.
  ADR-005 §2 and §3, ADR-007 §3 check 1.

  Scenario: a component reachable from a ground-bearing actor is reported grounded-exogenous-only
    Given a model declaring `actor:operator` with `ground: exogenous` and `target-setting: [loop:a]`
    And `loop:a` and `loop:b` in a mutual `data-feed` pair
    When the groundedness check runs
    Then the component holding `loop:a` and `loop:b` reports `loop-graph-grounded-exogenous-only`
    And its severity is `warn`
    And its message names the ground class `exogenous`
    And its message names the component's members
    And no `loop-graph-ungrounded-component` is reported for that component

  Scenario: a grounded component is never reported as a silent pass
    Given a model in which every component is reachable from `actor:operator` with `ground: exogenous`
    When the groundedness check runs
    Then every component carries a verdict finding
    And no component is reported grounded without naming a ground class

  Scenario: a component with no ground path is ungrounded
    Given a model declaring `actor:operator` with `ground: exogenous` and `target-setting: [loop:a]`
    And `loop:b` and `loop:c` in a mutual `data-feed` pair with no edge from `actor:operator`
    When the groundedness check runs
    Then the component holding `loop:b` and `loop:c` reports `loop-graph-ungrounded-component`
    And its severity is `warn`

  Scenario: reachability is FORWARD only — a loop pointing AT the ground node is ungrounded
    Given a model declaring `actor:auditor` with `ground: exogenous` and no edge key of any type
    And `loop:a` with `data-feed: [actor:auditor]`
    When the groundedness check runs
    Then the component holding `loop:a` reports `loop-graph-ungrounded-component`
    And no grounded verdict is reported for `loop:a`

  Scenario: reachability is transitive across intermediate components
    Given a model declaring `actor:operator` with `ground: exogenous` and `target-setting: [loop:a]`
    And `loop:a` with `data-feed: [loop:b]`
    And `loop:b` with `monitoring: [loop:c]`
    When the groundedness check runs
    Then the components holding `loop:a`, `loop:b` and `loop:c` each report `loop-graph-grounded-exogenous-only`

  Scenario: reachability follows any of the five edge types
    Given a model declaring `actor:operator` with `ground: exogenous` and `monitoring: [loop:a]`
    When the groundedness check runs
    Then the component holding `loop:a` reports `loop-graph-grounded-exogenous-only`

  Scenario: the ground node's own component is grounded by itself
    Given a model declaring `actor:operator` with `ground: exogenous` and no edge key of any type
    When the groundedness check runs
    Then the component holding `actor:operator` reports `loop-graph-grounded-exogenous-only`
    And it is not reported ungrounded

  Scenario: `ground:` on a `kind: loop` node grounds nothing
    Given a model declaring `loop:a` carrying `ground: exogenous` and `data-feed: [loop:b]`
    And no `kind: actor` node carrying a `ground:` key
    When the groundedness check runs
    Then the component holding `loop:a` reports `loop-graph-ungrounded-component`
    And the component holding `loop:b` reports `loop-graph-ungrounded-component`
    And no grounded verdict is reported anywhere in the graph

  Scenario: an actor with no `ground:` key grounds nothing
    Given a model declaring `actor:product-owner` with no `ground:` key and `target-setting: [loop:a]`
    And no other actor node
    When the groundedness check runs
    Then the component holding `loop:a` reports `loop-graph-ungrounded-component`
    And the component holding `actor:product-owner` reports `loop-graph-ungrounded-component`

  Scenario: an agent-role actor does not launder ownership into ground
    Given a model declaring `actor:operator` with `ground: exogenous` and no edges
    And `actor:product-owner` with no `ground:` key and `target-setting: [loop:verify-triage-accept]`
    When the groundedness check runs
    Then the component holding `loop:verify-triage-accept` reports `loop-graph-ungrounded-component`

  Scenario: a graph with no ground-bearing node at all reports every component ungrounded
    Given a model declaring `loop:a`, `loop:b` in a mutual pair, and singletons `loop:c` and `actor:x`
    And no node carrying a `ground:` key
    When the groundedness check runs
    Then 3 `loop-graph-ungrounded-component` findings are reported
    And no grounded verdict is reported
    And the three are returned in the frozen `(path, code, message)` order — all three anchor at `source`, so the trio is ordered by `message`

  Scenario: exactly one verdict per component, never per node
    Given a model declaring `loop:a`, `loop:b` and `loop:c` in one cycle, all reachable from a ground node
    When the groundedness check runs
    Then exactly 1 finding is reported for that component
    And no finding is reported per member

  Scenario: whole-graph verdicts anchor at the loops directory
    Given any model with at least one component
    When the groundedness check runs
    Then every verdict's `path` is the model's `source` directory as a raw absolute
    And no verdict's `path` is a node's own file

  Scenario: an empty graph reports nothing
    Given a model declaring no nodes
    When the groundedness check runs
    Then no finding is reported
    And no error is raised

  Examples:
    | graph shape                                   | ground placement                        | verdict per component                          |
    | op --target-setting--> a; a<->b               | ground: exogenous on actor:op           | {op}=grounded-exogenous-only, {a,b}=grounded-exogenous-only |
    | op (no edges); a<->b                          | ground: exogenous on actor:op           | {op}=grounded-exogenous-only, {a,b}=ungrounded  |
    | a --data-feed--> auditor                      | ground: exogenous on actor:auditor      | {a}=ungrounded, {auditor}=grounded-exogenous-only |
    | op --monitoring--> a                          | ground: exogenous on actor:op           | {op}=grounded-exogenous-only, {a}=grounded-exogenous-only |
    | op --target-setting--> a --data-feed--> b     | ground: exogenous on actor:op           | all three grounded-exogenous-only              |
    | a --data-feed--> b                            | ground: exogenous on loop:a (not honoured) | {a}=ungrounded, {b}=ungrounded              |
    | po --target-setting--> a                      | actor:po carries NO ground key          | {po}=ungrounded, {a}=ungrounded                |
    | a<->b; c; actor:x                             | no ground-bearing node anywhere         | all three ungrounded                           |
    | no nodes                                      | n/a                                     | no findings                                    |
