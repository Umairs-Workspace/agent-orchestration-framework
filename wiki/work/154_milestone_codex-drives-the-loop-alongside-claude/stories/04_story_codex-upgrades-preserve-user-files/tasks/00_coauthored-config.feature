@cli @adapter @distribution @executable
Feature: coauthored config

  Rule: R1 · Only unchanged AOF-owned content may be replaced or removed

    Scenario: Shared Codex files retain operator content
      Given Codex config, hooks and root guidance contain operator-owned settings and text
      When AOF applies its owned MCP entries, supported hooks and guidance block
      Then the operator content and unrelated values remain intact
      And the generated ownership is recorded for future comparison
      And a second identical apply produces no changes
    
    Scenario Outline: Collisions fail before shared-file mutation
      Given "<collision>" at a requested Codex target
      When apply is requested
      Then the diagnostic identifies the collision and proposed target
      And user-owned bytes and the prior lock remain unchanged
    
      Examples:
        | collision                              |
        | an unowned agent with the same name     |
        | an unowned skill at the target path     |
        | a user MCP entry with the same key      |
        | an edited AOF guidance block            |
        | invalid existing TOML                   |
        | a target escaping the configured root  |
    
    Scenario: Applying assets cannot grant trust or change access
      Given user authentication and trust files exist
      When Codex assets and supported hooks are applied
      Then authentication and trust files are byte-for-byte unchanged
      And no hook is described as active when the CLI profile cannot load it

