@executable @assets @adapter @distribution @design
Feature: The extract command is Claude's alone, and is installed whether the practice is on or off

  WHY. Only a Claude session holds the Artifact tool, so only Claude can publish a Design System
  (ADR-003). Extraction is what writes `work.ui.designSystem`, so it cannot wait for that key: it
  is a whole command member with "runtimes": ["claude"], gated by no practice (ADR-008). It follows
  the Design System type's own `from-code.md`, which it reads from the type at run time. A copy
  in the bundle would go stale the day the type changes (ADR-004 §4).

  Rule: R2 · The extract command is Claude's alone, and it is installed whether the key is on or off

    Scenario: E3 · the command is rendered for Claude and for no other runtime
      Given a project installed for claude, codex and opencode, with no "work.ui" block
      When "aof work update" runs
      Then ".claude/commands/aof/design-system.md" exists
      And no file under ".agents/skills" or ".opencode/commands" is named for "design-system"
      And no Codex skill's text holds the command's body

    Scenario Outline: the practice's state does not decide whether the command is installed
      Given "work.ui.designSystem" is <block>
      When "aof work update" runs
      Then ".claude/commands/aof/design-system.md" exists

      Examples:
        | block                                                                                           |
        | absent                                                                                          |
        | {"enabled": false}                                                                              |
        | {"enabled": true, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]}           |

    Scenario: E4 · the command reads from-code.md from the type, and the package ships no copy
      When the rendered ".claude/commands/aof/design-system.md" is read
      Then it says to read "from-code.md" from the Design System type at run time
      And no file under "packages/design-system/assets" is named "from-code.md" or "format.md"

  Scenario: the command hands every deterministic step to a verb
    When the rendered ".claude/commands/aof/design-system.md" is read
    Then it calls "aof design-system tokens", "aof design-system check" and "aof design-system use"
    And it reads each verb's "--json" answer
    And it says to resolve the title before publishing, and to stop when another system holds it
    And it says to ask the operator before publishing, and again before "use" writes the config

  Scenario: the shipped manifest and this repository's render carry the command
    When the bundle manifest is regenerated and "aof work update" runs in this repository
    Then "packages/acd/assets/manifest.json" lists ".claude/commands/aof/design-system.md"
    And ".claude/commands/aof/design-system.md" is committed
