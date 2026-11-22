@executable @cli @assets @distribution
Feature: The user's entries survive every merge

  WHY. A wrong merge damages the user's file, not aof's. Held to a baseline over a project that
  holds the user's own file at every merge point, each merge shows that only aof's entries moved
  (ADR-001 §3, ADR-002).

  Background:
    Given the "assets-merge" lane is registered with the harness
    And scenario "customised" names base "assets-apply/every-kind", starts with the files of "EVERY_KIND" and "USER_FILES", and its step is "assets apply --json"

  Rule: R1 · Over the user's own files, apply moves only aof's entries

    Scenario: E1 · the customised project renders to its baseline
      When the harness compares scenario "customised" in lane "assets-merge"
      Then it passes

    Scenario: E2 · the Claude settings keep the user's allow and hook beside aof's
      Given "USER_FILES" holds ".claude/settings.json" allowing "Bash(npm test)" with a "Stop" hook running "say done"
      When scenario "customised" runs
      Then ".claude/settings.json" still allows "Bash(npm test)"
      And it still holds the "Stop" hook running "say done", before aof's
      And it holds the "Stop" hook running "npm run lint" marked "aofManaged" "lint-on-stop"

    Scenario: E3 · the Codex config keeps the user's key and server byte for byte
      Given "USER_FILES" holds ".codex/config.toml" as "approval_policy = \"never\"\n\n[mcp_servers.mine]\ncommand = \"my-mcp\"\n"
      When scenario "customised" runs
      Then ".codex/config.toml" holds the line "approval_policy = \"never\"" and the table "[mcp_servers.mine]" with its "command" line, unchanged
      And parsed as TOML it holds "model" = "o3" at the top level and the servers "mine", "docs" and "remote"

    Scenario: the Codex hooks keep the user's group first
      Given "USER_FILES" holds ".codex/hooks.json" with a "Stop" group running "echo mine"
      When scenario "customised" runs
      Then the "Stop" groups of ".codex/hooks.json" are the user's "echo mine" group, then aof's "npm run lint" group

    Scenario Outline: E4 · each AGENTS.md starts with the user's lines byte for byte, then aof's block
      Given "USER_FILES" holds "<file>" as <user text>
      When scenario "customised" runs
      Then "<file>" starts with <user text>
      And what follows is one aof-managed block holding <aof content>

      Examples:
        | file          | user text             | aof content            |
        | AGENTS.md     | "# Agents\nMine.\n"   | the project doc "guide" |
        | src/AGENTS.md | "# Src\nMine.\n"      | the rule "my-rule"      |

    Scenario Outline: E5 · the ignore files aof did not write are kept
      Given "USER_FILES" holds "<file>" as <user text>
      When scenario "customised" runs
      Then "<file>" holds exactly <user text>
      And the step reports "<file>" as <reported>

      Examples:
        | file              | user text          | reported                        |
        | .gitignore        | "node_modules/\n"  | nothing, because aof renders no such file |
        | .claude/.gitignore | "local.json\n"    | "drift-warning"                  |
