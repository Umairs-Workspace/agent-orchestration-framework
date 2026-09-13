@executable @cli @work @validate
Feature: The timescale check — an inversion only between two clocks, `not-comparable` everywhere else

  The check that must not invent a comparison. Its domain is narrow by ruling: a
  `target-setting` edge whose source AND endpoint are both registry-present `kind: loop`
  nodes AND are two DIFFERENT nodes. Anything else — an actor at either end, an
  extra-registry endpoint, an endpoint with no declaring record, or a self-edge whose
  source and endpoint are the same node — is OUT OF DOMAIN and emits nothing at all,
  never `not-comparable`. A self-edge is not a supervision relation but a malformed
  declaration, already reported once as `loop-self-referential-edge` by the
  `reference-ownership` check; an inversion on top would be a duplicate AND misleading,
  naming a timescale problem where the problem is self-reference. Inside that domain an
  inversion is emitted ONLY when both endpoints are `periodic:` with resolvable durations
  and the DIRECTED ratio — the target-setter's period divided by the endpoint's — is < 3;
  every other pair of the closed cadence kinds is `loop-timescale-not-comparable`, naming
  which side is not on a clock. No event trigger is ever treated as a duration, in either
  direction — `not-comparable` is a first-class answer, not a fallback, and it means
  exactly "two declared loops whose supervision relation cannot yet be checked". Every
  finding is per edge and anchors at the DECLARING (source) node's file. Every row of
  both tables below is an edge between two DISTINCT nodes unless the row says SELF; the
  cadence cross-product stays exhaustive over the closed vocabulary, and the self-edge
  sits wholly in its out-of-domain region.
  ADR-006 §1–§5, ADR-007 §3 check 5, as ruled by ADR-011 §7 and §8 and ADR-012 §3/C1.

  Scenario: two periodic endpoints with a separation ratio of 3 or more report nothing
    Given a model declaring `loop:outer` with `cadence: periodic:15m` and `target-setting: [loop:inner]`
    And `loop:inner` with `cadence: periodic:15s`
    When the timescale check runs
    Then no finding is reported

  Scenario: a separation ratio below 3 is an inversion
    Given a model declaring `loop:outer` with `cadence: periodic:30s` and `target-setting: [loop:inner]`
    And `loop:inner` with `cadence: periodic:15s`
    When the timescale check runs
    Then `loop-timescale-inversion` is reported
    And its severity is `warn`
    And its message names both endpoints and both cadences
    And its `path` is `loop:outer`'s own file as a raw absolute — the declaring node

  Scenario: the ratio is directed — a target-setter FASTER than the loop it supervises is an inversion
    Given a model declaring `loop:outer` with `cadence: periodic:15s` and `target-setting: [loop:inner]`
    And `loop:inner` with `cadence: periodic:15m`
    When the timescale check runs
    Then `loop-timescale-inversion` is reported
    And the ratio is read as the target-setter's period divided by the endpoint's period

  Scenario: a ratio of exactly 3 is the clean boundary
    Given a model declaring `loop:outer` with `cadence: periodic:45s` and `target-setting: [loop:inner]`
    And `loop:inner` with `cadence: periodic:15s`
    When the timescale check runs
    Then no finding is reported

  Scenario: duration units resolve and compare across ms, s, m, h and d
    Given a model declaring a `target-setting` edge between two `periodic:` loops
    When the two cadences are declared in different units
    Then the comparison uses the resolved durations, not the literal numbers
    And `periodic:15m` over `periodic:15s` reports nothing
    And `periodic:1h` over `periodic:1000ms` reports nothing
    And `periodic:1d` over `periodic:1h` reports nothing
    And `periodic:1s` over `periodic:500ms` reports `loop-timescale-inversion`

  Scenario: an event trigger opposite a clock is not comparable, never an inversion
    Given a model declaring `loop:a` with `cadence: periodic:15s` and `target-setting: [loop:b]`
    And `loop:b` with `cadence: event:per-item`
    When the timescale check runs
    Then `loop-timescale-not-comparable` is reported
    And its severity is `warn`
    And its message names `loop:b` as the side that is not on a clock
    And its `path` is `loop:a`'s own file as a raw absolute — the declaring node
    And no `loop-timescale-inversion` is reported

  Scenario: the same pair in the opposite direction is also not comparable
    Given a model declaring `loop:b` with `cadence: event:per-item` and `target-setting: [loop:a]`
    And `loop:a` with `cadence: periodic:15s`
    When the timescale check runs
    Then `loop-timescale-not-comparable` is reported
    And its message names `loop:b` as the side that is not on a clock
    And its `path` is `loop:b`'s own file as a raw absolute — the declaring node, not the endpoint's
    And no `loop-timescale-inversion` is reported

  Scenario: every edge finding anchors at the declaring node, never at the endpoint and never at the directory
    Given a model declaring `loop:a` with `cadence: periodic:15s` and `target-setting: [loop:b]`
    And `loop:b` with `cadence: unknown`
    When the timescale check runs
    Then the finding's `path` is `loop:a`'s own file
    And it is not `loop:b`'s file
    And it is not the model's `source` directory
    And it is a non-empty raw absolute

  Scenario: `unknown` opposite a clock is not comparable
    Given a model declaring `loop:a` with `cadence: periodic:15s` and `target-setting: [loop:b]`
    And `loop:b` with `cadence: unknown`
    When the timescale check runs
    Then `loop-timescale-not-comparable` is reported naming `loop:b`

  Scenario: when neither side is on a clock the message names both
    Given a model declaring `loop:a` with `cadence: event:per-milestone` and `target-setting: [loop:b]`
    And `loop:b` with `cadence: unknown`
    When the timescale check runs
    Then `loop-timescale-not-comparable` is reported
    And its message names both `loop:a` and `loop:b` as sides that are not on a clock

  Scenario: the check runs over target-setting edges ONLY — a data-feed edge produces nothing
    Given a model declaring `loop:a` with `cadence: periodic:15s` and `data-feed: [loop:b]`
    And `loop:b` with `cadence: periodic:15s`
    When the timescale check runs
    Then no finding is reported

  Scenario: a monitoring, veto or parameter-tuning edge produces nothing
    Given a model declaring `loop:a` with `cadence: periodic:15s`
    And `loop:a` declaring `monitoring: [loop:b]`, `veto: [loop:b]` and `parameter-tuning: [loop:b]`
    And `loop:b` with `cadence: event:per-item`
    When the timescale check runs
    Then no finding is reported

  Scenario: one finding per target-setting edge, not per node
    Given a model declaring `loop:a` with `cadence: unknown` and `target-setting: [loop:b, loop:c]`
    And `loop:b` and `loop:c` each with `cadence: periodic:15s`
    When the timescale check runs
    Then exactly 2 `loop-timescale-not-comparable` findings are reported
    And both anchor at `loop:a`'s own file — the node that declares both edges
    And the two are returned in the frozen `(path, code, message)` order — one `path`, one `code`, so the pair is ordered by `message`

  Scenario: a target-setting edge from an actor produces nothing at all — an actor has no cadence by schema
    Given a model declaring `actor:operator` with `target-setting: [loop:a]` and no `cadence` key
    And `loop:a` with `cadence: periodic:15s`
    When the timescale check runs
    Then no finding is reported
    And no `loop-timescale-not-comparable` is reported — the edge is out of domain, not incomparable

  Scenario: a target-setting edge TO an actor produces nothing at all
    Given a model declaring `loop:a` with `cadence: periodic:15s` and `target-setting: [actor:operator]`
    And `actor:operator` with no `cadence` key
    When the timescale check runs
    Then no finding is reported
    And no `loop-timescale-not-comparable` is reported — the edge is out of domain, not incomparable

  Scenario: a target-setting edge to an extra-registry endpoint produces nothing
    Given a model declaring `loop:a` with `cadence: periodic:15s`
    And `loop:a` declaring `target-setting: [command:work:next, config:work.autonomous.maxAttempts, module:src/work.mjs#nextWork, item:50]`
    When the timescale check runs
    Then no finding is reported
    And no `loop-timescale-not-comparable` is reported
    And no error is raised

  Scenario: a target-setting edge to an endpoint with no declaring record produces nothing
    Given a model declaring `loop:a` with `cadence: periodic:15s` and `target-setting: [loop:absent]`
    And no record declaring `loop:absent`
    When the timescale check runs
    Then no finding is reported
    And no `loop-timescale-not-comparable` is reported — the dangling endpoint is already reported once, elsewhere
    And `loop-graph-dangling-endpoint` is not among this check's findings
    And no error is raised

  Scenario: a self-declared target-setting edge is OUT OF DOMAIN — the check emits nothing
    Given a model declaring `loop:a` with `cadence: periodic:15s` and `target-setting: [loop:a]`
    When the timescale check runs
    Then no finding is reported
    And no `loop-timescale-inversion` is reported for the ratio 1 — a self-edge is not a supervision relation
    And no `loop-timescale-not-comparable` is reported — the edge left the domain, it is not incomparable
    And the edge is reported exactly once, elsewhere: `loop-self-referential-edge` from the `reference-ownership` check

  Scenario: a self-declared target-setting edge is out of domain whatever the cadence
    Given a model declaring `loop:a` with `cadence: unknown` and `target-setting: [loop:a]`
    When the timescale check runs
    Then no finding is reported
    And the edge leaves the domain on identity alone — the cadence is never consulted

  Scenario: a self-edge leaves the domain while a real edge from the same node stays in it
    Given a model declaring `loop:a` with `cadence: periodic:15s` and `target-setting: [loop:a, loop:b]`
    And `loop:b` with `cadence: periodic:15s`
    When the timescale check runs
    Then exactly 1 finding is reported
    And it is `loop-timescale-inversion` for the `loop:a` → `loop:b` edge at ratio 1
    And nothing at all is reported for the `loop:a` → `loop:a` edge
    And the exclusion is per EDGE, never per node

  Scenario: the day-one shape — no two periodic loops joined by a target-setting edge
    Given a model in which no `target-setting` edge joins two `periodic:` loops
    When the timescale check runs
    Then 0 `loop-timescale-inversion` findings are reported
    And every `target-setting` edge between two DISTINCT registry-present `kind: loop` nodes yields one `loop-timescale-not-comparable`
    And every `target-setting` edge declared by an actor yields nothing
    And every `target-setting` self-edge yields nothing — out of domain, and reported once by `reference-ownership`
    And the count of findings never exceeds the count of `target-setting` edges between two DISTINCT loops

  Examples:
    | source cadence  | endpoint cadence | resolved ratio | outcome            |
    | periodic:15m    | periodic:15s     | 60             | none               |
    | periodic:1h     | periodic:15m     | 4              | none               |
    | periodic:1d     | periodic:1h      | 24             | none               |
    | periodic:3000ms | periodic:1000ms  | 3              | none               |
    | periodic:45s    | periodic:15s     | 3              | none               |
    | periodic:1h     | periodic:1000ms  | 3600           | none               |
    | periodic:44s    | periodic:15s     | 2.93           | inversion          |
    | periodic:2h     | periodic:1h      | 2              | inversion          |
    | periodic:30s    | periodic:15s     | 2              | inversion          |
    | periodic:1s     | periodic:500ms   | 2              | inversion          |
    | periodic:15s    | periodic:15s     | 1              | inversion          |
    | periodic:15s    | periodic:15m     | 1/60           | inversion          |
    | periodic:15s    | SELF — same node | 1              | out of domain      |

  Examples:
    | source cadence         | endpoint cadence       | outcome                          |
    | periodic:*             | periodic:* ratio >= 3  | none                             |
    | periodic:*             | periodic:* ratio < 3   | inversion                        |
    | periodic:*             | event:per-item         | not-comparable — endpoint side    |
    | periodic:*             | event:per-phase        | not-comparable — endpoint side    |
    | periodic:*             | event:per-milestone    | not-comparable — endpoint side    |
    | periodic:*             | event:per-run-start    | not-comparable — endpoint side    |
    | periodic:*             | unknown                | not-comparable — endpoint side    |
    | event:per-item         | periodic:*             | not-comparable — source side      |
    | event:per-item         | event:per-item         | not-comparable — both sides       |
    | event:per-item         | event:per-phase        | not-comparable — both sides       |
    | event:per-item         | event:per-milestone    | not-comparable — both sides       |
    | event:per-item         | event:per-run-start    | not-comparable — both sides       |
    | event:per-item         | unknown                | not-comparable — both sides       |
    | event:per-phase        | periodic:*             | not-comparable — source side      |
    | event:per-phase        | event:per-item         | not-comparable — both sides       |
    | event:per-phase        | event:per-phase        | not-comparable — both sides       |
    | event:per-phase        | event:per-milestone    | not-comparable — both sides       |
    | event:per-phase        | event:per-run-start    | not-comparable — both sides       |
    | event:per-phase        | unknown                | not-comparable — both sides       |
    | event:per-milestone    | periodic:*             | not-comparable — source side      |
    | event:per-milestone    | event:per-item         | not-comparable — both sides       |
    | event:per-milestone    | event:per-phase        | not-comparable — both sides       |
    | event:per-milestone    | event:per-milestone    | not-comparable — both sides       |
    | event:per-milestone    | event:per-run-start    | not-comparable — both sides       |
    | event:per-milestone    | unknown                | not-comparable — both sides       |
    | event:per-run-start    | periodic:*             | not-comparable — source side      |
    | event:per-run-start    | event:per-item         | not-comparable — both sides       |
    | event:per-run-start    | event:per-phase        | not-comparable — both sides       |
    | event:per-run-start    | event:per-milestone    | not-comparable — both sides       |
    | event:per-run-start    | event:per-run-start    | not-comparable — both sides       |
    | event:per-run-start    | unknown                | not-comparable — both sides       |
    | unknown                | periodic:*             | not-comparable — source side      |
    | unknown                | event:per-item         | not-comparable — both sides       |
    | unknown                | event:per-phase        | not-comparable — both sides       |
    | unknown                | event:per-milestone    | not-comparable — both sides       |
    | unknown                | event:per-run-start    | not-comparable — both sides       |
    | unknown                | unknown                | not-comparable — both sides       |
    | n/a — actor source     | periodic:*             | nothing at all — out of domain    |
    | n/a — actor source     | event:per-item         | nothing at all — out of domain    |
    | n/a — actor source     | unknown                | nothing at all — out of domain    |
    | n/a — actor source     | unresolved — no record | nothing at all — out of domain    |
    | periodic:*             | n/a — actor endpoint   | nothing at all — out of domain    |
    | periodic:*             | unresolved — no record | nothing at all — out of domain    |
    | unknown                | unresolved — no record | nothing at all — out of domain    |
    | periodic:*             | n/a — extra-registry   | nothing at all — out of domain    |
    | periodic:*             | n/a — SELF edge        | nothing at all — out of domain    |
    | event:per-item         | n/a — SELF edge        | nothing at all — out of domain    |
    | unknown                | n/a — SELF edge        | nothing at all — out of domain    |
