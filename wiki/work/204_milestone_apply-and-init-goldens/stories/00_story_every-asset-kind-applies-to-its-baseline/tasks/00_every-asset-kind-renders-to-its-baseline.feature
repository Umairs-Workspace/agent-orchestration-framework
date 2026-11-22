@executable @cli @assets @distribution
Feature: Every asset kind renders to its baseline

  WHY. `aof assets apply` turns a project's own `.aof/` into each runtime's folder, and also writes
  the lock and the apply journal a user commits. One fixture holding every kind, applied for all
  three runtimes and held whole, shows any change to any of that as a diff (ADR-001).

  Background:
    Given the "assets-apply" lane is registered with the harness
    And scenario "every-kind" names no base, starts with the files of "EVERY_KIND", and its step is "assets apply --json"

  Rule: R1 · Every asset kind renders for every runtime that takes it, and the tree equals the committed baseline

    Scenario: E1 · the three-runtime apply renders to its whole baseline, and the home stays empty
      When the harness compares scenario "every-kind" in lane "assets-apply"
      Then it passes
      And the stored baseline of "every-kind" holds no "removed.golden"
      And the captured home tree of "every-kind" holds no file

    Scenario Outline: each kind renders for each runtime that takes it
      When scenario "every-kind" runs
      Then "<output>" exists, rendered from the <kind> "<id>" for <runtime>

      Examples:
        | kind         | id           | runtime  | output                                 |
        | agent        | my-agent     | claude   | .claude/agents/my-agent.md             |
        | agent        | my-agent     | codex    | .codex/agents/my-agent.toml            |
        | agent        | my-agent     | opencode | .opencode/agents/my-agent.md           |
        | skill        | my-skill     | claude   | .claude/skills/my-skill/SKILL.md       |
        | skill        | my-skill     | codex    | .agents/skills/my-skill/SKILL.md       |
        | skill        | my-skill     | opencode | .opencode/skills/my-skill/SKILL.md     |
        | rule         | my-rule      | claude   | .claude/rules/my-rule.md               |
        | rule         | my-rule      | opencode | .opencode/rules/my-rule.md             |
        | workflow     | release      | claude   | .claude/aof/workflows/release.md       |
        | workflow     | release      | codex    | .codex/aof/workflows/release.md        |
        | workflow     | release      | opencode | .opencode/aof/workflows/release.md     |
        | hook         | lint-on-stop | codex    | .codex/hooks.json                      |
        | hook         | lint-on-stop | opencode | .opencode/plugins/aof-lint-on-stop.js  |
        | project doc  | guide        | claude   | CLAUDE.md                              |
        | project doc  | guide        | codex    | AGENTS.md                              |

    Scenario: the Claude hook lands in the merged settings, marked as aof's
      When scenario "every-kind" runs
      Then ".claude/settings.json" holds a "Stop" hook running "npm run lint" marked "aofManaged" "lint-on-stop"

    Scenario: E2 · a command renders for claude and opencode, and Codex gets none
      Given the fixture's command "my-command" names runtimes "claude" and "opencode"
      When scenario "every-kind" runs
      Then ".claude/commands/my-command.md" and ".opencode/commands/my-command.md" exist
      And no file under ".codex/" or ".agents/" is rendered from "my-command"

    Scenario: E3 · the MCP servers render for claude and codex, and opencode gets none
      When scenario "every-kind" runs
      Then ".mcp.json" declares the servers "docs" and "remote"
      And ".codex/config.toml" declares the servers "docs" and "remote" under "mcp_servers"
      And no file under ".opencode/" declares an MCP server

    Scenario: E4 · the rule scoped to src renders beside the root project doc, not into it
      When scenario "every-kind" runs
      Then "src/AGENTS.md" holds the rule "my-rule" inside an aof-managed block
      And "AGENTS.md" holds the project doc "guide" and not the rule "my-rule"

  Rule: R3 · The lock and the journal record exactly what apply wrote

    Scenario: E8 · the lock holds one entry per output but the merged Claude settings
      When scenario "every-kind" runs
      Then ".aof/aof.lock.json" holds one entry for each output the step reports, and none for ".claude/settings.json"
      And every entry names its path, runtime, resource and hash
      And the entry for ".codex/config.toml" records "toml" ownership

    Scenario: E9 · the apply journal holds every Codex output's intent
      When scenario "every-kind" runs
      Then ".aof/aof.apply-journal.json" holds one entry for each output whose runtime is "codex"
