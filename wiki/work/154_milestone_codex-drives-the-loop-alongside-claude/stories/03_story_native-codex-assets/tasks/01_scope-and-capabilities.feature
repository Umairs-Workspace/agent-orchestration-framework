@cli @adapter @distribution @executable
Feature: scope and capabilities

  Rule: R1 · Codex asset locations and formats match their actual discovery scope

    Scenario: E2 · Directory guidance lands in the actual project hierarchy
      Given a rule scoped to directory "src"
      When Codex outputs are planned
      Then the rule is placed at "src/AGENTS.md"
      And no ".codex/src/AGENTS.md" is planned
    
    Scenario Outline: Scope limitations are visible
      Given guidance with scope "<scope>"
      When the Codex render plan is inspected
      Then it reports "<placement>" and "<diagnostic>"
    
      Examples:
        | scope           | placement                          | diagnostic                    |
        | project root    | root AGENTS.md owned content       | no scope degradation          |
        | src/components  | src/components/AGENTS.md content   | no scope degradation          |
        | src/**/*.test.* | root advisory condition            | glob enforcement unavailable  |
        | ../outside      | no output                          | unsafe scope refusal          |
    
    Scenario: Unsupported runtime properties do not masquerade as enforcement
      Given a role requests a tool restriction unsupported by the Codex profile
      When the output and warnings are inspected
      Then the capability gap names the property and runtime
      And rendered prose does not claim an enforced permission boundary

