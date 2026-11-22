@executable @cli @assets @distribution
Feature: Clean removes every file aof wholly owns

  WHY. `clean` is how a user takes aof's output back out of a project. Held to a baseline after a
  plain apply, it shows exactly what clean removes and what it leaves, including the two things it
  leaves today and is not asked to change here (ADR-004, ADR-006 §1).

  Background:
    Given the "assets-clean" lane is registered with the harness
    And scenario "plain" names no base, starts with the files of "EVERY_KIND", and its steps are "assets apply --json", "assets clean --json" and "assets clean --json"

  Rule: R1 · Clean removes every file aof wholly owns, and a second clean changes nothing

    Scenario: the plain apply-then-clean renders to its baseline
      When the harness compares scenario "plain" in lane "assets-clean"
      Then it passes

    Scenario: E1 · every rendered file is gone, the co-authored ones aof created alone included
      When scenario "plain" runs
      Then no file the first step reports as "create" exists, except ".claude/settings.json"
      And "AGENTS.md", "src/AGENTS.md", "CLAUDE.md", ".mcp.json", ".codex/config.toml" and ".codex/hooks.json" do not exist
      And ".aof/aof.lock.json" holds no file entry
      And the second step reports each co-authored file as "delete", because nothing of a user's was left in it

    Scenario: E2 · a second clean does nothing
      When scenario "plain" runs
      Then the third step exits 0 and reports no action
      And the tree after it equals the tree after the second step

    Scenario: E3 · the merged Claude settings and the journal are held as today's behaviour
      When scenario "plain" runs
      Then ".claude/settings.json" still holds the "Stop" hook running "npm run lint" marked "aofManaged" "lint-on-stop"
      And ".aof/aof.apply-journal.json" still exists

    Scenario: the source .aof/ is untouched by clean
      When scenario "plain" runs
      Then ".aof/aof.config.json" and every asset body under ".aof/assets/" hold exactly what "EVERY_KIND" holds
