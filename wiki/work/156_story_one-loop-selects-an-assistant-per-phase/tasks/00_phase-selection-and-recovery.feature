@manual @cli @work @work-stream
Feature: One loop selects and preserves native execution per phase

  Scenario: Refine with Astra and implement with Sonnet in one loop
    Given Codex advertises gpt-6-astra with high effort
    And refine selects Codex with gpt-6-astra and high effort
    And continue and verify select Claude with sonnet and high effort
    When one loop drives the item through its phases
    Then refinement uses Codex and implementation and verification use Claude
    And every phase run records its own runtime, model and effort
    And review and repair use the implementation selection

  Scenario: Resume after refinement and configuration changes
    Given a mixed loop stopped after successful refinement
    When the project assistant and model settings change
    And the operator resumes the loop
    Then the recorded selections remain authoritative
    And conflicting resume flags are refused

  Scenario: Worker handoff and existing records
    Given a worker receives a pinned mixed loop plan
    When it launches the declared loop
    Then the entire phase plan reaches the child
    And both runtime asset sets are prepared when required
    And existing single-runtime envelopes retain their previous behavior

  # Verification commands and evidence are in VERIFICATION.md.
