@executable @docs @work @work-stream
Feature: The registry loads clean and reports its honest gaps

  The story's gate. Nine records, zero schema errors, and a warn count that is the deliverable
  working rather than a defect: six unknown owners, two uncapped ceilings and a prose-only set are
  exactly what RESEARCH measured, three unpaired optimizers are what ADR-012 §6/F4 ruled, and a
  registry that reported none of them would be the one to distrust. This feature checks the shipped
  content through the loader; the loader's own contract is 52/00's. The code set is ADR-011 §1's 24
  — 16 in the loader's lane, 8 in the checks' — and the discipline of this file is that a count is
  PINNED only where RESEARCH or an ADR measured it: the rest are bounds, and are labelled as bounds
  rather than quietly hardened into targets an author would then write records to hit. ADR-002's
  admission rules, ADR-010's table and its subtraction, ADR-011 §1, §5, §6, §8 and §9, ADR-012 §6.
  The one input still open is OQ-1 — actor:operator's edges above its cited floor — so every count
  that depends on that edge set stays a bound.

  Scenario: the registry contains exactly nine nodes
    Given the day-one registry under <work.dir>/loops/
    When I load every record in the directory
    Then nine nodes are loaded
    And seven declare kind "loop": build-to-green, review-fix-rereview, verify-triage-accept, autonomous-cascade, run-resilience, retrospective-memory-ingest, mesh-assignment-reclaim
    And two declare kind "actor": operator, product-owner
    And no record declares a kind outside that closed pair

  Scenario: every node's id equals its filename stem
    Given the nine records under <work.dir>/loops/
    When I compare each record's `id` with its filename
    Then each id is exactly "<scheme>:<filename stem>"
    And the scheme matches the record's `kind` — `loop:` on a loop, `actor:` on an actor
    And no id carries a path, an extension or a milestone number

  Scenario: all nine records load with zero error-severity findings
    Given the day-one registry under <work.dir>/loops/
    When I load every record and collect the findings
    Then no finding carries severity "error"
    And every `kind: loop` record declares all of controlled, reference, measurement, actuator, cadence, ceiling, owner and optimizing, so nothing is expressed by omission
    And every `optimizing:` value is the literal true or false — no sentinel is admitted on that key

  Scenario: no record declares a machinery field, a ceiling or an edge as an empty list
    Given the nine records under <work.dir>/loops/
    When I read every list-valued key across the registry — reference, measurement, actuator, ceiling and the five edge keys
    Then no list is empty
    And zero `loop-empty-list` findings are reported
    And no record expresses "nothing here" as `[]`: a machinery field must name a pointer or a `prose:` path, and an edge type with no endpoints is expressed by omitting the key
    And this is what stops FF-5204's "no declared loop is aspirational" from being defeated by writing empty machinery lists (ADR-011 §5)

  Scenario: every key each record declares is admitted for that record's kind
    Given the nine records under <work.dir>/loops/
    When I check each declared frontmatter key against the admitted set for that record's `kind`
    Then zero `loop-key-not-admitted-for-kind` findings are reported
    And no `kind: loop` record declares `ground:`, and neither `kind: actor` record declares a control field
    And zero `loop-unknown-key` findings are reported — every declared key is in the global union
    And zero `loop-malformed-frontmatter-line` findings are reported — no record carries a line the parser silently drops, including the SPEC's own `veto/constraint:` spelling

  Scenario: the honest warns are the deliverable working, not a defect
    Given the day-one registry under <work.dir>/loops/
    When I load every record and collect the findings
    Then six `loop-owner-unknown` findings are reported, one per loop for which RESEARCH found no owner
    And no `loop-owner-unknown` is reported for loop:verify-triage-accept, the one loop with a cited owner
    And two `loop-ceiling-uncapped` findings are reported, for loop:build-to-green and loop:review-fix-rereview
    And `loop-field-prose-only` is reported on at least the four loops RESEARCH found prose-only measurement: build-to-green, review-fix-rereview, verify-triage-accept and retrospective-memory-ingest
    And zero `loop-ceiling-unknown` findings are reported — every one of the seven ceilings is evidenced as `uncapped`, `none` or a pointer, mesh-assignment-reclaim's included (ADR-012 §6/F1); the code still warns rather than passing silently, it simply has nothing to fire on (ADR-011 §6)
    And every one of these findings carries severity "warn", never "error"

  Scenario: the three declared optimizers are all unpaired — the PRD thesis, made computable
    Given the day-one registry under <work.dir>/loops/
    When I load every record and run the checks over the resulting model
    Then exactly three records declare `optimizing: true`: build-to-green, review-fix-rereview and autonomous-cascade (ADR-012 §6/F4)
    And the other four records declare `optimizing: false`, so no fifth optimizer is claimed and none of the three is withheld
    And three `loop-unpaired-optimizer` findings are reported, one per declared optimizer
    And not one of the three is the endpoint of a `monitoring` edge from any node, which is why all three fire — the PRD thesis that none has a counter-metric, now readable off the registry
    And each of the three findings carries severity "warn", never "error", so the story still loads clean
    And each of the seven records defends its own `optimizing` value in prose, since no check can re-derive the optimizer/regulator call from evidence

  Scenario: observe→tune is not declared
    Given the nine records under <work.dir>/loops/
    When I search the registry for an observe-tune node
    Then no record declares id "loop:observe-tune"
    And no record names a tune actuator — no `module:` pointer at a work-tune module, no `command:` pointer at a tune command
    And no record declares a node for src/work-observe.mjs or src/degrade.mjs, which are measurement streams with no actuator
    And no edge endpoint names any of them, so the absence produces no dangling endpoint

  Scenario: the timescale check reports no inversion, because only one node is on a clock
    Given the day-one registry under <work.dir>/loops/
    When the timescale check runs over the declared `target-setting` edges
    Then zero `loop-timescale-inversion` findings are reported
    And the reason is readable off the content: exactly one record declares a `periodic:` cadence, so no edge can join two resolvable durations
    And every incomparable pair the check reports names which side is not on a clock
    And the operator's `target-setting` edges produce no timescale finding at all — the check's domain is loop→loop, so an actor-sourced edge is out of domain rather than "not comparable" (ADR-011 §8)

  Scenario: no finding in the registry comes from a node confirming itself
    Given the day-one registry under <work.dir>/loops/
    When I load every record and run the checks over the resulting model
    Then zero `loop-self-referential-edge` findings are reported
    And no `optimizing: true` loop is paired by a `monitoring` edge to itself, and no loop's reference is owned by a `target-setting` edge to itself
    And no contending loop is declared as its own arbiter, so no `loop-shared-actuator-unarbitrated` finding is suppressed by a self-declared veto (ADR-011 §9)

  Examples:
    | finding code                    | expected count in the day-one registry                                   |
    | loop-record-unparseable         | 0                                                                        |
    | loop-missing-field              | 0                                                                        |
    | loop-bad-value                  | 0                                                                        |
    | loop-expected-list              | 0                                                                        |
    | loop-expected-scalar            | 0                                                                        |
    | loop-empty-list                 | 0                                                                        |
    | loop-unknown-key                | 0                                                                        |
    | loop-key-not-admitted-for-kind  | 0                                                                        |
    | loop-malformed-frontmatter-line | 0                                                                        |
    | loop-id-mismatch                | 0                                                                        |
    | loop-graph-dangling-endpoint    | 0 — the loader's lane, not the checks' (ADR-011 §1)                      |
    | loop-owner-unknown              | 6                                                                        |
    | loop-ceiling-uncapped           | 2                                                                        |
    | loop-ceiling-unknown            | 0 — ADR-012 §6/F1 pins the seventh ceiling (mesh-assignment-reclaim) to `none`; no record declares `unknown`, and one that did would WARN rather than pass silently |
    | loop-cadence-unknown            | 0 or 1 — only loop:autonomous-cascade's rate axis is unevidenced         |
    | loop-field-prose-only           | at least 4 — across the four prose-only-measurement loops; a lower bound, since the actuator-granularity rule adds `prose:` agent-definition entries |
    | loop-unpaired-optimizer         | 3 — build-to-green, review-fix-rereview and autonomous-cascade, none of them the endpoint of a `monitoring` edge (ADR-012 §6/F4) |
    | loop-self-referential-edge      | 0 — no node monitors or sets the reference of itself                     |
    | loop-timescale-inversion        | 0 — only one record declares a `periodic:` cadence                       |
    | loop-shared-actuator-unarbitrated | at least 1 — build-to-green and review-fix-rereview share the aof-developer actuator and no non-member vetoes both (ADR-011 §10) |

  Examples:
    | code deliberately left unpinned      | why the evidence does not support a count                                       |
    | loop-unowned-reference               | follows from the declared `target-setting` edge set, whose operator half is OQ-1 — the floor is pinned, every edge above it is authored from a citation at build time |
    | loop-timescale-not-comparable        | one per loop→loop `target-setting` edge; that edge set is OQ-1-dependent, and actor-sourced edges contribute nothing (ADR-011 §8) |
    | loop-graph-ungrounded-component      | depends on the SCC decomposition of an edge set that is authored, not budgeted — OQ-1 is the input that moves it, and a mostly-ungrounded day one is the correct output (ADR-012 §6/F3) |
    | loop-graph-grounded-exogenous-only   | likewise — and `actor:operator`'s own component is grounded by reflexive reachability, which is correct and not a bug (ADR-011 §9) |
