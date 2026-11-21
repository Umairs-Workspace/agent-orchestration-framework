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
      And its "removed.golden" lists only paths under <absent>, and of aof's own records <records>

      # Amended at verify, 2026-11-21: the map did not count aof's own `.aof/` records. The apply
      # journal belongs to the Codex hooks merge, and the loop records are bundle members declared
      # `runtimes: ["claude", "codex"]`, so a runtime without them lists them as removed.
      Examples:
        | example | scenario | absent                                  | records                                                          |
        | E2      | claude   | ".agents/", ".codex/" and ".opencode/"  | only ".aof/aof.apply-journal.json"                               |
        | E3      | codex    | ".claude/" and ".opencode/"             | none                                                             |
        | E3      | opencode | ".agents/", ".claude/" and ".codex/"    | only ".aof/aof.apply-journal.json" and the files of ".aof/loops/" |

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
