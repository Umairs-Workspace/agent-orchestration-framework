@cli @adapter @distribution @executable
Feature: owned migration

  Rule: R1 · Only unchanged AOF-owned content may be replaced or removed

    Scenario: E1 · Owned legacy skills migrate once
      Given ".codex/skills/aof-refine/SKILL.md" matches its previous lock hash
      When the native Codex upgrade is applied twice
      Then only ".agents/skills/aof-refine/SKILL.md" remains discoverable
      And the first apply records the new ownership
      And the second apply reports no changes
    
    Scenario: E2 · Drifted legacy skill blocks duplicate discovery
      Given the lock-owned legacy refine skill contains operator edits
      When the native upgrade is planned and applied
      Then the upgrade reports drift with the old and new paths
      And it neither removes the edited skill nor creates the competing new skill
    
    Scenario Outline: Interrupted migration remains recoverable
      Given migration is interrupted at "<checkpoint>"
      When the operator retries using the recorded ownership and current files
      Then the result is either one complete native installation or an explicit conflict
      And no unrelated file is deleted or silently adopted
    
      Examples:
        | checkpoint                         |
        | before target write                |
        | after target write before old removal |
        | after old removal before lock save |
    
    Scenario: Dry run exposes migration without writing
      Given unchanged tracked legacy outputs and unrelated generated-runtime files
      When upgrade is requested as a dry run
      Then moves, shared-file merges and refusals are listed
      And the filesystem and lock are unchanged

