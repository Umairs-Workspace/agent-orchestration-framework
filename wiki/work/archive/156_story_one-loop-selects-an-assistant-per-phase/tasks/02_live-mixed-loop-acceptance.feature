@manual @cli @work @work-stream
Feature: Accept the model-only loop with live assistants

  Scenario: One command refines with Astra and builds and verifies with Sonnet
    Given a disposable project with both assistant bundles and an eligible work item
    And an admitted Codex executable advertises gpt-6-astra with high effort
    And Claude can launch sonnet with high effort
    When the operator runs aof work loop 07 --level L2 --model sonnet:high --model refine=gpt-6-astra:high
    Then live Codex refinement completes before live Claude implementation and verification
    And task checks and phase gates pass
    And run records show the chosen assistant, model and effort per phase
    And no manual phase handoff or runtime flags are required

  # Still pending: deterministic transport tests do not fulfill this live scenario.
