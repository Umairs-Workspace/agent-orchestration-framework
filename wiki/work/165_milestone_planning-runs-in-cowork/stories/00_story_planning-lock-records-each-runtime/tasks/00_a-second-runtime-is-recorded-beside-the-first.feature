@executable @cli @planning
Feature: A second runtime is recorded beside the first

  WHY. The lock's planning section holds one runtime today, so planning in one runtime and building
  in another cannot both be recorded. Each runtime now has its own entry. A new runtime is added
  next to what is there. A lock written before 165 still reads as the one runtime it recorded, and
  nothing outside the planning section moves.

  Background:
    Given a target repo
    And the marketplace commit sha is resolved from a fixture so no network is touched
    And the runtime install is simulated so no real plugin code executes

  Rule: R1 · Installing planning for a second runtime keeps the first

    Scenario: E1 · a codex install is added beside a recorded claude install
      Given the lock records a claude planning entry
      When I run "aof planning init --runtime codex"
      Then the command exits 0
      And the lock records a planning entry for "codex"
      And the lock's planning entry for "claude" is unchanged from before the run

    Scenario: E2 · a planning section written before 165 is carried over as its runtime's entry
      Given the lock holds a single-runtime planning section for "claude" in the pre-165 shape
      When I run "aof planning init --runtime codex"
      Then the command exits 0
      And the lock's planning entry for "claude" equals the pre-165 section exactly
      And the lock records a planning entry for "codex"

    Scenario Outline: the entry for the runtime just installed is the one the run reports
      Given the lock records a planning entry for "<present>"
      When I run "aof planning init --runtime <added>"
      Then the manifest field "runtime" equals "<added>"
      And the lock records planning entries for exactly "<recorded>"

      Examples:
        | present | added  | recorded     |
        | claude  | codex  | claude,codex |
        | codex   | claude | claude,codex |

  Rule: R3 · The rest of the lock is never disturbed

    Scenario: E7 · the asset and work sections survive a second runtime's install
      Given the lock carries "files", "packages" and "work" sections and a claude planning entry
      When I run "aof planning init --runtime codex"
      Then the lock's "files", "packages" and "work" sections are byte-for-byte what they were
      And no lock file other than ".aof/aof.lock.json" exists under ".aof/"
