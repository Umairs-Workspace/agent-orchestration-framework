@cli @work @design
Feature: The bundle ships /aof:add-diagram beside the other commands

  WHY. A command that reaches no repo does not exist: it ships in "packages/core/assets/commands" so
  "aof work update" renders it everywhere the other commands go. Four censuses say the bundle's
  command set is COMPLETE, and each must move with the diff that grows it. The generator is still
  named once (FF-13301), so the new prose names aof's verbs and never the drawing tool.

  @executable
  Scenario: the command renders for every runtime the bundle targets
    When the bundle is rendered by "aof work update"
    Then ".claude/commands/aof/add-diagram.md" exists
    And ".opencode/commands/aof/add-diagram.md" exists
    And ".codex/skills/aof-add-diagram/SKILL.md" exists
    And its argument hint is "<ref> [ADR-NNN]"

  @executable
  Scenario: every census of the bundle's commands names it
    When the bundle's command set is read
    Then "add-diagram" is in the bundle suite's command list, and the command count is one more than before
    And "add-diagram" is in the autonomous shell-out census of commands, in the descriptor's own order
    And "add-diagram.md" is excluded from the learning edge with the reason "draws an existing item's ADR diagrams; cuts nothing"
    And "manifest.json" carries the rendered copies' hashes

  @executable
  Scenario: the generator is still named once
    When FF-13301 sweeps the source tree and the bundle
    Then the sweep reaches "packages/core/assets/commands/add-diagram.md"
    And "add-diagram.md" does not name the generator
