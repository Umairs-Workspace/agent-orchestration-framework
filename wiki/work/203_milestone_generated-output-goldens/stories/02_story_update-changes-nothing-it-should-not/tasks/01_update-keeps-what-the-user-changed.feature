@executable @cli @assets @scaffold
Feature: Update keeps what the user changed

  WHY. A user edits an aof file to suit their project, and adds files of their own beside aof's.
  Update must keep both, and must say which aof file it left alone, so the user knows that file
  is no longer receiving releases (ADR-006 §2).

  Background:
    Given scenario "customised-update" of lane "work-update" names base "work-init/customised"
    And it starts from the committed "work-init/customised" baseline, rebuilt into a real tree
    And its one step is "work update --json"

  Rule: R2 · Update keeps what the user changed, and says so

    Scenario: the customised update renders to its baseline
      When the harness compares scenario "customised-update" in lane "work-update"
      Then it passes

    Scenario: E4 · an aof file the user edited is kept, and reported as drift
      Given the rebuilt tree's ".claude/commands/aof/refine.md" has the line "Mine: run the linter first." appended
      When scenario "customised-update" runs
      Then ".claude/commands/aof/refine.md" still ends with "Mine: run the linter first."
      And the step reports "drift-warning" for ".claude/commands/aof/refine.md"
      And the summary counts 1 drift-warning and 0 updated

    Scenario: E5 · a file the user added is untouched, and no action names it
      Given the rebuilt tree holds ".claude/commands/release.md" with "# Release\n"
      When scenario "customised-update" runs
      Then ".claude/commands/release.md" holds exactly "# Release\n"
      And no action in the step record names ".claude/commands/release.md"

    Scenario: E6 · the user's merged entries survive the update
      When scenario "customised-update" runs
      Then ".claude/settings.json" still allows "Bash(npm test)" and holds the "Stop" hook that runs "say done"
      And ".codex/hooks.json" still holds the hook that runs "echo mine"

    Scenario: the stored delta is the user's two files and the step record
      When the stored delta of scenario "customised-update" is listed
      Then it holds ".claude/commands/aof/refine.md", ".claude/commands/release.md" and "steps.golden"
      And of the install records it holds ".aof/aof.lock.json" alone, with the kept file's entry moved to the end
      And its "removed.golden" is empty

    # Amended at verify, 2026-11-21: `update` appends a kept, drift-warned file's lock entry after
    # the planned ones (`createLockManifest`), so the lock is stored changed too.
