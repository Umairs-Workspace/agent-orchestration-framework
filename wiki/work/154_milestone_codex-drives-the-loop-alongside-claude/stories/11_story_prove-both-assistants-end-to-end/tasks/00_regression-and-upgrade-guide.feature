@cli @work @work-stream @executable
Feature: regression and upgrade guide

  Rule: R1 · Support claims require recorded live evidence and preserved workflow correctness

    Scenario Outline: Both runtime fixtures retain deterministic workflow guarantees
      Given a representative isolated project using "<runtime>"
      When the automated integration fixture exercises configuration, migration and loop phases
      Then the expected gates, recorded outcomes and failure bounds pass
      And the fixture has no access to the operator's live global state
    
      Examples:
        | runtime |
        | claude  |
        | codex   |
    
    Scenario: Upgrade guidance is executable and honest
      Given the supported CLI profile and completed compatibility evidence
      When an operator follows the documented selection, apply, resume and rollback steps in a fixture
      Then every command and configuration example validates against the shipped CLI
      And the guide distinguishes installed assets, execution runtime and optional delegation
      And it describes unsupported profiles, ownership conflicts and explicit memory choices
    
    Scenario: Broad regression reports registration and actual failures
      Given a clean detached checkout and isolated AOF_GLOBAL_HOME
      When the repository's sharded verification and relevant UI build run
      Then verification records the exact commands, revision and outcomes
      And unregistered tests, unresolved controls and persistent failures are not reported green

