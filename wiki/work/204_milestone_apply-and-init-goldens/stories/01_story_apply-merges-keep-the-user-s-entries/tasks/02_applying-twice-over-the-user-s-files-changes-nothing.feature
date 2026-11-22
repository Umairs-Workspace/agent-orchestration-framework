@executable @cli @assets @distribution
Feature: Applying twice over the user's files changes nothing

  WHY. A merge that re-applies its own entries, reorders the user's or reserialises an unchanged
  file would show as churn in the user's diff on every run. A second apply over a merged tree must
  change nothing (ADR-002 §2).

  Background:
    Given the "assets-merge" lane is registered with the harness
    And scenario "customised-re-apply" names base "customised", starts with the files of "EVERY_KIND" and "USER_FILES", and its steps are "assets apply --json" twice

  Rule: R3 · Applying twice over the user's files changes nothing

    Scenario: E10 · the second apply skips every file aof owns
      When the harness compares scenario "customised-re-apply" in lane "assets-merge"
      Then it passes
      And both steps exit 0
      And the second step reports every action as "skip", except ".claude/.gitignore" as "drift-warning"
      And the stored delta of "customised-re-apply" holds "steps.golden" and no file

    Scenario Outline: a second apply leaves each merged file byte for byte as the first left it
      When scenario "customised-re-apply" runs
      Then "<file>" is byte for byte what scenario "customised" holds

      Examples:
        | file                  |
        | CLAUDE.md             |
        | .mcp.json             |
        | AGENTS.md             |
        | src/AGENTS.md         |
        | .codex/config.toml    |
        | .codex/hooks.json     |
        | .claude/settings.json |
