@executable @cli @assets @scaffold
Feature: Init keeps the lines and sections it did not write

  WHY. Today init writes `.aof/.gitignore` whole. So a user's ignore lines are dropped, and so are
  the entries `aof work init` wrote, and files the user or aof meant to keep out of git start
  showing as untracked. The file already has an additive owner, and init must go through it
  (ADR-005).

  Background:
    Given the "project-init" lane is registered with the harness

  Rule: R2 · Init keeps every line and section it did not write

    Scenario: E3 · the user's ignore lines are kept, and init's line is appended
      Given scenario "customised" names base "empty", starts with ".aof/.gitignore" holding "scratch/\n" and ".gitignore" holding "node_modules/\n", and its step is "init --runtime claude,codex,opencode --json"
      When the harness compares scenario "customised" in lane "project-init"
      Then it passes
      And ".aof/.gitignore" holds exactly "scratch/\n/work/\n"
      And ".gitignore" holds exactly "node_modules/\n"

    Scenario: E4 · after work init, init keeps work init's ignore entries and appends its own
      Given scenario "after-work-init" names base "work-init/claude", and its steps are "work init --runtime claude --json" then "init --runtime claude --json"
      When the harness compares scenario "after-work-init" in lane "project-init"
      Then it passes
      And ".aof/.gitignore" holds every line of "work-init/claude"'s ".aof/.gitignore", in order, then "/work/"

    Scenario: E5 · after work init, init keeps the lock's work section
      When scenario "after-work-init" runs
      Then the "work" section of ".aof/aof.lock.json", normalised, equals the one in "work-init/claude"'s baseline
      And the lock gains only the top-level keys init writes: "version", "generatedAt", "catalog", "runtimes" and "items"

    Scenario: init adds nothing when its line is already there
      Given a project whose ".aof/.gitignore" holds "/work/\nscratch/\n"
      When "init --runtime claude --json" runs
      Then ".aof/.gitignore" holds exactly "/work/\nscratch/\n"
