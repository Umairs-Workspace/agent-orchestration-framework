@cli @work @work-stream @manual
Feature: live lifecycle acceptance

  Rule: R1 · Support claims require recorded live evidence and preserved workflow correctness

    Scenario: E1 · Real Codex completes a governed story lifecycle
      Given a supported Codex CLI using the operator's authorized existing access
      And an isolated fixture with native AOF assets and a declared small story
      When Codex performs refine, build, independent review and verify through the loop
      Then the fixture delivers its expected observable behavior
      And recorded evidence identifies the CLI/profile, runtime settings, native sessions and phase gates
      And review independence and final acceptance are supported by actual results
    
    Scenario: E2 · Missing live prerequisites remain pending
      Given a required CLI, authorized access or worker prerequisite is unavailable
      When the live acceptance procedure is attempted
      Then verification records the missing prerequisite and attempted procedure
      And it does not claim a passing runtime or mesh lifecycle
      And the milestone remains unaccepted
    
    Scenario Outline: Real recovery preserves decisions and bounds
      Given a live Codex fixture is interrupted at "<checkpoint>"
      When the documented recovery procedure runs
      Then it reaches "<outcome>" with attributable evidence
    
      Examples:
        | checkpoint                    | outcome                                  |
        | pending question persisted    | same thread receives the authorized answer |
        | process restarted before answer | pending question remains recoverable   |
        | warm fix requested            | recorded runtime resumes within bounds   |
        | operator stop during a tool    | owned process ends without a new phase   |
        | mesh worker reconnect         | same assignment and runtime recovered    |
    
    Scenario: Claude completes the comparable live fixture
      Given a supported Claude CLI with authorized existing access
      When the comparable governed fixture runs with no explicit runtime setting
      Then Claude completes with its current default behavior
      And verification records equivalent phase and gate evidence

