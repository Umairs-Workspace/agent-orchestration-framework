@executable @cli @assets @distribution
Feature: A file the user edited survives clean

  WHY. A user edits files after apply. An edit to a file aof wholly owns makes it the user's, and
  clean must keep it. A line the user adds beside aof's block is the user's too, and only aof's
  block goes. A step that edits a file, as a user would, between two real verbs is what makes this
  holdable as a baseline (ADR-001 §5, ADR-004 §3).

  Background:
    Given the "assets-clean" lane is registered with the harness

  Rule: R3 · A file the user edited survives clean

    Scenario: a step can run a fixture script in place of the CLI, and its record names the script
      Given a lane whose scenario has a step carrying the command "test/golden/fixtures/user-edit.mjs" and the argv "notes.md", "--append", "two\n"
      And the scenario starts with "notes.md" holding "one\n"
      When the harness runs the scenario
      Then "notes.md" holds exactly "one\ntwo\n"
      And the step record names the script "test/golden/fixtures/user-edit.mjs"

    Scenario Outline: the edit script prepends or appends, and refuses a missing file
      Given the project holds "notes.md" as "one\n"
      When "user-edit.mjs" runs with the argv <argv>
      Then it exits <exit>
      And <outcome>

      Examples:
        | argv                                  | exit | outcome                                      |
        | "notes.md", "--append", "two\n"       | 0    | "notes.md" holds exactly "one\ntwo\n"        |
        | "notes.md", "--prepend", "zero\n"     | 0    | "notes.md" holds exactly "zero\none\n"       |
        | "absent.md", "--append", "x\n"        | 1    | its stderr names "absent.md", and no file is created |

    Scenario: the drifted scenario renders to its baseline
      Given scenario "drifted" names base "plain" and starts with the files of "EVERY_KIND"
      And its steps are "assets apply --json", a user edit appending "Mine: a note.\n" to ".claude/agents/my-agent.md", a user edit prepending "# Mine\n" to "CLAUDE.md", and "assets clean --json"
      When the harness compares scenario "drifted" in lane "assets-clean"
      Then it passes

    Scenario: E7 · an edited file aof wholly owned is kept and warned about
      When scenario "drifted" runs
      Then ".claude/agents/my-agent.md" still ends with "Mine: a note.\n"
      And the clean step reports it as "drift-warning"
      And ".aof/aof.lock.json" still holds its entry

    Scenario: E8 · a user's line beside aof's block is kept, and only the block goes
      When scenario "drifted" runs
      Then "CLAUDE.md" holds exactly "# Mine\n"
      And the clean step reports it as "retract"

    Scenario: E9 · an edit inside aof's block is drift, and the file is untouched
      Given an applied project whose "AGENTS.md" has one line inside aof's managed block changed
      When clean plans and executes
      Then "AGENTS.md" is byte for byte what it was before clean
      And clean reports it as "drift-warning"
      And the lock still holds its entry
