@cli @work @work-stream @executable
Feature: assignment capabilities

  Rule: R1 · A handoff executes only where the recorded runtime and required assets are available

    Scenario: E1 · A worker receives the original Codex selection
      Given the controller records Codex and the worker defaults to Claude
      When a capable worker accepts the assignment
      Then its launch uses the controller's recorded runtime, profile and phase settings
      And its returned native session identity is attributable to the same run
    
    Scenario: E2 · An incapable worker cannot substitute Claude
      Given the assignment requires a Codex profile unavailable on the worker
      When the worker checks the assignment
      Then it reports the exact missing capability
      And neither Claude nor Codex is started
    
    Scenario Outline: Wire compatibility is explicit
      Given a handoff carries "<record>"
      When the receiving worker inspects it
      Then it reports "<outcome>"
    
      Examples:
        | record                         | outcome                         |
        | legacy declaration             | legacy Claude behavior          |
        | valid Codex execution envelope | unchanged envelope accepted     |
        | unknown runtime                | unsupported runtime refusal     |
        | unknown profile version        | unsupported profile refusal     |
        | malformed execution envelope   | invalid envelope refusal        |

