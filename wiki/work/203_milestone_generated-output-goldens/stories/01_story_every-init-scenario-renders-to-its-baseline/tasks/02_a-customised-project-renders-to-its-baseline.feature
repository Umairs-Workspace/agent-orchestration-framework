@executable @cli @assets @scaffold
Feature: A customised project renders to its baseline

  WHY. A user's project already holds files when they run `init`: their own commands, their
  settings, their agents' instructions. `init` merges into some of them and writes beside the
  rest. A wrong merge damages the user's file, not aof's. Held to a baseline, what `init` does to
  each user file is visible, including the one it overwrites today (ADR-005).

  Background:
    Given the "work-init" lane is registered with the harness
    And scenario "customised" names base "default", and its step is "work init --runtime claude,codex,opencode --json"

  Rule: R3 · Over a project holding the user's own files, init keeps them, and its baseline says what it did to each

    Scenario: the customised project renders to its baseline
      When the harness compares scenario "customised" in lane "work-init"
      Then it passes

    Scenario Outline: a user file aof does not write is kept byte for byte
      Given scenario "customised" starts with "<file>" holding <content>
      When scenario "customised" runs
      Then "<file>" holds exactly <content>

      Examples:
        | example | file                       | content                                       |
        | E9      | .claude/commands/deploy.md | "# Deploy\nMine.\n"                           |
        | E12     | .codex/config.toml         | "model = \"o3\"\n"                            |
        | E12     | .opencode/opencode.json    | a "$schema" line and nothing else             |
        | E12     | AGENTS.md                  | "# Agents\nMine.\n"                           |
        | E12     | CLAUDE.md                  | "# Claude\n"                                  |
        | E12     | .gitignore                 | "node_modules/\n"                             |

    Scenario: E10 · the Claude settings merge keeps the user's entries beside aof's
      Given scenario "customised" starts with ".claude/settings.json" allowing "Bash(npm test)" and holding a "Stop" hook that runs "say done"
      When scenario "customised" runs
      Then ".claude/settings.json" still allows "Bash(npm test)"
      And it still holds the "Stop" hook that runs "say done"
      And it holds aof's session hooks and denies, each marked "aofManaged"

    Scenario: E11 · the Codex hooks merge keeps the user's hook beside aof's
      Given scenario "customised" starts with ".codex/hooks.json" holding a "Stop" hook that runs "echo mine"
      When scenario "customised" runs
      Then ".codex/hooks.json" still holds the hook that runs "echo mine"
      And it holds aof's session hooks

    Scenario: E13 · the work dir's gitignore keeps the user's line and gains aof's
      Given scenario "customised" starts with "wiki/work/.gitignore" holding "scratch/"
      When scenario "customised" runs
      Then "wiki/work/.gitignore" still holds "scratch/"
      And it holds aof's two heartbeat lines

    Scenario: E14 · a user file at an aof path is held as init leaves it today
      Given scenario "customised" starts with ".claude/agents/aof-architect.md" holding "mine"
      When scenario "customised" runs
      Then ".claude/agents/aof-architect.md" holds aof's architect, the same as in "default"
      And the step record reports it as "update"
      And the stored delta of "customised" does not store that file, because it equals the base's
