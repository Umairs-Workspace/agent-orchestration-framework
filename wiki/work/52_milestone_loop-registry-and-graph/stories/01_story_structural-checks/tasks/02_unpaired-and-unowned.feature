@executable @cli @work @validate
Feature: Unpaired optimizers and unowned references — the two INBOUND-edge checks

  Both checks read the edge set INVERTED: they ask what points AT a loop, never what
  the loop points at, and never what a field claims. An `optimizing: true` loop nobody
  watches is `loop-unpaired-optimizer`; a loop whose reference nobody sets is
  `loop-unowned-reference`. The second is deliberately blind to the `owner` field — a
  loop may carry a named owner and a wholly unowned target, which is exactly the shape
  of blindness upward. Independence is structural, so neither check counts a node's edge
  to ITSELF: a `monitoring` or `target-setting` self-edge satisfies nothing, and is itself
  reported `loop-self-referential-edge` so the hole is visible rather than silently
  dropped. That finding is ATTRIBUTED BY EDGE TYPE — to the check whose independence
  requirement the self-edge attempted to satisfy. A `monitoring` self-edge is emitted by
  `pairing`, a `target-setting` self-edge by `reference-ownership`: the check that was
  cheated reports the attempt, so the `summary.checks` counter is deterministic. A
  `target-setting` self-edge is reported HERE and nowhere else — the timescale check's
  domain excludes self-edges. `data-feed`, `veto` and `parameter-tuning` self-edges are
  legitimate and are never reported. "No self-edge satisfies check 2 or check 3" is a
  single-case property of a pure function and is verified HERE — no fitness function
  covers it (ADR-012 §7/G4). ADR-007 §3 checks 2 and 3 as ruled by ADR-011 §9 and
  ADR-012 §2/B1 and §3/C1, ADR-004 §4.

  Scenario: an optimizing loop with no inbound monitoring edge is unpaired
    Given a model declaring `loop:a` with `optimizing: true`
    And no node declaring a `monitoring` edge to `loop:a`
    When the unpaired-optimizer check runs
    Then `loop-unpaired-optimizer` is reported for `loop:a`
    And its severity is `warn`
    And its `path` is `loop:a`'s own file as a raw absolute
    And its message names `loop:a`

  Scenario: an inbound monitoring edge pairs the loop
    Given a model declaring `loop:a` with `optimizing: true`
    And `loop:watcher` with `monitoring: [loop:a]`
    When the unpaired-optimizer check runs
    Then no finding is reported

  Scenario: an inbound monitoring edge from an ACTOR pairs the loop
    Given a model declaring `loop:a` with `optimizing: true`
    And `actor:operator` with `monitoring: [loop:a]`
    When the unpaired-optimizer check runs
    Then no finding is reported

  Scenario: an OUTBOUND monitoring edge does not pair a loop — it watches something else
    Given a model declaring `loop:a` with `optimizing: true` and `monitoring: [loop:b]`
    And no node declaring a `monitoring` edge to `loop:a`
    When the unpaired-optimizer check runs
    Then `loop-unpaired-optimizer` is reported for `loop:a`
    And no finding is reported for `loop:b`

  Scenario: `optimizing: false` is never reported regardless of monitoring
    Given a model declaring `loop:a` with `optimizing: false` and no inbound `monitoring` edge
    And `loop:b` with `optimizing: false` and an inbound `monitoring` edge
    When the unpaired-optimizer check runs
    Then no finding is reported for either loop

  Scenario: an inbound edge of another type does not pair an optimizing loop
    Given a model declaring `loop:a` with `optimizing: true`
    And `loop:b` with `data-feed: [loop:a]`, `target-setting: [loop:a]`, `veto: [loop:a]` and `parameter-tuning: [loop:a]`
    When the unpaired-optimizer check runs
    Then `loop-unpaired-optimizer` is reported for `loop:a`

  Scenario: a self-declared monitoring edge does NOT pair the loop — a watcher may not be the thing it watches
    Given a model declaring `loop:a` with `optimizing: true` and `monitoring: [loop:a]`
    And no other node declaring a `monitoring` edge to `loop:a`
    When the unpaired-optimizer check runs
    Then `loop-unpaired-optimizer` is reported for `loop:a`
    And its `path` is `loop:a`'s own file as a raw absolute
    And `loop-self-referential-edge` is reported by that same check — `pairing` reports the attempt it refused to count

  Scenario: a self-edge is discarded but a third party's inbound edge still pairs
    Given a model declaring `loop:a` with `optimizing: true` and `monitoring: [loop:a]`
    And `loop:watcher` with `monitoring: [loop:a]`
    When the unpaired-optimizer check runs
    Then no `loop-unpaired-optimizer` is reported for `loop:a`
    And `loop-self-referential-edge` is still reported by `pairing` — a third party meeting the requirement does not un-report the attempt

  Scenario: a loop with no inbound target-setting edge is unowned
    Given a model declaring `loop:a`
    And no node declaring a `target-setting` edge to `loop:a`
    When the unowned-reference check runs
    Then `loop-unowned-reference` is reported for `loop:a`
    And its severity is `warn`
    And its `path` is `loop:a`'s own file as a raw absolute

  Scenario: an inbound target-setting edge from an actor owns the reference
    Given a model declaring `loop:a`
    And `actor:operator` with `target-setting: [loop:a]`
    When the unowned-reference check runs
    Then no finding is reported

  Scenario: an inbound target-setting edge from another loop owns the reference — the cascade case
    Given a model declaring `loop:inner`
    And `loop:outer` with `target-setting: [loop:inner]`
    When the unowned-reference check runs
    Then no finding is reported for `loop:inner`
    And `loop-unowned-reference` is reported for `loop:outer`

  Scenario: a loop with a named `owner:` field but no inbound target-setting edge is STILL unowned
    Given a model declaring `loop:verify-triage-accept` with `owner: actor:product-owner`
    And `actor:product-owner` declaring NO `target-setting` edge to it
    When the unowned-reference check runs
    Then `loop-unowned-reference` is reported for `loop:verify-triage-accept`
    And the verdict is unchanged when `owner:` is `unknown` instead

  Scenario: an OUTBOUND target-setting edge does not own the declaring loop
    Given a model declaring `loop:a` with `target-setting: [loop:b]`
    And no node declaring a `target-setting` edge to `loop:a`
    When the unowned-reference check runs
    Then `loop-unowned-reference` is reported for `loop:a`
    And no finding is reported for `loop:b`

  Scenario: a self-declared target-setting edge does NOT own the loop's reference
    Given a model declaring `loop:a` with `target-setting: [loop:a]`
    And no other node declaring a `target-setting` edge to `loop:a`
    When the unowned-reference check runs
    Then `loop-unowned-reference` is reported for `loop:a`
    And its `path` is `loop:a`'s own file as a raw absolute
    And `loop-self-referential-edge` is reported by that same check — `reference-ownership` reports the attempt it refused to count

  Scenario: a monitoring self-edge is itself reported, so the hole is visible
    Given a model declaring `loop:a` with `monitoring: [loop:a]`
    When the pairing check runs
    Then `loop-self-referential-edge` is reported for `loop:a`
    And its severity is `warn`
    And its message names the edge type `monitoring`
    And its `path` is `loop:a`'s own file as a raw absolute — the declaring node
    And it is returned by `pairing`, so it counts toward `pairing`'s `summary.checks` entry
    And the `reference-ownership` check reports no `loop-self-referential-edge` for that edge

  Scenario: a target-setting self-edge is itself reported
    Given a model declaring `loop:a` with `target-setting: [loop:a]`
    When the reference-ownership check runs
    Then `loop-self-referential-edge` is reported for `loop:a`
    And its message names the edge type `target-setting`
    And its `path` is `loop:a`'s own file as a raw absolute
    And it is returned by `reference-ownership`, so it counts toward `reference-ownership`'s `summary.checks` entry
    And the `pairing` check reports no `loop-self-referential-edge` for that edge
    And the timescale check reports nothing at all for that edge — a self-edge is outside its domain

  Scenario: data-feed, veto and parameter-tuning self-edges are legitimate
    Given a model declaring `loop:a` with `data-feed: [loop:a]`, `veto: [loop:a]` and `parameter-tuning: [loop:a]`
    And `loop:a` declaring no `monitoring` or `target-setting` edge to itself
    When the pairing and reference-ownership checks run
    Then no `loop-self-referential-edge` is reported
    And neither check's `summary.checks` finding count is incremented

  Scenario: an actor's monitoring self-edge is reported like any other node's
    Given a model declaring `actor:operator` with `monitoring: [actor:operator]`
    When the pairing check runs
    Then `loop-self-referential-edge` is reported for `actor:operator`
    And its `path` is `actor:operator`'s own file as a raw absolute
    And it is returned by `pairing` — attribution is by edge type, never by node kind

  Scenario: one self-referential finding per offending edge, and the loop still carries both inbound verdicts
    Given a model declaring `loop:a` with `optimizing: true`, `monitoring: [loop:a]` and `target-setting: [loop:a]`
    And no other node declaring any edge to `loop:a`
    When the pairing and reference-ownership checks run
    Then exactly 2 `loop-self-referential-edge` findings are reported for `loop:a`
    And the one naming `monitoring` is returned by `pairing`
    And the one naming `target-setting` is returned by `reference-ownership`
    And `loop-unpaired-optimizer` is reported for `loop:a`
    And `loop-unowned-reference` is reported for `loop:a`

  Scenario: neither check ever reports an actor node
    Given a model declaring `actor:operator` with no inbound `monitoring` or `target-setting` edge
    When both checks run
    Then no finding is reported for `actor:operator`

  Scenario: a loop can carry both findings independently
    Given a model declaring `loop:a` with `optimizing: true`, no inbound `monitoring` edge and no inbound `target-setting` edge
    When both checks run
    Then `loop-unpaired-optimizer` is reported for `loop:a`
    And `loop-unowned-reference` is reported for `loop:a`
    And the two findings differ in `code` and in `message`

  Scenario: an edge from an undeclared node does not pair or own anything
    Given a model declaring `loop:a` with `optimizing: true`
    And a `monitoring` edge to `loop:a` declared only by an endpoint with no record
    When both checks run
    Then `loop-unpaired-optimizer` is reported for `loop:a`
    And no error is raised

  Examples:
    | optimizing | inbound monitoring | owner field         | inbound target-setting | expected findings                        |
    | true       | none               | unknown             | none                   | unpaired-optimizer + unowned-reference   |
    | true       | none               | unknown             | present                | unpaired-optimizer                       |
    | true       | none               | actor:product-owner | none                   | unpaired-optimizer + unowned-reference   |
    | true       | none               | actor:product-owner | present                | unpaired-optimizer                       |
    | true       | present            | unknown             | none                   | unowned-reference                        |
    | true       | present            | unknown             | present                | none                                     |
    | true       | present            | actor:product-owner | none                   | unowned-reference                        |
    | true       | present            | actor:product-owner | present                | none                                     |
    | false      | none               | unknown             | none                   | unowned-reference                        |
    | false      | none               | unknown             | present                | none                                     |
    | false      | none               | actor:product-owner | none                   | unowned-reference                        |
    | false      | none               | actor:product-owner | present                | none                                     |
    | false      | present            | unknown             | none                   | unowned-reference                        |
    | false      | present            | unknown             | present                | none                                     |
    | false      | present            | actor:product-owner | none                   | unowned-reference                        |
    | false      | present            | actor:product-owner | present                | none                                     |
    | true       | OUTBOUND only      | unknown             | OUTBOUND only          | unpaired-optimizer + unowned-reference   |
    | true       | SELF only          | unknown             | none                   | unpaired-optimizer + unowned-reference + self-referential-edge (monitoring → pairing) |
    | true       | SELF only          | unknown             | SELF only              | unpaired-optimizer + unowned-reference + 2 self-referential-edge (monitoring → pairing, target-setting → reference-ownership) |
    | false      | SELF only          | unknown             | SELF only              | unowned-reference + 2 self-referential-edge (monitoring → pairing, target-setting → reference-ownership) |
    | true       | SELF + third party | unknown             | present                | self-referential-edge (monitoring → pairing) |
    | false      | none               | unknown             | SELF only              | unowned-reference + self-referential-edge (target-setting → reference-ownership) |
    | false      | data-feed/veto/parameter-tuning SELF only | unknown | present       | none                                     |
