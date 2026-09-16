@executable @cli @work @validate
Feature: A structural supervision failure fails the validate run

  Every finding this milestone is about is a warning today. A loop nobody owns, an actuator two loops
  fight over, a supervisor no slower than what it supervises — each writes a line, the run exits
  clean, and the line scrolls past with the thirty-odd others. Milestone 57 already made severity a
  property of the code rather than of the module, so the change here is a membership change and not a
  mechanism: eight codes join the frozen gating set and it reaches thirteen.

  The exit stays where 57 put it. The checks return findings and decide nothing about the process;
  the face reads the summary and chooses the exit; and the finding set is identical whether or not
  anyone is gating on it. Because the repo-wide validate procedure already treats any error-severity
  finding as a hard gate, a promotion here reaches the whole project the moment it lands.

  Two restraints make the gate one that stays switched on. Only this milestone's own subject codes
  are promoted — nothing inherited from 52, 55 or 57 moves, and the loader's codes are untouched —
  and the two codes that report a preference or an honest inability to decide stay warnings, because
  a run that fails on "cannot decide" teaches people to stop reading. The other is ordering: this
  gate turns on only after the records that clear it are in, or it turns the tree red for work that
  is merely unfinished.

  ADR-005 §1, §2, §3, §4, §5. FF-5803.

  Scenario: a structural supervision failure fails the run
    Given a registry with a loop no admissible source owns
    When the validate run completes
    Then the run reports an error
    And the exit is a failure

  Scenario: a registry that satisfies the structural rules passes
    Given a registry where every loop is owned, every shared actuator is arbitrated and every supervisor is slower
    When the validate run completes
    Then the run reports no errors
    And the exit is a success

  Scenario: a preference and an honest cannot-decide never stop the run
    Given a registry whose only new findings are a skipped layer and a pair that cannot be compared
    When the validate run completes
    Then the run reports no errors
    And both are reported as warnings

  Scenario: inherited findings outside the promoted set retain their severity
    Given a registry producing warning and error findings inherited from milestones 52, 55 and 57
    When the validate run completes
    Then every one of those findings retains its prior severity

  Scenario: the promoted findings arrive inside the checks that already exist
    Given a registry with a loop that declares no layer and a target-setting edge from a watcher
    When the validate run completes
    Then the run reports the same six checks it reported before this milestone
    And the new findings are attributed to the reference-ownership and timescale checks

  Scenario: the human and machine faces project the same finding result
    Given a registry with a loop no admissible source owns
    When aof work loops validate is read through its human and JSON faces
    Then both faces project the same finding codes and severities

  Scenario: the exit decision lives on the face, not in the check
    Given a registry with a loop no admissible source owns
    When the checks are called directly
    Then they return findings
    And they decide no exit code
    And the finding set is identical to the one the gating face reported

  Scenario: a code promoted here fails the project-wide validate procedure
    Given a project whose loop registry has an unarbitrated shared actuator and no other error
    When the aof validate procedure runs
    Then the loop registry step exits a failure
    And the operator is told which code failed it

  Scenario Outline: which codes gate and which report
    Given a registry producing the finding <code>
    When the validate run completes
    Then it is reported at <severity>

    Examples: the eight this milestone promotes are its own subject and nothing wider
      | code                              | severity |
      | loop-unowned-reference            | error    |
      | loop-target-setting-not-admitted  | error    |
      | loop-shared-actuator-unarbitrated | error    |
      | loop-arbiter-priority-incomplete  | error    |
      | loop-timescale-inversion          | error    |
      | loop-layer-inversion              | error    |
      | loop-layer-undeclared             | error    |
      | loop-layer-contradicts-cadence    | error    |

    Examples: the codes this milestone touched and deliberately did not promote
      | code                          | severity |
      | loop-layer-skipped            | warning  |
      | loop-timescale-not-comparable | warning  |
      | loop-self-referential-edge    | warning  |

    Examples: every inherited check code keeps its severity — 57's pairing lane, 55's grounding and anchor lanes
      | code                               | severity |
      | loop-unpaired-optimizer            | error    |
      | loop-watcher-shares-measurement    | error    |
      | loop-watcher-shares-actuator       | error    |
      | loop-counter-equals-controlled     | error    |
      | loop-counter-not-deterministic     | error    |
      | loop-watcher-is-judge              | warning  |
      | loop-graph-ungrounded-component    | warning  |
      | loop-graph-grounded-exogenous-only | warning  |
      | loop-anchor-absent                 | warning  |
      | loop-anchor-stale                  | warning  |

    Examples: the loader's codes are untouched by a decision about the checks
      | code                           | severity |
      | loop-record-unparseable        | error    |
      | loop-missing-field             | error    |
      | loop-bad-value                 | error    |
      | loop-key-not-admitted-for-kind | error    |
      | loop-owner-unknown             | warning  |
      | loop-field-prose-only          | warning  |
