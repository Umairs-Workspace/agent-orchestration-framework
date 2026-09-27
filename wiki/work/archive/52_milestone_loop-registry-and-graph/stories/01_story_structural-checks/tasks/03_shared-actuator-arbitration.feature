@executable @cli @work @validate
Feature: Shared actuator without an arbiter — contested control made computable

  Two or more `kind: loop` nodes whose `actuator` lists share an IDENTICAL entry are
  contending for the same lever. The contention clears only when a SINGLE node that is
  NOT a member of the contending set declares a `veto` edge to EVERY member —
  arbitration by two half-arbiters is not arbitration, and no contender arbitrates
  itself. The arbitration machinery is 58's; this check only makes its absence
  computable, and names the actuator and the loops contending for it. Matching stays
  exact and scheme-agnostic: a collision between two honestly-cited actuators is true
  signal, and the narrowness of the citation is the record author's duty, not the
  check's. "A member of the contending set may not be its own arbiter" is a single-case
  property of a pure function and is verified HERE — no fitness function covers it
  (ADR-012 §7/G4). ADR-007 §3 check 4 as ruled by ADR-011 §9 and §10, ADR-004 §1.

  Scenario: two loops sharing an identical actuator entry with no arbiter are reported
    Given a model declaring `loop:a` with `actuator: [command:work:run-retry]`
    And `loop:b` with `actuator: [command:work:run-retry]`
    And no node declaring a `veto` edge
    When the shared-actuator check runs
    Then `loop-shared-actuator-unarbitrated` is reported
    And its severity is `warn`
    And its message names the actuator `command:work:run-retry`
    And its message names `loop:a` and `loop:b` as the contending loops
    And its `path` is the model's `source` directory as a raw absolute

  Scenario: a veto to only two of three contending loops still reports
    Given a model declaring `loop:a`, `loop:b` and `loop:c` each with `actuator: [command:work:run-retry]`
    And `actor:operator` with `veto: [loop:a, loop:b]`
    When the shared-actuator check runs
    Then `loop-shared-actuator-unarbitrated` is reported for `command:work:run-retry`
    And its message names all three contending loops

  Scenario: a single node vetoing every member clears the finding
    Given a model declaring `loop:a`, `loop:b` and `loop:c` each with `actuator: [command:work:run-retry]`
    And `actor:operator` with `veto: [loop:a, loop:b, loop:c]`
    When the shared-actuator check runs
    Then no finding is reported

  Scenario: an arbiter may be a loop, not only an actor
    Given a model declaring `loop:a` and `loop:b` each with `actuator: [command:work:run-retry]`
    And `loop:supervisor` with `veto: [loop:a, loop:b]`
    When the shared-actuator check runs
    Then no finding is reported

  Scenario: a member of the contending set may NOT be its own arbiter
    Given a model declaring `loop:a` and `loop:b` each with `actuator: [command:work:run-retry]`
    And `loop:a` declaring `veto: [loop:a, loop:b]`
    And no other node declaring a `veto` edge
    When the shared-actuator check runs
    Then `loop-shared-actuator-unarbitrated` is reported for `command:work:run-retry`
    And its message names `loop:a` and `loop:b` as the contending loops

  Scenario: a member vetoing every OTHER member is still not an arbiter
    Given a model declaring `loop:a`, `loop:b` and `loop:c` each with `actuator: [command:work:run-retry]`
    And `loop:a` declaring `veto: [loop:b, loop:c]`
    And no other node declaring a `veto` edge
    When the shared-actuator check runs
    Then `loop-shared-actuator-unarbitrated` is reported for `command:work:run-retry`
    And its message names all three contending loops

  Scenario: a loop contending for a DIFFERENT actuator is a valid non-member arbiter
    Given a model declaring `loop:a` and `loop:b` each with `actuator: [command:work:run-retry]`
    And `loop:c` with `actuator: [command:work:run-complete]` and `veto: [loop:a, loop:b]`
    When the shared-actuator check runs
    Then no finding is reported for `command:work:run-retry`

  Scenario: a non-member covering the whole set arbitrates even when a member also vetoes
    Given a model declaring `loop:a`, `loop:b` and `loop:c` each with `actuator: [command:work:run-retry]`
    And `actor:operator` with `veto: [loop:a, loop:b, loop:c]`
    And `loop:a` declaring `veto: [loop:b]`
    When the shared-actuator check runs
    Then no finding is reported

  Scenario: two nodes each vetoing PART of the set is not arbitration
    Given a model declaring `loop:a`, `loop:b` and `loop:c` each with `actuator: [command:work:run-retry]`
    And `actor:operator` with `veto: [loop:a, loop:b]`
    And `actor:auditor` with `veto: [loop:c]`
    When the shared-actuator check runs
    Then `loop-shared-actuator-unarbitrated` is reported for `command:work:run-retry`

  Scenario: a veto edge covering the set plus unrelated loops still arbitrates
    Given a model declaring `loop:a` and `loop:b` each with `actuator: [command:work:run-retry]`
    And `loop:c` with `actuator: [command:work:run-complete]`
    And `actor:operator` with `veto: [loop:a, loop:b, loop:c]`
    When the shared-actuator check runs
    Then no finding is reported

  Scenario: loops with different actuator entries are not a conflict
    Given a model declaring `loop:a` with `actuator: [command:work:run-retry]`
    And `loop:b` with `actuator: [command:work:run-complete]`
    When the shared-actuator check runs
    Then no finding is reported

  Scenario: an actuator declared by only one loop is not a conflict
    Given a model declaring `loop:a` with `actuator: [command:work:run-retry, command:work:run-complete]`
    And `loop:b` with `actuator: [module:src/run-store.mjs#reclaimStaleRuns]`
    When the shared-actuator check runs
    Then no finding is reported

  Scenario: a loop sharing ONE of several actuators is reported for that one only
    Given a model declaring `loop:a` with `actuator: [command:work:run-retry, command:work:run-complete]`
    And `loop:b` with `actuator: [command:work:run-retry, module:src/run-store.mjs#reclaimStaleRuns]`
    And no node declaring a `veto` edge
    When the shared-actuator check runs
    Then exactly 1 finding is reported
    And it names `command:work:run-retry`
    And it names neither `command:work:run-complete` nor `module:src/run-store.mjs#reclaimStaleRuns`

  Scenario: one finding per contested actuator, not one per contending pair
    Given a model declaring `loop:a`, `loop:b` and `loop:c` each with `actuator: [command:work:run-retry]`
    And no node declaring a `veto` edge
    When the shared-actuator check runs
    Then exactly 1 finding is reported

  Scenario: two separately contested actuators yield two findings
    Given a model declaring `loop:a` with `actuator: [command:x, command:y]`
    And `loop:b` with `actuator: [command:x]`
    And `loop:c` with `actuator: [command:y]`
    And no node declaring a `veto` edge
    When the shared-actuator check runs
    Then exactly 2 findings are reported
    And one names `command:x` with `loop:a` and `loop:b`
    And the other names `command:y` with `loop:a` and `loop:c`
    And the two are returned in the frozen `(path, code, message)` order — both anchor at `source`, so the pair is ordered by `message`

  Scenario: an identical `prose:` actuator entry is contested like any other entry
    Given a model declaring `loop:build-to-green` with `actuator: [prose:src/bundle/agents/aof-developer.md]`
    And `loop:review-fix-rereview` with `actuator: [prose:src/bundle/agents/aof-developer.md]`
    And no node declaring a `veto` edge
    When the shared-actuator check runs
    Then `loop-shared-actuator-unarbitrated` is reported naming `prose:src/bundle/agents/aof-developer.md`
    And the finding stands as true signal — two loops pulling one lever with nobody to arbitrate

  Scenario: entries that differ in any character are different actuators
    Given a model declaring `loop:a` with `actuator: [module:src/run-store.mjs#isStale]`
    And `loop:b` with `actuator: [module:src/run-store.mjs#isRetryable]`
    When the shared-actuator check runs
    Then no finding is reported

  Scenario: an actor node's edges are read for veto but an actor declares no actuator
    Given a model declaring `actor:operator` with `veto: [loop:a, loop:b]` and no `actuator` key
    And `loop:a` and `loop:b` each with `actuator: [command:work:run-retry]`
    When the shared-actuator check runs
    Then no finding is reported
    And no error is raised

  Scenario: a duplicate actuator entry within ONE loop is not a conflict with itself
    Given a model declaring `loop:a` with `actuator: [command:work:run-retry, command:work:run-retry]`
    And no other loop declaring that actuator
    When the shared-actuator check runs
    Then no finding is reported

  Examples:
    | per-loop actuator lists                        | veto edges                          | expected findings                  |
    | a:[x]  b:[x]                                   | none                                | 1 — x contested by {a,b}           |
    | a:[x]  b:[x]                                   | operator veto [a,b]                 | none                               |
    | a:[x]  b:[x]  c:[x]                            | none                                | 1 — x contested by {a,b,c}         |
    | a:[x]  b:[x]  c:[x]                            | operator veto [a,b]                 | 1 — x contested by {a,b,c}         |
    | a:[x]  b:[x]  c:[x]                            | operator veto [a,b] + auditor veto [c] | 1 — x contested by {a,b,c}      |
    | a:[x]  b:[x]  c:[x]                            | operator veto [a,b,c]               | none                               |
    | a:[x]  b:[x]                                   | supervisor (a loop) veto [a,b]      | none                               |
    | a:[x]  b:[x]                                   | a (a MEMBER) veto [a,b]             | 1 — x contested by {a,b}           |
    | a:[x]  b:[x]  c:[x]                            | a (a MEMBER) veto [b,c]             | 1 — x contested by {a,b,c}         |
    | a:[x]  b:[x]  c:[y]                            | c (member of y's set only) veto [a,b] | none for x                       |
    | a:[x]  b:[x]  c:[x]                            | operator veto [a,b,c] + a veto [b]  | none                               |
    | a:[x]  b:[y]                                   | none                                | none                               |
    | a:[x,y]  b:[x,z]                               | none                                | 1 — x contested by {a,b}           |
    | a:[x,y]  b:[x]  c:[y]                          | none                                | 2 — x by {a,b}, y by {a,c}         |
    | a:[prose:p]  b:[prose:p]                       | none                                | 1 — prose:p contested by {a,b}     |
    | a:[x,x]  (single loop, duplicate entry)        | none                                | none                               |
