@cli @work @work-stream @executable
Feature: persist and resume

  Rule: R1 · Execution selection is explicit and recorded independently of installed assets

    Scenario: E2 · A resumed run retains its Codex execution envelope
      Given a run recorded Codex model and effort for all phases
      And the project is subsequently configured for Claude
      When the run is resumed without conflicting flags
      Then the recorded Codex runtime and phase settings are used unchanged
      And the original native session identity is retained
    
    Scenario Outline: Resume never guesses across incompatible records
      Given "<record>"
      When resume is requested with "<request>"
      Then the operator observes "<outcome>"
    
      Examples:
        | record                           | request                   | outcome                              |
        | legacy run without execution     | no new runtime flag       | existing Claude resume behavior      |
        | Codex run with execution         | conflicting Claude flag   | refusal before mutation or spawn     |
        | Codex run with execution         | conflicting model flag    | refusal before mutation or spawn     |
        | malformed execution envelope     | default settings          | explicit invalid-record refusal      |
        | unknown execution profile        | default settings          | unsupported-profile refusal          |
    
    Scenario: A fresh run may select a new assistant
      Given the previous run has settled
      When a new run is started with a different explicit runtime
      Then its new execution envelope reflects the new selection
      And the previous run's recorded choices are unchanged

