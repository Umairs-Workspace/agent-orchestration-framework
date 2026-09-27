@executable @docs @work @work-stream
Feature: The declared edges between the nine nodes — and the absence that is the finding

  The wiring: five closed frontmatter keys, declared on the source node, outbound, every endpoint
  defended by a citation in the declaring record's prose body. The load-bearing content here is
  what is NOT declared — no `parameter-tuning` edge anywhere, because nothing tunes aof's harness
  today, and no `monitoring` edge invented to quiet a check. An absent edge is a fact, not a gap
  (ADR-004 §1), and it is the fact the structural checks are looking for. Two of ADR-011's rulings
  land on this file: an edge key declared with an EMPTY list is `loop-empty-list` (error, §5) —
  `monitoring: []` is a half-written line, not "no edges" — and a `monitoring` or `target-setting`
  edge from a node to ITSELF is `loop-self-referential-edge` (warn, §9), because a watcher may not
  be the thing it watches. ADR-004, ADR-005's closing warning, ADR-010's subtraction, ADR-011 §5
  and §9, ADR-012 §3/C2, §6/F3 and §6/F4.

  Scenario: every declared edge key is one of the five closed types
    Given the nine records under <work.dir>/loops/
    When I collect every frontmatter key that is not a schema field
    Then each is one of `data-feed`, `target-setting`, `monitoring`, `veto` or `parameter-tuning`
    And no record spells the veto type "veto/constraint" — the slash does not survive a frontmatter key
    And no record declares an edge key in the singular, plural or any other spelling of the five

  Scenario: every intra-registry endpoint resolves to a declared record
    Given the nine records under <work.dir>/loops/
    When I collect every `loop:` and `actor:` endpoint from every edge list
    Then each names one of the nine declared ids
    And no endpoint names loop:observe-tune, loop:observe, loop:degrade or loop:work-doctor
    And the shipped registry declares no dangling endpoint

  Scenario: every declared edge is defended in the declaring record's prose body
    Given the nine records under <work.dir>/loops/
    When I read each record's prose body against its own edge lists
    Then every declared endpoint is named in that record's body
    And every declared endpoint carries a `path:line` or `RESEARCH §` citation for the relation it asserts
    And no edge is declared that the body does not cite

  Scenario: an edge key a record declares carries at least one endpoint
    Given the nine records under <work.dir>/loops/
    When I read every declared edge list
    Then no edge list is empty
    And a record with no edges of a type omits the key entirely rather than declaring `[]`
    And no edge list names the same endpoint twice — the loader deduplicates a repeated entry SILENTLY (ADR-012 §3/C2), so a duplicate leaves the edge count right and no finding behind, and the sloppy citation would survive unreported
    And an empty edge list would be `loop-empty-list` (error, ADR-011 §5), so the shipped registry reports that code zero times across both the edge keys and the machinery lists

  Scenario: no node monitors, or sets the reference of, itself
    Given the nine records under <work.dir>/loops/
    When I collect every `monitoring` and `target-setting` endpoint against the id of the record that declares it
    Then no endpoint equals its own declaring record's id
    And no loop is declared as its own watcher, so no `optimizing: true` loop satisfies pairing by watching itself
    And no loop is declared as its own reference-owner, so no loop satisfies reference-ownership by setting its own target
    And a self-edge of either type would be `loop-self-referential-edge` (warn, ADR-011 §9), so the shipped registry reports that code zero times — a self-monitoring loop is exactly the self-confirmation this arc exists to prevent
    And a `data-feed`, `veto` or `parameter-tuning` self-edge is legitimate and is not a finding: the rule is about independence, not about self-reference in general

  Scenario: no record carries a `depends:` key
    Given the nine records under <work.dir>/loops/
    When I read every frontmatter key each declares
    Then no record declares `depends` — the item-level edge belongs to the item graph, not this one
    And no loop id or actor id appears in any work item's `depends` list

  Scenario: the registry declares no parameter-tuning edge anywhere
    Given the nine records under <work.dir>/loops/
    When I search every record for the key `parameter-tuning`
    Then it appears in none of them
    And the graph an operator renders shows no parameter-tuning edge at all
    And the day-one answer to "what tunes aof's harness?" is readable as nothing, in one second

  Scenario: an unwatched loop stays unwatched
    Given the nine records under <work.dir>/loops/
    When I collect every declared `monitoring` edge
    Then each one's endpoint is a watcher the source record's prose body cites
    And none of the three records declaring `optimizing: true` — loop:build-to-green, loop:review-fix-rereview and loop:autonomous-cascade — is the endpoint of any declared `monitoring` edge (ADR-012 §6/F4)
    And a loop declaring `optimizing: true` for which no watcher is cited carries no inbound `monitoring` edge
    And the unpaired-optimizer finding therefore fires on the real gap rather than being suppressed by a fabricated edge
    And no such loop declares a `monitoring` edge to itself, which would not satisfy pairing and would itself be reported (ADR-011 §9)

  Scenario: an unowned reference stays unowned
    Given the nine records under <work.dir>/loops/
    When I collect every declared `target-setting` edge
    Then each one's endpoint is cited in the declaring record's prose body
    And no `target-setting` edge is declared from actor:operator to a loop the operator does not demonstrably set the reference of
    And actor:operator declares at least `target-setting: [loop:autonomous-cascade]` — the floor ADR-012 §6/F3 pins — and every endpoint beyond that floor carries its own `path:line` citation in the operator record body
    And which further endpoints clear that bar is OQ-1, left open until the record is authored with the code open, so this feature pins the floor and never a full set
    And actor:product-owner declares exactly one `target-setting` endpoint, loop:verify-triage-accept, and no other edge of any type
    And a loop with a named `owner:` field gains no `target-setting` edge from that fact alone — `owner` is a field, `target-setting` is an edge

  Examples:
    | edge key          | count in the day-one registry                        | the fact the count encodes                                                   |
    | parameter-tuning  | exactly 0                                            | nothing in aof adjusts another loop's knobs today                            |
    | monitoring        | only where the source record cites a real watcher    | the three declared optimizers stay unwatched, so the check fires three times |
    | target-setting    | product-owner exactly 1; operator at least 1 (floor) | the exogenous root's edges are the registry's only declared ground path      |
    | veto              | only where the source record cites a real constraint | a shared actuator gains no arbiter it does not have, and no member of a contending set is declared as its own arbiter |
    | data-feed         | only where one node's output is a cited input        | the declared flow is defensible from evidence, edge by edge                  |
    | depends           | exactly 0                                            | two graphs, two stores, one register apiece                                  |
    | any other key     | exactly 0                                            | the edge vocabulary is closed                                                |

  Examples:
    | shape a record could declare                     | what the day-one registry declares | code if it did                        |
    | `monitoring: [loop:<its own id>]`                | 0 occurrences                      | loop-self-referential-edge (warn)     |
    | `target-setting: [loop:<its own id>]`            | 0 occurrences                      | loop-self-referential-edge (warn)     |
    | `data-feed`/`veto`/`parameter-tuning` self-edge  | 0 occurrences, and none is needed  | none — legitimate by ADR-011 §9       |
    | any edge key declared as `[]`                    | 0 occurrences                      | loop-empty-list (error)               |
    | an edge type omitted entirely                    | the honest way to declare no edges | none — an absent key is a fact        |
    | the same endpoint listed twice in one edge list  | 0 occurrences                      | none — deduplicated silently (§3/C2)  |
