@executable @cli @work @work-stream
Feature: The stop set — eight closed ids, each carrying the code or fact that produced it

  `LOOP_STOPS` is the closed eight of ADR-005 §4, and 54's grader, 62's tuner and 63's
  triggers all read it — so it is a contract, not a render, and an open set would make each
  of them pattern-match strings (m37/R2's measured failure). The discipline that keeps the
  set honest is the producer: a stop the shell DECIDES would be product judgment; a stop it
  REPORTS because a store, a driver or a registered command returned a CODE is deterministic
  control (`PRD §Constraints`, ADR-009 §6). Every emitted stop therefore names its producing
  code or fact, and never a message: the two `autonomous.md:132-133` conditions that are
  genuinely model judgments — a wrong or infeasible scenario, an open decision that cannot
  be safely defaulted — are ABSENT from the set by construction and reach the shell as
  `session-needs-input`, which is exactly what the NEEDS_INPUT producer exists for. The
  coded inputs are all measured and all closed: the driver resolves `{outcome:
  "done"|"failed"|"needs-input", sessionId, failureReason?}` (`src/mesh-worker-execution.mjs
  :1460-1468`, moving to `agent-session-driver.mjs` under ADR-001 — a FROZEN input here, not
  an import, which is what keeps this story parallel with 53/00); the run store's refusals
  are the five `duplicate-run` · `not-retryable` · `attempts-exhausted` · `no-retryable-run`
  · `retry-parked` (`src/run-store.mjs:407, 602, 608, 611, 622`), propagated coded through
  `work:run-retry`/`work:resume` and never re-classified here (`src/run-store.mjs:126-130`
  owns that, ADR-004's declared-over rule). Two of those five are IN-LOOP recovery, not
  stops — `duplicate-run` (`autonomous.md:110-120`: treat the guard's rejection as an
  in-loop event) and `no-retryable-run` — so the mapping answers "no stop" and the caller
  re-asks `work:next`; an unrecognised or absent store answer FAILS CLOSED to
  `run-not-retryable`, mirroring the store's own rule for an unknown failure reason
  (`src/run-store.mjs:118`) and closing the only spin this design could have. That mapping is a
  SEPARATE pure function whose codomain is `LOOP_STOPS ∪ {null}` — "no stop" is not a fifth `act`,
  because re-asking `work:next` is what the loop does when it is not halting, the absence of a
  decision rather than one more (ADR-010 §10b). `act` therefore stays closed at exactly `drive |
  gate | halt | done`, and the INVOCATION refusals — `loop-scope-unsupported`,
  `loop-level-locked`, `loop-level-unknown`, `loop-bound-unresolved` — live in their own frozen
  exported set, `LOOP_REFUSALS`, declared beside `LOOP_STOPS` and never inside it (ADR-010 §5/§10a):
  a stop is a loop that ran and stopped, a refusal is a loop that never started. Mechanised as
  `test/work-loop-stop-set.test.mjs`: a table-driven suite exporting `{ name, run }` over
  frozen literal fixtures — no tmpdir, no spawn, no clock — registered in `scripts/test.mjs`
  with this story (TECH_DEBT item 48). ADR-005 §3/§4, ADR-004 §3, ADR-009 §6.

  Scenario: the set is the closed eight, always reported in full and in a frozen order
    Given any admitted invocation
    When the engine decides
    Then the decision reports `LOOP_STOPS` in full
    And the members are exactly `uat-gate`, `dependency-blocked`, `cap-exhausted`, `session-needs-input`, `run-not-retryable`, `retry-parked`, `unmapped-item-type`, `operator-interrupt`
    And they appear in that frozen order every time, in every process
    And no ninth member appears for any input

  Scenario: the two model judgments are not members, and the set says so by omission
    Given the closed set
    When it is read
    Then no member names an infeasible or wrong scenario
    And no member names an open decision that cannot be safely defaulted
    And nothing in the engine computes either — they are judgments a spawned turn makes, and they arrive as `session-needs-input`

  Scenario: a session that needs input carries the judgment in, and the shell reports it
    Given the driver resolved `{ outcome: "needs-input", sessionId: "sess-9f2" }` for `53/01` at phase `continue`
    When the engine decides
    Then the act is `halt` with stop `session-needs-input`
    And the producer names the driver outcome `needs-input`
    And the decision carries the `sessionId` verbatim, so the operator can answer the session
    And it carries the `ref` and the `phase`
    And the engine did not read, classify or quote whatever the session asked

  Scenario: the stop is decided from the CODE, never from the message
    Given two `needs-input` outcomes identical but for their human-readable text — one saying `the scenario is infeasible`, the other saying `an open decision`
    When the engine decides for each
    Then both decide `halt` with stop `session-needs-input`
    And the two decisions serialise byte-identically apart from any message carried through verbatim
    And no stop id varies with the words

  Scenario: the same message under a different code decides a different stop
    Given two failed sessions carrying the identical message, whose store answers are `not-retryable` and `retry-parked`
    When the engine decides for each
    Then the first is `halt run-not-retryable` and the second is `halt retry-parked`
    And the message played no part in either decision

  Scenario: a session that completes is not a stop
    Given the driver resolved `{ outcome: "done", sessionId: "sess-1" }` after phase `continue` on `53/01`
    When the engine decides
    Then no stop is decided
    And the act is `gate` — the deterministic gate follows a completed continue (ADR-005 §6)

  Scenario: a failed session with a live store retry drives the same phase again
    Given the driver resolved `{ outcome: "failed", failureReason: "runtime_offline" }`
    And `work:run-retry` reported a retry started on the same lineage, attempt 2
    When the engine decides
    Then no stop is decided
    And the act is `drive` with the same phase and the same `ref`
    And the gate cycle for that `(ref, phase)` is unchanged — a resumed infra failure is not a gate retry
    And the engine did not classify the failure itself: `runtime_offline` was the store's to judge (`src/run-store.mjs:126-130`)

  Scenario: the store's non-retryable refusal halts and names the store
    Given a failed session whose `work:run-retry` refused with code `not-retryable`
    When the engine decides
    Then the act is `halt` with stop `run-not-retryable`
    And the producer names the run store's `not-retryable` code
    And the decision carries the `ref` and the failing `runId`

  Scenario: the store's exhausted refusal halts as `cap-exhausted`, distinguishable from the engine's own bound
    Given a failed session whose `work:run-retry` refused with code `attempts-exhausted`
    When the engine decides
    Then the act is `halt` with stop `cap-exhausted`
    And the producer names the run store's `attempts-exhausted` code
    And the producer is NOT the engine's own `cycle === cap` fact — one stop id, two producers, told apart by the field

  Scenario: a parked retry halts and carries the reset time through
    Given a failed session whose `work:run-retry` refused with code `retry-parked` and `readyAt: "2026-08-15T01:10:00.000Z"`
    When the engine decides
    Then the act is `halt` with stop `retry-parked`
    And the producer names the run store's `retry-parked` code
    And the decision carries `readyAt` verbatim — the engine reads no clock and does no zone arithmetic
    And it does not decide a retry: an early attempt is certain to die the same way and burns one of three

  Scenario: a duplicate-run rejection is an in-loop event, not a hand-back
    Given a failed session whose `work:run-retry` refused with code `duplicate-run`
    When the engine maps the store's answer
    Then no stop is decided
    And the answer is the explicit "no stop" — the caller re-asks `work:next` (`autonomous.md:110-120`)
    And `duplicate-run` is not a member of `LOOP_STOPS`

  Scenario: an unrecognised store refusal fails closed rather than spinning
    Given a store answer whose refusal code is `some-future-code`
    When the engine maps the store's answer
    Then the act is `halt` with stop `run-not-retryable`
    And the producer names the unrecognised code verbatim
    And the engine did not guess a retry — the store's own rule for an unknown reason is fail-closed (`src/run-store.mjs:118`)

  Scenario: a failed session with no store answer at all also fails closed
    Given the driver resolved `{ outcome: "failed" }` and no store answer accompanies it
    When the engine decides
    Then the act is `halt` with stop `run-not-retryable`
    And the producer says the store had not answered
    And no `drive` is decided — a failure the store never saw is never retried on a guess

  Scenario: an operator interrupt is a stop the launcher produces and the engine reports
    Given the launcher reported the signal `SIGINT`
    When the engine decides
    Then the act is `halt` with stop `operator-interrupt`
    And the producer names the signal
    And the same holds for `SIGTERM`

  Scenario: an interrupt outranks every other fact
    Given the signal `SIGINT`, a `needs-input` session, a store `attempts-exhausted` refusal and a ready `uat` item, all at once
    When the engine decides
    Then the act is `halt` with stop `operator-interrupt`
    And exactly one stop is decided — the operator asked to stop, and everything else is a report for the checkpoint

  Scenario: a pending question outranks an exhausted cap
    Given a `needs-input` session on `53/01` and a gate cycle that has reached the cap
    When the engine decides
    Then the stop is `session-needs-input`
    And it is not `cap-exhausted` — reporting the cap would hide the question the operator has to answer

  Scenario: every halt carries the ref it halted on, when `work:next` supplied one
    Given each producing condition below that names an item
    When the engine decides
    Then the decision carries the `ref` from `work:next`, verbatim
    And it carries a `producer` that is a non-empty code or fact, never prose

  Scenario: a producing condition always yields the same producer token
    Given the same producing condition twice, with different surrounding data
    When the engine decides for each
    Then the `producer` is byte-identical in both decisions
    And no producer token is derived from any human-readable message

  Examples:
    | stop id             | producing condition                                              | producer names                        |
    | uat-gate            | `work:next` returns `type: "uat"`                                | work:next `type`                      |
    | uat-gate            | `work:tasks` reports a task with `counts.uat > 0`, after verify  | work:tasks `counts.uat`               |
    | dependency-blocked  | `work:next` returns `state: "blocked"` with `waitingOn`          | work:next `state`                     |
    | dependency-blocked  | `work:next` returns `state: "held"` with `skipped` holders       | work:next `state`                     |
    | cap-exhausted       | the gate cycle reached the resolved cap                          | the engine's `cycle === cap` fact     |
    | cap-exhausted       | the store refused `attempts-exhausted`                           | run-store `attempts-exhausted`        |
    | session-needs-input | the driver resolved `{ outcome: "needs-input" }`                 | driver outcome `needs-input`          |
    | run-not-retryable   | the store refused `not-retryable`                                | run-store `not-retryable`             |
    | run-not-retryable   | the store refused with an unrecognised code (fail closed)        | the unrecognised code, verbatim       |
    | run-not-retryable   | a failed session with no store answer (fail closed)              | the absent store answer               |
    | retry-parked        | the store refused `retry-parked` with `readyAt`                  | run-store `retry-parked`              |
    | unmapped-item-type  | `work:next` returned a ready item of an unmapped type            | work:next `type`, verbatim            |
    | operator-interrupt  | the launcher reported `SIGINT` or `SIGTERM`                      | the signal name                       |

  Examples:
    | driver outcome | store answer          | decision                                    |
    | done           | —                     | no stop — the phase map decides what follows |
    | needs-input    | —                     | halt session-needs-input + sessionId         |
    | failed         | retry started         | drive the same phase, same cycle             |
    | failed         | `not-retryable`       | halt run-not-retryable                       |
    | failed         | `attempts-exhausted`  | halt cap-exhausted                           |
    | failed         | `retry-parked`        | halt retry-parked + readyAt                  |
    | failed         | `duplicate-run`       | no stop — in-loop, re-ask `work:next`        |
    | failed         | `no-retryable-run`    | no stop — in-loop, re-ask `work:next`        |
    | failed         | unrecognised code     | halt run-not-retryable — fail closed         |
    | failed         | none                  | halt run-not-retryable — fail closed         |

  Examples:
    | fact present at once                              | the one stop decided |
    | SIGINT + anything                                 | operator-interrupt   |
    | needs-input session + cycle at cap                | session-needs-input  |
    | needs-input session + store `attempts-exhausted`  | session-needs-input  |
    | store `not-retryable` + cycle at cap              | run-not-retryable    |
    | store `retry-parked` + ready uat item             | retry-parked         |
    | cycle at cap + ready uat item                     | cap-exhausted        |
    | nothing but `work:next`'s answer                  | whatever the phase map decides (task 02) |
