@cli @adapter @distribution @executable
Feature: role and delegation controls

  Rule: R1 · Runtime variants preserve shared workflow gates and use native invocation

    Scenario Outline: Primary assistant and delegation stay separate
      Given primary runtime "<primary>" and cross-assistant delegation "<delegation>"
      When a native build or review role is requested
      Then the role launches within "<native>"
      And cross-assistant work occurs only when separately requested and enabled
    
      Examples:
        | primary | delegation | native |
        | claude  | disabled   | claude |
        | codex   | disabled   | codex  |
        | claude  | enabled    | claude |
        | codex   | enabled    | codex  |
    
    Scenario: Unsupported native orchestration fails honestly
      Given a runtime profile cannot supply the configured independent role
      When an orchestrated procedure is requested
      Then AOF identifies the missing capability before claiming independent review
      And it does not silently mark an inline self-review as an independent review
    
    Scenario: Role model and effort selection are native and bounded
      Given a supported runtime-scoped reviewer model and effort
      When a configured orchestrated review starts
      Then the native role receives those settings or an explicit unsupported-setting refusal
      And the configured concurrency and rereview bounds still apply

