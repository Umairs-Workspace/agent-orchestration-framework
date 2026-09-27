@executable @cli @work @work-stream
Feature: The two deadlines that do not retry — total budget, and nobody picking it up

  Two of the four timeouts are different in kind from the two that kill-and-retry, and the
  difference is the whole reason a taxonomy is worth having rather than one number.

  SCHEDULE-TO-CLOSE is the total across all attempts. It is what makes `maxAttempts: 3` safe at
  all: large attempt counts are only defensible when a total-duration cap exists. When it expires
  the answer is to stop, escalate, and PRESERVE — Restate's `on-max-attempts: pause` rather than
  kill, which is the right default for an expensive agent because the worktree is the evidence.
  Half of that is already true here and pinned by an existing guard: the force-remove of a worktree
  exists only on the done branch. What is missing is that exhaustion currently reports as an
  ordinary failure, indistinguishable from any other.

  SCHEDULE-TO-START is the one timeout in the set whose answer is NOT a retry, and it is stated
  explicitly because the retry vocabulary would happily accept it — `timeout` is already
  classified retryable. A row that was assigned and never dispatched is not a failed attempt;
  retrying it re-queues the same undispatched row and changes nothing. It wants an operator.

  ADR-002.

  Scenario: a run that exhausts its total budget stops rather than retrying
    Given a run whose elapsed total across attempts exceeds the total ceiling
    When the next attempt would be considered
    Then no further attempt is started
    And the run is reported as exhausted

  Scenario: an exhausted run preserves its worktree for triage
    Given a run that has been reported exhausted
    When its lane is inspected
    Then the worktree is still present
    And nothing force-removed it

  Scenario: an exhausted run is distinguishable from an ordinary failure
    Given an exhausted run and a run that failed on its own fault
    When each is reported
    Then the exhausted one is identifiable as preserved-for-triage
    And the other is not

  Scenario: a run inside its total budget still retries normally
    Given a failed attempt whose run is inside the total ceiling
    And whose reason is retryable
    When the retry is considered
    Then a further attempt is started

  Scenario: work that was never picked up escalates rather than retrying
    Given work assigned to a target and not started within the pickup deadline
    When the deadline is evaluated
    Then it is surfaced for an operator
    And no retry is attempted

  Scenario Outline: the four deadlines and what each one does on expiry
    Given <deadline> expiring
    When the runtime responds
    Then it <response>

    Examples: the taxonomy, as a contract a reviewer can hold the code to
      | deadline                    | response                                      |
      | the per-attempt ceiling     | kills the attempt and retries it              |
      | the liveness deadline       | kills the attempt and retries it              |
      | the pickup deadline         | escalates to an operator and never retries    |
      | the total ceiling           | gives up, escalates, and preserves the tree   |

  Scenario: the loop reports the exhaustion as a stop, not a crash
    Given a loop driving a run that reaches its total ceiling
    When the loop decides what to do next
    Then it halts with an exhausted stop
    And the halt names the ceiling it was measured against
