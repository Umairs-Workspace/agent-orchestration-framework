@executable @cli @planning
Feature: Cowork is recorded beside claude and codex, on cowork's own terms

  WHY. Planning in Cowork while building in Claude Code needs both installs recorded, and neither
  may disturb the other. --scope chooses a Claude Code settings file, which means nothing to an
  account-level Cowork plugin, so naming it with cowork is refused rather than silently ignored.
  The packages are rebuilt from the recorded commit at will, so they stay out of git.

  Background:
    Given a target repo
    And the marketplace commit sha is resolved from a fixture so no network is touched
    And the planner source is a fixture tree at that commit

  Rule: R2 · Cowork is recorded beside claude and codex

    Scenario: E6 · cowork is added beside a recorded claude install
      Given the lock records a claude planning entry
      When I run "aof planning init --runtime cowork"
      Then the command exits 0
      And the lock records planning entries for exactly "claude,cowork"
      And the lock's planning entry for "claude" is unchanged from before the run

    Scenario: E7 · re-installing cowork without --force is refused
      Given the lock records planning entries for "claude" and "cowork"
      When I run "aof planning init --runtime cowork"
      Then the command exits non-zero
      And the output points the user to "--force"
      And the lock file is byte-for-byte what it was

    Scenario: --force re-pins cowork only
      Given the lock records planning entries for "claude" and "cowork"
      When I run "aof planning init --runtime cowork --force"
      Then the command exits 0
      And the lock's planning entry for "cowork" has a new "generatedAt"
      And the lock's planning entry for "claude" is unchanged from before the run

  Rule: R3 · --scope has no meaning for Cowork

    Scenario Outline: E8 · naming --scope with cowork is refused and writes nothing
      When I run "aof planning init --runtime cowork --scope <scope>"
      Then the command exits non-zero
      And the output says "--scope" applies only to claude
      And no file exists under ".aof/cowork/"
      And the lock file is byte-for-byte what it was

      Examples:
        | example | scope   |
        | E8      | user    |
        |         | project |
        |         | local   |

    Scenario: E9 · without --scope the cowork entry carries no scope
      When I run "aof planning init --runtime cowork"
      Then the command exits 0
      And the lock's planning entry for "cowork" has no "scope" field

  Rule: R4 · The generated packages stay out of git

    Scenario: E10 · the packages are ignored by git
      Given the target repo is a git repository
      When I run "aof planning init --runtime cowork"
      Then the file ".aof/cowork/.gitignore" holds exactly "*"
      And "git status --porcelain" lists nothing under ".aof/cowork/"
