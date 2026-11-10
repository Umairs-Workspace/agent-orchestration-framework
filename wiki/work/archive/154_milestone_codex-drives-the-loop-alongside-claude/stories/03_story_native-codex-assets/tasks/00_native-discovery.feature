@cli @adapter @distribution @executable
Feature: native discovery

  Rule: R1 · Codex asset locations and formats match their actual discovery scope

    Scenario: E1 · Codex discovers the refine skill and its references
      Given a project with a command-derived refine skill and supporting files
      When a Codex render plan is produced
      Then the skill is rooted at ".agents/skills/aof-refine/SKILL.md"
      And every supporting reference resolves relative to its rendered location
      And no duplicate ".codex/skills/aof-refine" output is planned
    
    Scenario Outline: Native asset forms retain meaningful metadata
      Given a Codex asset of kind "<kind>"
      When it is rendered for the supported profile
      Then its native output exposes "<fields>"
    
      Examples:
        | kind          | fields                                                |
        | custom agent  | name, description, developer_instructions, model, effort |
        | ordinary skill | SKILL.md name, description and body                   |
        | explicit procedure | skill invocation policy disallowing implicit use |
    
    Scenario: Existing assistants retain their rendered semantics
      Given the same mixed asset configuration targets Claude, Codex and OpenCode
      When all outputs are rendered
      Then Claude and OpenCode paths, supported metadata and invocation semantics match their existing fixtures
      And Codex native mapping does not change the shared source resource

