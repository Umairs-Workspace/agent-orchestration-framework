@manual @cli @work @work-stream
Feature: One loop selects and preserves native execution per phase

  Scenario: Refine with Astra and implement with Sonnet in one loop
    Given Codex advertises gpt-6-astra with high effort
    And no assistant routing is configured
    When the operator runs aof work loop 07 --level L2 --model sonnet:high --model refine=gpt-6-astra:high
    Then refinement uses Codex and implementation and verification use Claude
    And every phase run records its own runtime, model and effort
    And review and repair use the implementation selection

  Scenario: Model ownership and capability refusals
    Given a model is unknown, ambiguous or unavailable from its native assistant
    When a new loop resolves the model choices
    Then it refuses before any phase starts with a model-specific diagnostic
    And it never falls back to another assistant
    And an unsupported effort is refused by the selected assistant's capabilities

  Scenario: Runtime flags are removed from execution commands
    When the operator supplies a runtime flag to work loop or work drive
    Then command parsing rejects the unsupported flag
    And child phase launches recover their assistant from the persisted run

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
