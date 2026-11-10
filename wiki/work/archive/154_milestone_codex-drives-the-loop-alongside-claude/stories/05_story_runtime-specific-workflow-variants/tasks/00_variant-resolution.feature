@cli @adapter @distribution @executable
Feature: variant resolution

  Rule: R1 · Runtime variants preserve shared workflow gates and use native invocation

    Scenario: E2 · Project overrides remain the final customization
      Given a common procedure body, a bundled Claude variant and a project Claude override
      When the bundle is rendered for Claude and Codex together
      Then the Claude result uses the project override
      And the Codex result uses its own variant over the common contract
      And neither runtime's override leaks into the other
    
    Scenario Outline: Typed references resolve after runtime mapping
      Given a shared resource references "<target>"
      When it is rendered for both supported assistants
      Then each output names its actual native target
      And every referenced generated or supporting file exists in the render plan
    
      Examples:
        | target                  |
        | another procedure       |
        | a reviewer role         |
        | a supporting reference  |
        | an attached skill file  |
    
    Scenario: Missing or conflicting variants refuse visibly
      Given a bundle names a missing variant or two outputs for one native target
      When validation or rendering is requested
      Then the diagnostic identifies the resource and runtime
      And no partial installation is reported successful

