@ui @adapter @design
Feature: accessible runtime form

  Rule: R1 · Configuration editing previews resolved choices and changes configuration only

    @executable
    Scenario Outline: Form states remain usable
      Given the config page is in state "<state>"
      When the operator uses the runtime controls
      Then the page shows "<behavior>"
    
      Examples:
        | state                    | behavior                                  |
        | loading                  | labeled loading state and no stale save   |
        | legacy empty settings    | inherited defaults and their sources      |
        | populated scoped values  | editable values with resolved preview     |
        | load failed              | visible error and retry                   |
        | validation failed        | field errors with unsaved input retained  |
        | save failed              | retry without losing the edits            |
        | global scope             | explanation that execution is project-only |
    
    @executable
    Scenario: Controls are reachable and errors are associated
      Given the runtime form is populated
      When a keyboard-only operator changes runtime and submits an invalid effort
      Then all controls have accessible names and visible focus
      And the error is associated with the affected field
      And changing runtime exposes the relevant settings without discarding the other runtime's values

    @manual
    Scenario: Runtime form conforms to the binding design baseline
      Given the existing config styling and DESIGN binding checklist
      When the page is inspected at widths 390, 768 and 1280 pixels
      Then its region order, components and loading, empty, error and populated states match the checklist
      And no horizontal overflow, clipped labels or inaccessible focus is observed

