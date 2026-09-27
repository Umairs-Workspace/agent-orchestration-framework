@executable @cli @work @validate
Feature: The frozen finding-code set and the pure envelope — the contract 53 and 55 consume

  Every finding any of the five checks emits is doctor's envelope exactly —
  `{code, severity, path, message}`, nothing more, nothing missing — with `code` a member
  of the frozen set the CHECKS module exports, `severity` in `{warn, error}` and `path` a
  non-empty raw absolute. The code set is lane-scoped: this module owns the eight codes
  the five checks emit and no others; the loader's schema, reference-integrity and
  honesty codes live in the loader's own lane. `path` is TERNARY — a per-node finding
  anchors at that node's file, a whole-graph finding at the `loops/` directory, and a
  per-edge finding at the DECLARING (source) node's file. The checks are pure functions
  over the frozen model `{source, present, nodes, findings}`: the same literal model
  yields byte-identical findings on repeated invocation and in a fresh process, and no
  check reads a clock, a file or the environment. Three seam facts belong to this
  contract and are pinned here. `loop-self-referential-edge` is attributed BY EDGE TYPE —
  `monitoring` to `pairing`, `target-setting` to `reference-ownership` — so the counter
  each `summary.checks` entry carries is deterministic. The combined finding ORDER is
  frozen: loader lane first, then the five checks in `summary.checks` order, each check's
  own findings sorted by `(path, code, message)`. And `ran` is NOT a check's output — the
  checks return a `Finding[]` and nothing else, and `work:loops-validate` derives `ran`
  from `Model.present`, which the checks never see.
  ADR-007 §1 and §4, as ruled by ADR-011 §1, §7 and §12 and ADR-012 §2/B1, §2/B3, §3/C6.

  Scenario: every finding carries exactly the four envelope keys
    Given a model engineered to fire every code the five checks can emit
    When all five checks run
    Then every finding has exactly the keys `code`, `severity`, `path` and `message`
    And no finding carries an extra key
    And no finding omits one

  Scenario: severity is only ever `warn` or `error`
    Given a model engineered to fire every code the five checks can emit
    When all five checks run
    Then every finding's `severity` is `warn` or `error`
    And every finding the five checks emit is `warn` — none of the five enforces anything

  Scenario: `path` is a raw absolute in its on-disk OS form
    Given a model whose `source` directory and node paths are raw absolutes
    When all five checks run
    Then every finding's `path` is absolute
    And no finding's `path` is empty
    And no finding's `path` is relativised, normalised to forward slashes or rewritten by a check

  Scenario: a per-node finding anchors at the node's own file
    Given a model declaring `loop:a` with `optimizing: true`, no inbound `monitoring` edge and no inbound `target-setting` edge
    When the unpaired-optimizer and unowned-reference checks run
    Then both findings' `path` is `loop:a`'s own file

  Scenario: a whole-graph finding anchors at the loops directory
    Given a model with an ungrounded component and a contested actuator
    When the groundedness and shared-actuator checks run
    Then both findings' `path` is the model's `source` directory

  Scenario: a per-edge finding anchors at the declaring node's file
    Given a model declaring `loop:a` with `cadence: periodic:15s`, `target-setting: [loop:b]` and `monitoring: [loop:a]`
    And `loop:b` with `cadence: unknown`
    When all five checks run
    Then the `loop-timescale-not-comparable` finding's `path` is `loop:a`'s own file
    And the `loop-self-referential-edge` finding's `path` is `loop:a`'s own file
    And neither is `loop:b`'s file
    And neither is the model's `source` directory

  Scenario: every emitted code is a member of the exported frozen set
    Given a model engineered to fire every code the five checks can emit
    When all five checks run
    Then every emitted `code` is a member of the exported frozen finding-code set
    And no check emits a code outside it

  Scenario: the exported set is the CHECKS lane only — the loader's codes have another home
    Given the exported frozen finding-code set of the checks module
    Then it holds exactly the eight warn codes the five checks emit — `loop-graph-ungrounded-component`, `loop-graph-grounded-exogenous-only`, `loop-unpaired-optimizer`, `loop-unowned-reference`, `loop-self-referential-edge`, `loop-shared-actuator-unarbitrated`, `loop-timescale-inversion` and `loop-timescale-not-comparable`
    And it holds no loader-lane code — not `loop-graph-dangling-endpoint`, not a schema code, not an honesty code
    And no code it holds also appears in the loader's exported set

  Scenario: the exported set cannot be mutated by a consumer
    Given the exported frozen finding-code set
    When a consumer attempts to add a code to it
    Then the set is unchanged
    And the added code is not a member

  Scenario: the five checks are identified by their frozen ids
    Given the five checks the module exports
    Then they are identified as `grounding`, `pairing`, `reference-ownership`, `actuator-arbitration` and `timescale`
    And they are reported in that order
    And no other string identifies a check
    And the loader's schema, reference-integrity and honesty lanes are not checks and carry no id here

  Scenario: `loop-self-referential-edge` is attributed by EDGE TYPE, so the counter is deterministic
    Given a model declaring `loop:a` with `monitoring: [loop:a]` and `target-setting: [loop:a]`
    When all five checks run
    Then 2 `loop-self-referential-edge` findings are reported
    And the one naming `monitoring` is returned by the `pairing` check
    And the one naming `target-setting` is returned by the `reference-ownership` check
    And no other check returns either — the check whose independence requirement was cheated reports the attempt
    And the `timescale` check returns nothing for the `target-setting` self-edge — its domain excludes self-edges
    And each finding counts toward exactly one `summary.checks` entry

  Scenario: the combined finding order is frozen — loader lane first, then the five checks in id order
    Given a model whose `findings` already holds loader-lane findings from more than one node
    And a node set that makes every one of the five checks emit
    When all five checks run and the result is composed
    Then the loader-lane findings come first, ordered by node `id` and then by the frozen schema's key order
    And the five checks' findings follow in `summary.checks` order — `grounding`, `pairing`, `reference-ownership`, `actuator-arbitration`, `timescale`
    And within each check the findings are sorted by `(path, code, message)`
    And no check's findings are interleaved with another's
    And the order is a property of the returned arrays, not of any consumer's re-sorting

  Scenario: no check returns `ran` — the command derives it from `Model.present`
    Given a model `{source, present, nodes, findings}` with `present: true`
    When all five checks run
    Then each check returns a `Finding[]` and nothing else
    And no check returns a `ran` flag, a finding count or a summary object
    And no check reads `Model.present` — the flag `summary.checks` carries is derived outside this module, by `work:loops-validate`

  Scenario: the three `ran` cases, pinned at the seam
    Given the `Model` the loader produces
    When `work:loops-validate` composes `summary.checks` from it
    Then `present: false` invokes no check at all and every entry is `{ran: false, findings: 0}`
    And `present: true` with `nodes: []` invokes all five and every entry is `{ran: true, findings: 0}`
    And `present: true` with a populated `nodes` invokes all five and each entry is `{ran: true, findings: n}` for that check's own count
    And "no registry" and "checks ran clean" are therefore never the same answer

  Scenario: the checks consume the frozen model and leave it untouched
    Given a model `{source, present, nodes, findings}` whose `findings` already holds loader-lane findings
    When all five checks run
    Then the returned findings hold no loader-lane code
    And the model's `findings` array is unchanged
    And the model's `nodes` are unchanged
    And no check answers from any input other than that model

  Scenario: the same literal model yields byte-identical findings on repeated invocation
    Given a literal model engineered to fire every code the five checks can emit
    When all five checks run twice in the same process
    Then the two finding arrays are byte-identical — same order, same values
    And that order is the frozen one — within each check, sorted by `(path, code, message)`

  Scenario: the same literal model yields byte-identical findings in a fresh process
    Given the same literal model
    When all five checks run in a newly started process
    Then the findings are byte-identical to the in-process run
    And the frozen order survives the process boundary

  Scenario: no check reads a clock
    Given a literal model
    When the checks are run at two different wall-clock times
    Then the findings are identical
    And no finding's `message` carries a timestamp, a duration since now or a date

  Scenario: no check reads a file
    Given a literal model whose `source` directory and node paths do not exist on disk
    When all five checks run
    Then the findings are produced normally
    And no error is raised

  Scenario: no check reads the environment
    Given a literal model
    When the checks are run from a different working directory and with a different environment
    Then the findings are identical

  Scenario: an empty model is clean, not an error
    Given a model declaring no nodes
    When all five checks run
    Then no finding is reported
    And no error is raised

  Scenario: a model with nodes but no edges runs every check
    Given a model declaring `loop:a` with `optimizing: false` and no edge key of any type
    When all five checks run
    Then `loop-graph-ungrounded-component` and `loop-unowned-reference` are reported
    And no other code is emitted

  Examples:
    | check id             | triggering model                                                            | emitted code                          | severity |
    | grounding            | a component with no path from a ground-bearing node                         | loop-graph-ungrounded-component       | warn     |
    | grounding            | a component reachable from `ground: exogenous`                              | loop-graph-grounded-exogenous-only    | warn     |
    | pairing              | `optimizing: true`, no inbound `monitoring` edge from another node          | loop-unpaired-optimizer               | warn     |
    | reference-ownership  | no inbound `target-setting` edge from another node                          | loop-unowned-reference                | warn     |
    | pairing · reference-ownership | a self-edge, attributed by type: `monitoring` → `pairing`, `target-setting` → `reference-ownership` | loop-self-referential-edge            | warn     |
    | actuator-arbitration | two loops, one identical `actuator` entry, no non-member `veto` over all    | loop-shared-actuator-unarbitrated     | warn     |
    | timescale            | `target-setting` between two registry loops, both `periodic:`, ratio < 3    | loop-timescale-inversion              | warn     |
    | timescale            | `target-setting` between two registry loops, either side `event:*`/`unknown`| loop-timescale-not-comparable         | warn     |

  Examples:
    | `Model` from the loader   | checks invoked | every `summary.checks` entry | who derives it |
    | present: false            | no             | {ran: false, findings: 0}    | the command    |
    | present: true, nodes: []  | yes            | {ran: true, findings: 0}     | the command    |
    | present: true, nodes: [n] | yes            | {ran: true, findings: n}     | the command    |
