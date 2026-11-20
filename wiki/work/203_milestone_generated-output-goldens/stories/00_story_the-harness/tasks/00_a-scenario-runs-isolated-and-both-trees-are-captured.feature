@executable @cli @assets @scaffold
Feature: A scenario runs isolated, and both trees are captured

  WHY. aof's product is what a verb leaves on disk, in the project and in the global home. A check
  of it must run the verb as a user does, through the CLI, and must never touch the real `~/.aof`,
  which holds a live machine's config and mesh stores (ADR-001).

  The subject here is a fixture verb: a small script that writes the files a scenario tells it to,
  into its working directory and into `$AOF_GLOBAL_HOME`, prints a JSON envelope and exits with a
  given code. No aof verb is run.

  Background:
    Given a fixture lane "fixture" whose steps run the fixture verb

  Rule: R1 · A verb runs in a temp project with a temp global home, and both trees are captured

    Scenario: E1 · the project tree and the home tree are captured apart
      Given scenario "s" has one step that writes "a.md" into the project and "x.json" into the home
      When the harness runs scenario "s"
      Then the captured project tree is exactly "a.md"
      And the captured home tree is exactly "x.json"

    Scenario: the step runs in the temp project, with the temp home as its global home
      Given scenario "s" has one step that prints its working directory and its AOF_GLOBAL_HOME
      When the harness runs scenario "s"
      Then the working directory it printed is the scenario's temp project
      And the AOF_GLOBAL_HOME it printed is the scenario's temp home
      And both sit under one temp root that is a direct child of the OS temp directory

    Scenario: E2 · dotfiles and nested folders are captured, with "/" in every path
      Given scenario "s" has one step that writes ".claude/settings.json", ".gitignore" and "wiki/work/.gitattributes"
      When the harness runs scenario "s"
      Then the captured project tree is exactly ".claude/settings.json", ".gitignore" and "wiki/work/.gitattributes"

    Scenario: starting files are in place before the first step and are part of the tree
      Given scenario "s" starts with "AGENTS.md" holding "# Mine"
      And its one step lists the project's files into its envelope
      When the harness runs scenario "s"
      Then the step's envelope lists "AGENTS.md"
      And the captured project tree holds "AGENTS.md" with "# Mine"

    Scenario: every step leaves a record of its argv, exit code and envelope, in order
      Given scenario "s" has two steps, each printing a JSON envelope naming itself
      When the harness runs scenario "s"
      Then the step records are two, in step order
      And each record holds its step's argv, exit code 0 and its parsed envelope

    Scenario: E4 · an empty home is captured as empty
      Given scenario "s" has one step that writes only into the project
      When the harness runs scenario "s"
      Then the captured home tree is empty

    Scenario: E3 · a step that exits other than declared fails the scenario by name
      Given scenario "s" has a first step that exits 3 and writes "oops" to stderr, where 0 is declared
      When the harness runs scenario "s"
      Then the scenario fails naming step 1 and its argv
      And the failure shows "oops"
      And no later step ran

    Scenario: a step may declare a non-zero exit, and then it passes
      Given scenario "s" has one step that exits 1, and declares exit 1
      When the harness runs scenario "s"
      Then the scenario does not fail on the exit code

    Scenario Outline: E5 · the temp root is removed whichever way the scenario ends
      Given scenario "s" whose step <ends>
      When the harness runs scenario "s"
      Then the scenario's temp root no longer exists
      And no file under the real global home was created or changed

      Examples:
        | example | ends                                  |
        | E5      | exits 0                               |
        | E5      | exits 3 where 0 is declared           |
        |         | writes a file that is not valid UTF-8 |
