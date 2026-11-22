@executable @cli @assets @distribution
Feature: Clean hands every merged file back

  WHY. Today clean deletes a merged file whole when its hash matches the lock, and the lock records
  the merged file's hash. So the user's `AGENTS.md`, Codex config and Codex hooks are deleted with
  aof's entries. Clean must remove what aof recorded as its own and keep the rest (ADR-004).

  Background:
    Given the "assets-clean" lane is registered with the harness
    And scenario "customised" names base "plain", starts with the files of "EVERY_KIND" and "USER_FILES", and its steps are "assets apply --json" and "assets clean --json"

  Rule: R2 · Clean hands every merged file back holding only the user's content

    Scenario: the customised apply-then-clean renders to its baseline
      When the harness compares scenario "customised" in lane "assets-clean"
      Then it passes

    Scenario Outline: E4 · a user's Markdown file comes back byte for byte
      When scenario "customised" runs
      Then "<file>" holds exactly <user text>
      And the clean step reports "<file>" as "retract"

      Examples:
        | file          | user text            |
        | AGENTS.md     | "# Agents\nMine.\n"  |
        | src/AGENTS.md | "# Src\nMine.\n"     |
        | CLAUDE.md     | "# Claude\nMine.\n"  |

    Scenario Outline: E5 · a user's JSON or TOML file comes back to the user's value
      When scenario "customised" runs
      Then "<file>", parsed, equals the parsed value "USER_FILES" gave it
      And the clean step reports "<file>" as "retract"

      Examples:
        | file               |
        | .codex/config.toml |
        | .codex/hooks.json  |
        | .mcp.json          |

    Scenario: E6 · the ignore files aof did not write are not in clean's report
      When scenario "customised" runs
      Then ".gitignore" holds exactly "node_modules/\n" and ".claude/.gitignore" holds exactly "local.json\n"
      And the clean step reports neither

    Scenario: clean never deletes a user's content (FF-20402)
      Given a lock entry carrying ownership for a file that holds content outside aof's recorded fragment
      When clean plans it
      Then its action is "retract" or "drift-warning", never "delete"
      And the arch control "FF-20402" in "test/arch/store/acd-codex-output-ownership.test.mjs" asserts this for every ownership kind
