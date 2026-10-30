@bug @cli @work @executable
Feature: Procedure completion is independent of acceptance

  Scenario: A recorded decline completes on both runtimes
    Given a phase has finished its procedure and recorded a negative verdict with routed findings
    When its Codex or Claude session settles
    Then the session is done and acceptance remains declined
