@executable @cli @work @work-stream
Feature: An attempt has a deadline, armed against the process aof is holding

  The interactive path has no timeout at all. The codex path's ten-minute process timeout is dead
  for claude — the command builder returns null for that driver, so nothing ever reaches the
  `execFile` that carries it. What remains is a session that runs until it decides to stop.

  Two deadlines apply per attempt and both expire the same way: kill the process, resolve a
  retryable timeout, let the retry happen. Start-to-close is the wall clock on the attempt.
  Heartbeat is the silence clock inside it, suspended during the startup grace so that cloning a
  repository and installing its dependencies — which produces no tool results whatsoever — is not
  mistaken for a stall.

  The reason this lives in the driver rather than in a scheduler is that the driver is the only
  thing in the repository that holds the process handle. A deadline that cannot kill is a report.

  ADR-002, ADR-004. FF-6905.

  Scenario: an attempt that outlasts its per-attempt ceiling is killed
    Given a session driving an attempt
    When the per-attempt ceiling elapses before the session settles
    Then the process is terminated
    And the attempt resolves as failed with a timeout reason

  Scenario: an attempt that goes silent past the liveness deadline is killed
    Given a session driving an attempt past its startup grace
    When no tool result arrives for longer than the liveness deadline
    Then the process is terminated
    And the attempt resolves as failed with a timeout reason

  Scenario: an attempt that settles inside both deadlines is untouched
    Given a session that completes its directive inside both deadlines
    When it settles
    Then it resolves with its own outcome
    And no deadline fired

  Scenario: the startup grace covers materialisation, and only the liveness deadline
    Given a session inside its startup grace producing no tool results
    When the deadlines are evaluated
    Then the liveness deadline has not fired
    And the per-attempt ceiling is already counting

  Scenario: a killed attempt is retryable
    Given an attempt terminated by a deadline
    When the retry classification is applied to it
    Then it is retryable
    And it is below the attempt ceiling unless that ceiling is itself reached

  Scenario Outline: which deadline fires, and what the run records
    Given a session that <situation>
    When it settles
    Then the recorded reason is <reason>

    Examples: the vocabulary milestone 68 fixed, made reachable
      | situation                                       | reason                    |
      | completes its directive                         | its own outcome           |
      | exceeds the per-attempt ceiling                 | a retryable timeout       |
      | goes silent past the liveness deadline          | a retryable timeout       |
      | exits with a fault of its own                   | its own failure reason    |

  Scenario: the deadlines are read from the declared bounds
    Given a workspace declaring per-attempt and liveness deadlines of its own
    When a session is driven
    Then the declared values are what bound it
    And no literal duration exists in the driver for either

  Scenario: a settled session cancels its deadlines
    Given a session that settles before either deadline
    When the driver finishes
    Then neither deadline can fire afterwards
    And nothing is left scheduled behind the settled session
