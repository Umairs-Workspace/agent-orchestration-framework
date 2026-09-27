@executable @cli @work @validate
Feature: One command runs every instrument check, in the shape the operator already knows

  The instrument checks exist by the time this runs, in three separate places, with no way to ask for
  all of them at once. This is the verb that does — and it is deliberately the same shape as the health
  command an operator already uses, because a report with a different envelope is a report that gets
  read differently.

  The boundary between the two is worth stating in one sentence: the health command asks whether the
  documents are coherent; this one asks whether the instruments that produce them still work. That is
  also why they are two commands rather than one with a flag — the health command may not execute
  anything, and this one exists to execute.

  ADR-002 §1, §2. FF-5908.

  Scenario: the command runs every registered lane
    Given a work stream with instruments to audit
    When the audit is run
    Then every registered lane contributes to the report
    And the report says which lanes ran

  Scenario: a finding carries the shape the health command's findings carry
    Given an audit that produced a finding
    When the finding is read
    Then it carries a code, a severity, a path and a message

  Scenario: a scope narrows what is audited
    Given a work stream with several items
    When the audit is run scoped to one item
    Then only that item's instruments are audited
    And the report names the scope it applied

  Scenario: a scope that matches nothing produces an empty report rather than an error
    Given a scope that matches no item
    When the audit is run
    Then it reports that nothing matched
    And it does not fail

  Scenario: the machine-readable face carries everything the human one does
    Given an audit that produced findings
    When it is asked for machine-readable output
    Then every finding in the human output is present
    And no finding is present that the human output omits

  Scenario: the exit decision lives on the face
    Given an audit that produced an error-severity finding
    When it is run without asking it to be strict
    Then it reports the finding
    And it exits successfully

  Scenario: strict mode fails on an error finding
    Given an audit that produced an error-severity finding
    When it is run in strict mode
    Then it exits unsuccessfully
    And the findings it reports are identical to the ones it reports without strict mode

  Scenario: strict mode does not fail on a warning
    Given an audit whose findings are all warnings
    When it is run in strict mode
    Then it exits successfully

  Scenario: the command is registered where every other command is registered
    Given the command registry
    When it is read
    Then the audit command is a member
    And the verb the operator types resolves to it
