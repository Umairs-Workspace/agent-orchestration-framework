@executable @cli @work @work-stream
Feature: the started loop spends the request

  WHY. A request that outlives its loop would start the scope again after the loop finishes. The
  fresh supervised launch clears it once its declaration is written (ADR-005 §4).

  Scenario: a fresh supervised launch clears its scope's start request
    Given a start request for scope "191"
    When `aof work loop 191 --supervised` starts and writes its declaration
    Then the start request for "191" is deleted
    And the loop narrates that the start request was cleared

  Scenario: a launch without --supervised leaves the request alone
    Given a start request for scope "191"
    When `aof work loop 191` starts
    Then the start request for "191" still exists

  Scenario: a resume leaves another scope's start request alone
    Given a start request for scope "192" and a halted supervised loop on "191"
    When `aof work loop 191 --resume` starts
    Then the start request for "192" still exists
