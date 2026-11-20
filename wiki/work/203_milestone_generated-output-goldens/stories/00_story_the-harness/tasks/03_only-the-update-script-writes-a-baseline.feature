@executable @cli @assets @scaffold
Feature: Only the update script writes a baseline

  WHY. A check that rewrites its own expectations is no check. A change that is meant is accepted
  by one explicit command, and the baselines it writes are reviewed in the PR like any other diff
  (ADR-004).

  Background:
    Given a fixture lane "fixture" whose baselines live under a temp baseline root

  Rule: R4 · Only `scripts/golden.mjs --update` writes a baseline

    Scenario: E21 · a failing run leaves every baseline byte as it was
      Given scenario "s" whose fixture output differs from its committed baseline
      When the suite's comparison of scenario "s" runs
      Then it fails
      And every file under the baseline root has the bytes and modification time it had before

    Scenario: without --update, the script reports exactly what the suite reports
      Given scenario "s" whose fixture output differs from its baseline in one file
      When "node scripts/golden.mjs --lane fixture --scenario s" runs
      Then it exits non-zero
      And it prints the same summary and diff the suite's comparison printed
      And it writes nothing

    Scenario: --update writes a scenario with no base whole
      Given scenario "base" has no baseline yet
      When "node scripts/golden.mjs --lane fixture --scenario base --update" runs
      Then "base" has one ".golden" file per captured file, under "project/" and "home/"
      And it has "steps.golden" and an empty "removed.golden"
      And it prints each file it wrote

    Scenario: E22 · --update stores only what a derived scenario changes
      Given scenario "s" names base "base"
      And its fixture output equals the base's except "b.md", and it lacks "a.md"
      When "node scripts/golden.mjs --lane fixture --scenario s --update" runs
      Then "s" stores "project/b.md.golden" and no other file under "project/"
      And its "removed.golden" lists "project/a.md"
      And it stores "steps.golden"

    Scenario: E25 · --update removes a stored file the scenario no longer differs on
      Given scenario "s" stores "project/b.md.golden"
      And its fixture output's "b.md" now equals the base's
      When "node scripts/golden.mjs --lane fixture --scenario s --update" runs
      Then "project/b.md.golden" no longer exists under "s"

    Scenario: E23 · updating a base re-derives every scenario that builds on it, base first
      Given scenarios "s" and "t" name base "base"
      And the fixture verb's output for every scenario changes in "a.md"
      When "node scripts/golden.mjs --lane fixture --scenario base --update" runs
      Then "base" is written before "s" and "t"
      And "s" and "t" store no "a.md", because each now matches the new base
      And a following comparison of all three passes

    Scenario: E24 · a second --update writes nothing and says so
      Given every scenario in lane "fixture" matches its baseline
      When "node scripts/golden.mjs --lane fixture --update" runs
      Then no file under the baseline root changes bytes or modification time
      And it prints that every baseline was already current

    Scenario: --update over every lane, and over one lane
      When "node scripts/golden.mjs --update" runs
      Then every registered lane's scenarios are compared and written
      And with "--lane fixture" only lane "fixture" is

    Scenario: an unknown lane or scenario is refused by name, writing nothing
      When "node scripts/golden.mjs --lane nowhere --update" runs
      Then it exits non-zero naming "nowhere" and the lanes that exist
      And it writes nothing
