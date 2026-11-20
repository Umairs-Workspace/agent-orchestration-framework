@executable @cli @assets @scaffold
Feature: Every runtime renders to its baseline

  WHY. What `aof work init` writes for Claude Code, Codex and opencode is the product. Today a
  hash says that something changed. Held to a committed tree, a change shows as the lines it
  moved, in the runtimes it reached. `default` renders all three runtimes and is held whole.
  Each runtime alone is held as what it lacks against `default`, measured to be exactly the other
  runtimes' files (ADR-003, ADR-005).

  Background:
    Given the "work-init" lane is registered with the harness
    And its baselines are committed under "test/golden/baselines/work-init/"

  Rule: R1 · Each runtime's init renders to its baseline, and writes nothing to the global home

    Scenario: E1 · default, on three runtimes, is held whole
      When the harness compares scenario "default" in lane "work-init"
      Then it passes
      And scenario "default" names no base
      And its one step was "work init --runtime claude,codex,opencode --json", exiting 0
      And its committed project tree holds every file the step wrote, 238 when this was written

    Scenario Outline: each runtime alone is held as a delta over default
      When the harness compares scenario "<scenario>" in lane "work-init"
      Then it passes
      And scenario "<scenario>" names base "default"
      And its one step was "work init --runtime <scenario> --json", exiting 0
      And its "removed.golden" lists only paths under <absent>

      Examples:
        | example | scenario | absent                                  |
        | E2      | claude   | ".agents/", ".codex/" and ".opencode/"  |
        | E3      | codex    | ".claude/" and ".opencode/"             |
        | E3      | opencode | ".agents/", ".claude/" and ".codex/"    |

    Scenario: the global home stays empty in every scenario of the lane
      When the harness compares every scenario in lane "work-init"
      Then every scenario's captured home tree is empty
      And no baseline in the lane stores a file under "home/"

    Scenario: E4 · every step's envelope is held
      When the harness compares scenario "default" in lane "work-init"
      Then its "steps.golden" holds the init envelope's summary, runtimes and actions
      And every path in it is relative to "<project>"

    Scenario: the lane's baselines are inert and pinned
      When the files under "test/golden/baselines/work-init/" are listed
      Then every one ends in ".golden"
      And "git check-attr eol" reports "lf" for each runtime tree's first file
