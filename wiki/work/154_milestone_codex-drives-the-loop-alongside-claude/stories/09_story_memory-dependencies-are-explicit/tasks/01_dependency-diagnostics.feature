@cli @work @memory @executable
Feature: dependency diagnostics

  Rule: R1 · Memory backend choice is explicit and preserves the shared memory contract

    Scenario: E2 · Legacy Graphify dependency is visible to Codex operators
      Given a Codex project uses Graphify without an explicit extraction backend
      When effective configuration or execution prerequisites are inspected
      Then the report names "claude-cli" as the legacy extraction choice
      And it explains the existing local backend alternative
      And neither the config nor memory corpus is changed
    
    Scenario Outline: Configuration reports the effective memory choice
      Given "<choice>"
      When configuration is inspected
      Then it reports "<source>" and the actual backend dependency
    
      Examples:
        | choice                         | source             |
        | absent Graphify extractor      | legacy default     |
        | explicitly selected extractor  | project setting    |
        | explicitly selected local      | project setting    |
    
    Scenario: Runtime changes preserve memory identity
      Given a learning was recorded by a Claude-driven phase
      When a Codex-driven phase recalls it through the same configured backend
      Then the existing learning id, links and fields remain unchanged
      And no separate Codex ledger is created

