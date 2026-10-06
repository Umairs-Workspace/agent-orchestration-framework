@ui @adapter @round-trip @executable
Feature: config roundtrip

  Rule: R1 · Configuration editing previews resolved choices and changes configuration only

    Scenario: E1 · The config editor explains the legacy default
      Given both assistants are installed and execution runtime is unset
      When the project config payload is loaded
      Then the effective execution runtime is Claude with source default
      And the installed runtimes and primary execution runtime are separate fields
      And phase and role values have visible sources
    
    Scenario: E2 · Saving Codex changes configuration only
      Given a project config with unrelated resources, memory and runtime overrides
      When Codex and valid scoped model settings are saved through the config editor
      Then a reload shows those saved choices and their effective values
      And unrelated fields and legacy Claude settings are preserved
      And no apply, install or assistant launch is performed
    
    Scenario Outline: Invalid edits do not corrupt persisted config
      Given the operator submits "<edit>"
      When the existing save endpoint validates it
      Then the field error identifies the invalid value
      And the saved configuration is unchanged
    
      Examples:
        | edit                                     |
        | unknown execution runtime                |
        | malformed phase settings                 |
        | unsupported effort for the selected model |
        | invalid runtime-scoped model map         |

