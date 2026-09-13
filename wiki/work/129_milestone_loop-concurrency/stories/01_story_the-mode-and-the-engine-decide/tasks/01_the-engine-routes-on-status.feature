@executable @cli @work @work-stream
Feature: the engine routes an in-review story to the gate whatever the last phase was

  127 measured the defect (its STATE.md, 2026-09-12): a RESTARTED cascade re-drove `continue` on an
  `in-review` story because `decideLoopPhase` never reads status and `lastPhase` is in-process
  only — each restart paid a full session to rediscover the review gate. ADR-001 §4 closes it in
  the engine: `decideLoopPhase` reads `input.next.status` — present on every `work:next` answer
  already, so no new input — and an `in-review` story WITH tasks answers `{ act: "gate", ref,
  command: "work:validate" }` regardless of `lastPhase`. The record says what the loop DID; the
  status says what the story IS, and a story moved to `in-review` by hand has no record and still
  must not be re-built. Every other status decides exactly as today, and `sequential` mode is
  changed by this routing alone (ADR-001 §2). The engine stays a pure leaf: `src/work/loop.mjs`
  imports nothing.

  Background:
    Given `decideLoopPhase` from `src/work/loop.mjs`
    And a `next` answer of `{ state: "ready", ref: "07/02", type: "story", status: <status> }`
    And `tasks` facts reporting at least one task

  Scenario Outline: an in-review story decides gate from every last phase, cycle and uat count
    Given `next.status` is `"in-review"`
    And `tasks` facts reporting one task with `counts.uat` <uat>
    When `decideLoopPhase` is asked with `lastPhase` <lastPhase>, `cycle` <cycle> and `cap` 3
    Then the decision deep-equals `{ act: "gate", ref: "07/02", command: "work:validate" }`

    Examples:
      | lastPhase    | cycle     | uat |
      | undefined    | undefined | 0   |
      | "continue"   | undefined | 0   |
      | "verify"     | undefined | 0   |
      | "refine"     | undefined | 0   |
      | undefined    | 1         | 0   |
      | "verify"     | 3         | 0   |
      | "verify"     | undefined | 1   |

  Scenario Outline: every other status decides as it does today
    Given `next.status` is <status>
    And `tasks` facts reporting one task with `counts.uat` <uat>
    When `decideLoopPhase` is asked with `lastPhase` <lastPhase>, `cycle` <cycle>, `cap` 3 and no `gate`
    Then the decision deep-equals <decision>

    Examples:
      | status         | lastPhase   | cycle     | uat | decision                                                                                          |
      | "not-started"  | undefined   | undefined | 0   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`                                     |
      | "in-progress"  | undefined   | undefined | 0   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`                                     |
      | "in-progress"  | undefined   | 2         | 0   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 3 }`                                     |
      | "in-progress"  | undefined   | 3         | 0   | `{ act: "halt", stop: "cap-exhausted", producer: "engine:cycle>=cap", ref: "07/02", phase: "continue", cycle: 3, cap: 3 }` |
      | "in-progress"  | "continue"  | undefined | 0   | `{ act: "gate", ref: "07/02", command: "work:validate" }`                                         |
      | "in-progress"  | "verify"    | undefined | 0   | `{ act: "drive", ref: "07/02", phase: "verify", cycle: 1 }`                                       |
      | "in-progress"  | "verify"    | 3         | 0   | `{ act: "halt", stop: "cap-exhausted", producer: "engine:cycle>=cap", ref: "07/02", phase: "verify", cycle: 3, cap: 3 }` |
      | "in-progress"  | "verify"    | undefined | 1   | `{ act: "halt", stop: "uat-gate", producer: "work:tasks:counts.uat", ref: "07/02", uat: 1 }`      |
      | "in-progress"  | "refine"    | undefined | 0   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`                                     |
      | "blocked"      | undefined   | undefined | 0   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`                                     |
      | "done"         | undefined   | undefined | 0   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`                                     |
      | null           | undefined   | undefined | 0   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`                                     |
      | undefined      | undefined   | undefined | 0   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`                                     |
      | undefined      | "continue"  | undefined | 0   | `{ act: "gate", ref: "07/02", command: "work:validate" }`                                         |

  Scenario Outline: an in-review story with a supplied gate still routes on the gate's findings
    Given `next.status` is `"in-review"`
    And a `gate` carrying <findings>
    When `decideLoopPhase` is asked with `lastPhase` `"continue"`, `cycle` <cycle>, `verifyCycle` <verifyCycle> and `cap` 3
    Then the decision deep-equals <decision>

    Examples:
      | findings                     | cycle     | verifyCycle | decision                                                                                                    |
      | [{ id: "a" }, { id: "b" }]   | 1         | undefined   | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 2, findings: [{ id: "a" }, { id: "b" }] }`         |
      | [{ id: "a" }, { id: "b" }]   | 3         | undefined   | `{ act: "halt", stop: "cap-exhausted", producer: "engine:cycle>=cap", ref: "07/02", phase: "continue", cycle: 3, cap: 3 }` |
      | [{ id: "a" }]                | undefined | undefined   | `{ code: "loop-bound-unresolved", field: "cycle", value: undefined, resolution: "work.autonomous.maxAttempts" }` |
      | []                           | 1         | undefined   | `{ act: "drive", ref: "07/02", phase: "verify", cycle: 1 }`                                                 |
      | []                           | 1         | 2           | `{ act: "drive", ref: "07/02", phase: "verify", cycle: 3 }`                                                 |
      | []                           | 1         | 3           | `{ act: "halt", stop: "cap-exhausted", producer: "engine:cycle>=cap", ref: "07/02", phase: "verify", cycle: 3, cap: 3 }` |

  Scenario Outline: an in-review story with no tasks still refines
    Given `next.status` is `"in-review"`
    And `tasks` facts of <tasks>
    When `decideLoopPhase` is asked with `lastPhase` <lastPhase>
    Then the decision deep-equals `{ act: "drive", ref: "07/02", phase: "refine", cycle: 1 }`

    Examples:
      | tasks           | lastPhase   |
      | { tasks: [] }   | undefined   |
      | { tasks: [] }   | "continue"  |
      | undefined       | undefined   |

  Scenario: the shared story fixtures decide byte-identically
    When every `phase-map` and `stop-set` fixture in `test/support/work-loop-story-fixtures.mjs` is decided
    Then each answer deep-equals the fixture's recorded `expected`

  Scenario: the engine imports nothing
    When `src/work/loop.mjs` is read
    Then it contains no `import` statement

  Scenario Outline: the status is read verbatim — a variant spelling is not in-review
    Given `next.status` is <status>
    When `decideLoopPhase` is asked with no `lastPhase` and no `gate`
    Then the decision deep-equals `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`

    Examples:
      | status        |
      | "In-Review"   |
      | " in-review"  |
      | "in_review"   |
