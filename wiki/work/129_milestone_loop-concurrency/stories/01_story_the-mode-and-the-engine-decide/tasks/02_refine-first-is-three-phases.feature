@executable @cli @work @work-stream
Feature: under refine_first the engine names the three phases from two additive inputs

  ADR-001 §3-§4: `refine_first` is REFINE (every in-scope story lacking tasks is refined first, in
  stream order, in the primary), then BUILD (a `work:next --through-review` walk whose waves run in
  lanes — story 04's), then VERIFY (today's ladder). The ENGINE decides the phase; the shell hands
  it facts (ADR-001 §7's ruling on TECH_DEBT item 91). Two additive inputs carry the mode into
  `decideLoopPhase` and, through it, `decideLoop`: `concurrency` — the resolved mode — and
  `unrefined` — the in-scope stories with no tasks and not `done`, in stream order, as refs. Under
  `refine_first` a non-empty `unrefined` decides `drive refine <unrefined[0]>` AHEAD of whatever
  the head offers; an empty `unrefined` decides for the head as today. A through-review walk's
  `next.state === "done"` means "every in-scope story is in review" — the BUILD phase boundary —
  and the engine answers `{ act: "done" }` for it exactly as it does today; the SHELL reads that
  answer as the boundary (story 04), not as an accepted milestone. `sequential` (and an absent
  `concurrency`) ignores `unrefined` entirely, so today's decisions are byte-identical.

  Background:
    Given `decideLoopPhase` and `decideLoop` from `src/work/loop.mjs`
    And a ready `next` answer offering story `07/02` with tasks and status `"not-started"`

  Scenario Outline: refine_first refines the first unrefined story ahead of the head
    Given `concurrency` is `"refine_first"`
    When `decideLoopPhase` is asked with `unrefined` <unrefined> and `cap` 3
    Then the decision deep-equals <decision>

    Examples:
      | unrefined                | decision                                                      |
      | ["07/03", "07/04"]       | `{ act: "drive", ref: "07/03", phase: "refine", cycle: 1 }`   |
      | ["07/04", "07/03"]       | `{ act: "drive", ref: "07/04", phase: "refine", cycle: 1 }`   |
      | ["07/04"]                | `{ act: "drive", ref: "07/04", phase: "refine", cycle: 1 }`   |
      | []                       | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }` |
      | undefined                | `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }` |

  Scenario Outline: any concurrency that is not refine_first ignores unrefined
    Given `concurrency` is <concurrency>
    When `decideLoopPhase` is asked with `unrefined` `["07/03"]` and `cap` 3
    Then the decision deep-equals `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`

    Examples:
      | concurrency    |
      | "sequential"   |
      | undefined      |
      | null           |
      | "parallel"     |

  Scenario Outline: the milestone with zero stories still refines first under either mode
    Given a ready `next` answer offering milestone `07` with `stories.total` 0
    When `decideLoopPhase` is asked with `concurrency` <concurrency>, `unrefined` `[]` and `cap` 3
    Then the decision deep-equals `{ act: "drive", ref: "07", phase: "refine", cycle: 1 }`

    Examples:
      | concurrency    |
      | "refine_first" |
      | "sequential"   |
      | undefined      |

  Scenario Outline: a through-review done answer is the phase boundary and stays a done act
    Given a `next` answer of `{ state: "done" }`
    When `decideLoopPhase` is asked with `concurrency` <concurrency>, `unrefined` `[]` and `cap` 3
    Then the decision deep-equals `{ act: "done" }`

    Examples:
      | concurrency    |
      | "refine_first" |
      | "sequential"   |
      | undefined      |

  Scenario: the two inputs ride decideLoop unchanged
    When `decideLoop` is asked with `scope` `"07"`, `level` `"L2"`, `cap` 3, `concurrency` `"refine_first"` and `unrefined` `["07/03"]`
    Then the answer's `admitted` is true
    And the answer's `act` deep-equals `{ act: "drive", ref: "07/03", phase: "refine", cycle: 1 }`
    And the answer's key set is exactly `admitted, scope, form, level, cap, next, act, stops`
    And the answer's `next` deep-equals the `next` it was asked with

  Scenario Outline: the outcome precedence above the phase decision is untouched by the mode
    Given `concurrency` is `"refine_first"` and `unrefined` is `["07/03"]`
    When `decideLoopAction` is asked with <fact> and `cap` 3
    Then the decision's `act` is `"halt"` and its `stop` is <stop>

    Examples:
      | fact                                                      | stop                   |
      | `signal: "SIGINT"`                                        | "operator-interrupt"   |
      | `session: { outcome: "needs-input", sessionId: "s-1" }`   | "session-needs-input"  |

  Scenario: an unrefined story is refined even when the head is a gate
    Given `next.status` is `"in-review"` and `concurrency` is `"refine_first"`
    When `decideLoopPhase` is asked with `unrefined` `["07/05"]` and `cap` 3
    Then the decision deep-equals `{ act: "drive", ref: "07/05", phase: "refine", cycle: 1 }`

  Scenario: with nothing left to refine the in-review head still routes to the gate under refine_first
    Given `next.status` is `"in-review"` and `concurrency` is `"refine_first"`
    When `decideLoopPhase` is asked with `unrefined` `[]`, `lastPhase` `"verify"` and `cap` 3
    Then the decision deep-equals `{ act: "gate", ref: "07/02", command: "work:validate" }`

  Scenario Outline: under refine_first a non-empty unrefined precedes every state and type of the head
    Given `concurrency` is `"refine_first"` and `unrefined` is `["07/03"]`
    When `decideLoopPhase` is asked with a `next` answer of <next> and `cap` 3
    Then the decision deep-equals `{ act: "drive", ref: "07/03", phase: "refine", cycle: 1 }`

    Examples:
      | next                                                                       |
      | `{ state: "done" }`                                                        |
      | `{ state: "blocked", ref: "07/04", waitingOn: ["07/01"] }`                 |
      | `{ state: "held", ref: "07/04", skipped: [] }`                             |
      | `{ state: "ready", ref: "07", type: "milestone" }`                         |
      | `{ state: "ready", ref: "09", type: "uat" }`                               |
      | `{ state: "ready", ref: "07/04", type: "spike" }`                          |

  Scenario Outline: a malformed unrefined is treated as empty, never as a refine
    Given `concurrency` is `"refine_first"`
    When `decideLoopPhase` is asked with `unrefined` <unrefined>
    Then the decision deep-equals `{ act: "drive", ref: "07/02", phase: "continue", cycle: 1 }`

    Examples:
      | unrefined   |
      | undefined   |
      | null        |
      | "07/03"     |
      | 3           |
