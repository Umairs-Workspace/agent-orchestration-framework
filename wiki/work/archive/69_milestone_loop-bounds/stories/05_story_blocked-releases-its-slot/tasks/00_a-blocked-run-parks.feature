@executable @cli @work @work-stream
Feature: A run waiting on a human parks — the process ends, the conversation does not

  A run waiting for an answer is not working, and it should not be occupying capacity that other
  work could use. Today it does both: the assignment is reported as `running` with a code, so the
  row stays live and the slot stays held; and a pending question holds the PTY open while it
  out-waits the fifteen-minute idle window.

  The cost is the largest single line in the telemetry — 107h28m in m47, 58h05m in m48, 46h38m in
  m50 — and it is capacity, not just calendar. Every comparable system releases the slot rather
  than sleeping inside it.

  The park is not a new mechanism. It is the gate a session-limited run already goes through,
  reached by a second cause. The important negative: this does NOT become a retryable failure. The
  retry vocabulary would happily accept it and mint a second attempt, and the resume path's own
  comment already states the rule — a needs-input park is the same run resuming, never a second
  record.

  **One signal, one behaviour** (review blocker, 2026-08-22). The first draft of this contract said
  a block the detector misses parks when the liveness deadline expires, while 69/02 says that same
  expiry kills the attempt and retries it. Both cannot be true of one signal, and the runtime
  cannot read human intent out of silence: a session that has stopped producing tool results looks
  identical whether a human is thinking or the process is wedged. So the explicit detector is the
  only thing that parks. Silence stays 69/02's and costs an attempt; a block the detector misses is
  retried, and if the retries exhaust, `on-max-attempts: pause` preserves the worktree and the
  conversation. The park is exactly as good as its detector — which is honest — and no fifth
  deadline is introduced for either.

  **A slot is released by an APPLIED park, never by an attempted one** (review blocker,
  2026-08-22). Publishing the capacity-releasing fact while the PTY is still alive double-books the
  machine: the scheduler admits new work onto a node still hosting a blocked session that can come
  back to life in place. And the durable channel the park rides refuses non-terminal reports on
  arrival, so a park can be recorded as sent-and-paid while the row it was meant to change never
  changed. Both halves are the same rule — the park is published once, after a confirmed exit, and
  it releases nothing until the row carries it.

  One consequence is worth stating so it is not rediscovered as a regression: the in-place answer —
  a human typing into the still-live PTY while the question is pending — is superseded, not
  preserved. Detection leads to exit, and the answer comes back through the resume. That path is
  what the pre-exit publish existed to serve, and it is the reason it existed at all.

  ADR-007 (2026-08-22 amendment). FF-6908, FF-6909.

  Scenario: a session with a pending question parks without waiting out the idle window
    Given a driven session with a question pending for a human
    When the block is detected
    Then the run parks
    And it did not have to out-wait the idle window first

  Scenario: parking terminates the process
    Given a run that has parked
    When its session is inspected
    Then no process is still running for it

  Scenario: the park is published only after the process has confirmed exit
    Given a session with a question pending for a human
    When the park is published
    Then its process had already confirmed exit
    And exactly one publication carried the capacity-releasing fact

  Scenario: a process whose exit cannot be confirmed is not reported as parked
    Given a session whose process cannot be confirmed terminated
    When the park is attempted
    Then it is not reported as parked
    And the reason its exit could not be confirmed is recorded

  Scenario: nothing releases capacity between detecting the block and the process exiting
    Given a session with a question pending for a human
    When the interval between detecting the block and its process exiting is inspected
    Then no capacity-releasing fact was published in it
    And the counted set for its target did not change
    And no further work was admitted in its place

  Scenario: parking preserves the conversation
    Given a run that has parked
    When its record is read
    Then the conversation it was driving is identified
    And the worktree is still present

  Scenario: a parked run leaves the counted set
    Given a target at its concurrency bound whose assignments include a run that then parks
    When the counted set for that target is computed
    Then the parked run is not counted
    And further work targeting that machine can be admitted

  Scenario: an undelivered park stays owed and is redelivered
    Given a park published while the worker cannot reach the control node
    When the connection returns
    Then the park is redelivered
    And it is acknowledged only once the assignment row carries it

  Scenario: a block the detector does not see does not park
    Given a session blocked in a way the pending-question detector does not see
    When it produces no tool results past the liveness deadline
    Then no park is published for it
    And its slot is not released by a park
    And no additional deadline was introduced for this

  Scenario: parking is not a failure and mints no second attempt
    Given a run that has parked
    When its record is read
    Then it is not recorded as failed
    And its attempt count is unchanged

  Scenario Outline: what a session's situation does to its park
    Given a session that is <situation>
    When its assignment row is read
    Then it is <parked>

    Examples: only the explicit block parks — one signal, one terminal behaviour
      | situation                                  | parked     |
      | actively producing tool results            | not parked |
      | waiting on a pending question, still alive | not parked |
      | parked after a confirmed exit              | parked     |
      | silent past the liveness deadline          | not parked |
      | settled                                    | not parked |

  Scenario Outline: what the park's publication does to the counted set
    Given a run whose park <publication>
    When the counted set is computed
    Then the run is <counted>

    Examples: capacity is released by an applied park, never by an attempted one
      | publication                                  | counted     |
      | has not been attempted yet                   | counted     |
      | was attempted while its process was alive    | counted     |
      | was delivered but not applied to its row     | counted     |
      | is applied to its row after a confirmed exit | not counted |

  Scenario: the run record gains no new state for this
    Given the run lifecycle
    When its legal states and transitions are enumerated
    Then they are unchanged by parking
    And the park is recorded on the assignment rather than on the run's state
