@manual @cli @ui @work @work-stream
Feature: Configure and prove mixed execution

  Scenario: Configure each phase without changing unrelated settings
    Given an existing project configuration
    When phase assistants and runtime-scoped models and efforts are saved
    Then inspection reports the effective assistant for each phase
    And unrelated configuration is preserved
    And malformed runtime selections are rejected without writing

  Scenario: A red implementation cannot pass verification
    Given refinement uses Codex and implementation uses Claude
    When the implementation repeatedly fails its task tests
    Then the loop halts within its existing bound
    And verification does not run

  # Scripted transport regressions prove orchestration, not live model performance.
  # Verification commands and remaining live acceptance are in VERIFICATION.md.
