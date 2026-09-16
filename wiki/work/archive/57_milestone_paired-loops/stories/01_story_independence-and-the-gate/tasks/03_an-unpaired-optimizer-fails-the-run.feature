@executable @cli @work @validate
Feature: An optimizing loop with no watcher fails the validate run

  The check has existed since milestone 52 and has never stopped anything. It finds an optimizing
  loop with no inbound monitoring edge, writes a line, and the line is a warning because every
  finding this module produces is a warning — from one hardcoded constant, with no way for a code to
  say it means something stronger. Three optimizing loops are unpaired as this is written and the
  run exits clean.

  Making it a gate is two changes and one restraint. Severity becomes a property of the code, so a
  small frozen set of structural codes can mean failure while everything else keeps reporting exactly
  as it does today. The exit lives on the face, never in the check, so the finding set is identical
  whether or not anyone is gating on it. And the restraint: the five exact structural codes are the
  only check codes newly promoted. Every other inherited check code stays a warning, while loader
  codes retain the warning or error severity they already had. A gate that creates a wall of
  unrelated new red is a gate that gets switched off.

  ADR-003. FF-5703.

  Scenario: an unpaired optimizing loop fails the run
    Given a registry with an optimizing loop that no watcher watches
    When the validate run completes
    Then the run reports an error
    And the exit is a failure

  Scenario: a paired optimizing loop passes
    Given a registry where every optimizing loop is watched by an independent watcher
    When the validate run completes
    Then the run reports no errors
    And the exit is a success

  Scenario: a loop that does not optimize is never required to have a watcher
    Given a registry with a non-optimizing loop that no watcher watches
    When the validate run completes
    Then no unpaired-optimizer finding names it

  Scenario: inherited findings outside the gating set retain their severity
    Given a registry producing warning and error findings inherited from milestones 52 and 55
    When the validate run completes
    Then every one of those findings retains its prior severity

  Scenario: the human and machine faces project the same finding result
    Given a registry with an unpaired optimizing loop
    When aof work loops validate is read through its human and JSON faces
    Then both faces project the same finding codes and severities

  Scenario: the exit decision lives on the face, not in the check
    Given a registry with an unpaired optimizing loop
    When the checks are called directly
    Then they return findings
    And they decide no exit code

  Scenario: the aof validate procedure runs the loop registry gate
    Given a project whose loop registry has an unpaired optimizing loop
    When the aof validate procedure runs
    Then it invokes aof work loops validate as a separate deterministic step
    And its failure is surfaced to the operator

  Scenario Outline: which codes gate and which report
    Given a registry producing the finding <code>
    When the validate run completes
    Then it is reported at <severity>

    Examples: this milestone promotes five check codes; inherited severities do not move
      | code                               | severity |
      | loop-unpaired-optimizer            | error    |
      | loop-watcher-shares-measurement    | error    |
      | loop-watcher-shares-actuator       | error    |
      | loop-counter-equals-controlled     | error    |
      | loop-counter-not-deterministic     | error    |
      | loop-watcher-is-judge              | warning  |
      | loop-record-unparseable            | error    |
      | loop-missing-field                 | error    |
      | loop-owner-unknown                 | warning  |
      | loop-field-prose-only              | warning  |
      | loop-unowned-reference             | warning  |
      | loop-timescale-inversion           | warning  |
