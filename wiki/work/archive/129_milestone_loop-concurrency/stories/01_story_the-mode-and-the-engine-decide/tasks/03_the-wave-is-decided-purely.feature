@executable @cli @work @work-stream
Feature: decideWave is pure and bound-free, and the three lane stops join the closed set

  ADR-006 §3: which members of a `work:next` answer the loop ASKS `work:dispatch` to admit is a pure
  decision, `decideWave({ wave, heldSet, live, setAside })` → `{ dispatch, hold }`, exported from
  `src/work/loop.mjs`. `wave` and `heldSet` are read off the answer (71/ADR-006: never recomputed —
  the engine receives them, it does not partition); `live` is the refs whose lanes this loop
  already has in flight; `setAside` is the walk's memory of units handed back to their plan
  (124/ADR-005 §5). `dispatch` is the wave in the wave's own order minus `live` minus `setAside`;
  `hold` is the `heldSet`'s refs minus `live` (a lane already in flight is live, not held — a through-review answer can still list it), and the answer explains nothing about capacity because the bound
  is dispatch's own — the engine holds no number (ADR-006 §1, FF-12901 leg 2). A malformed `wave` or `heldSet`
  (present but not an array) answers `null` — the caller stops and looks, as `decideExecutionMode` already does.

  ADR-008 §5: three stop ids join `LOOP_STOPS` — `lane-open-failed`, `lane-merge-refused`,
  `lane-merge-conflict` — as the closed set's members 13-15, and `acd-loop-probe-contract`'s
  literal grows by exactly those three, in that order, at the end. `LOOP_REFUSALS` is untouched.

  Background:
    Given `decideWave` and `LOOP_STOPS` from `src/work/loop.mjs`

  Scenario Outline: the wave minus live minus set-aside is what is dispatched, in wave order
    Given a `wave` of <wave> and a `heldSet` of <heldSet>
    When `decideWave` is asked with `live` <live> and `setAside` <setAside>
    Then `dispatch` deep-equals <dispatch>
    And `hold` deep-equals <hold>

    Examples:
      | wave                          | heldSet      | live                 | setAside             | dispatch                     | hold         |
      | ["129/01","129/02","129/03"]  | []           | []                   | []                   | ["129/01","129/02","129/03"] | []           |
      | ["129/03","129/01"]           | []           | []                   | []                   | ["129/03","129/01"]          | []           |
      | ["127/02","127/04"]           | ["127/03"]   | ["127/02"]           | []                   | ["127/04"]                   | ["127/03"]   |
      | ["127/02","127/04"]           | ["127/03"]   | []                   | ["127/04"]           | ["127/02"]                   | ["127/03"]   |
      | ["127/02","127/04"]           | ["127/03"]   | ["127/02"]           | ["127/04"]           | []                           | ["127/03"]   |
      | ["127/02","127/04"]           | ["127/03"]   | ["127/04"]           | ["127/04"]           | ["127/02"]                   | ["127/03"]   |
      | ["127/02","127/04"]           | ["127/03"]   | ["127/09"]           | ["127/08"]           | ["127/02","127/04"]          | ["127/03"]   |
      | ["127/02","127/04"]           | []           | undefined            | undefined            | ["127/02","127/04"]          | []           |
      | ["127/02"]                    | undefined    | []                   | []                   | ["127/02"]                   | []           |
      | []                            | ["127/03"]   | []                   | []                   | []                           | ["127/03"]   |
      | []                            | []           | ["127/02"]           | []                   | []                           | []           |
      | ["127/04"]                    | ["127/02","127/03"] | ["127/02"]           | []                   | ["127/04"]                   | ["127/03"]   |

  Scenario Outline: members arrive as objects or refs and are answered as refs
    Given a `wave` of <wave> and a `heldSet` of <heldSet>
    When `decideWave` is asked with `live` <live> and no `setAside`
    Then `dispatch` deep-equals <dispatch>
    And `hold` deep-equals <hold>

    Examples:
      | wave                                                          | heldSet                              | live       | dispatch             | hold        |
      | [{ ref: "127/02", type: "story" }, { ref: "127/04", type: "story" }] | []                            | []         | ["127/02", "127/04"] | []          |
      | [{ ref: "127/02", type: "story" }, "127/04"]                  | [{ ref: "127/03", type: "story" }]   | []         | ["127/02", "127/04"] | ["127/03"]  |
      | [{ ref: "127/02", type: "story" }, { ref: "127/04", type: "story" }] | []                            | ["127/02"] | ["127/04"]           | []          |

  Scenario: the answer carries no bound, reads no configuration and mutates nothing
    Given a `wave` of `["127/02", "127/04"]`, a `heldSet` of `["127/03"]`, a `live` of `["127/02"]` and a `setAside` of `[]`
    When `decideWave` is asked with that input twice
    Then each answer's key set is exactly `dispatch, hold`
    And the two answers deep-equal each other
    And the four input arrays deep-equal what they were before the first ask

  Scenario Outline: a malformed wave or heldSet is null, never an empty dispatch
    When `decideWave` is asked with `wave` <wave> and `heldSet` <heldSet>
    Then the answer is `null`

    Examples:
      | wave              | heldSet           |
      | undefined         | ["127/03"]        |
      | null              | ["127/03"]        |
      | "127/02"          | ["127/03"]        |
      | 2                 | ["127/03"]        |
      | { ref: "127/02" } | ["127/03"]        |
      | ["127/02"]        | "127/03"          |
      | ["127/02"]        | null              |
      | ["127/02"]        | { ref: "127/03" } |

  Scenario: the three lane stops are the closed set's last three members
    When `LOOP_STOPS` is read
    Then its length is 15
    And `Object.isFrozen(LOOP_STOPS)` is true
    And its members 13, 14 and 15 are `lane-open-failed`, `lane-merge-refused`, `lane-merge-conflict` in that order
    And its first twelve members deep-equal `uat-gate, dependency-blocked, cap-exhausted, deadline-exhausted, progress-exhausted, no-progress, grade-indeterminate, session-needs-input, run-not-retryable, retry-parked, unmapped-item-type, operator-interrupt` in that order
    And `LOOP_REFUSALS` deep-equals `loop-scope-unsupported, loop-level-locked, loop-level-gate, loop-level-unknown, loop-bound-unresolved, loop-id-missing`
    And an admitted `decideLoop` answer's `stops` deep-equals `LOOP_STOPS`

  Scenario: the probe contract's literal names the same fifteen
    When `test/arch/loop/acd-loop-probe-contract.test.mjs` runs under an isolated global home
    Then its `LOOP_STOPS` deep-equal passes against a literal of fifteen ending in the three lane stops
    And its `LOOP_REFUSALS` deep-equal passes against its unchanged literal of six
