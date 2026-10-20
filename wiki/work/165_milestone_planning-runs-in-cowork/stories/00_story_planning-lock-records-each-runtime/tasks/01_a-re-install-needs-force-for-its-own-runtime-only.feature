@executable @cli @planning
Feature: A re-install needs --force, for its own runtime only

  WHY. The re-run guard refuses whenever any planning section exists, and --force replaces the
  whole section. That would block a second runtime and wipe the first. The guard now checks the
  runtime being installed, and --force re-pins that runtime alone.

  Background:
    Given a target repo
    And the marketplace commit sha is resolved from a fixture so no network is touched
    And the runtime install is simulated so no real plugin code executes

  Rule: R2 · Re-installing a runtime that is already recorded needs --force, and --force touches only that runtime

    Scenario: E3 · re-installing a recorded runtime without --force is refused and names it
      Given the lock records planning entries for "claude" and "codex"
      When I run "aof planning init"
      Then the command exits non-zero
      And the output names the runtime "claude"
      And the output points the user to "--force"
      And the lock file is byte-for-byte what it was

    Scenario: E4 · --force re-pins only the runtime it names
      Given the lock records planning entries for "claude" and "codex"
      When I run "aof planning init --force"
      Then the command exits 0
      And the lock's planning entry for "claude" has a new "generatedAt"
      And the lock's planning entry for "codex" is unchanged from before the run

    Scenario: E5 · a pre-165 planning section still guards its runtime
      Given the lock holds a single-runtime planning section for "claude" in the pre-165 shape
      When I run "aof planning init"
      Then the command exits non-zero
      And the output points the user to "--force"
      And the lock file is byte-for-byte what it was

    Scenario: E6 · a dry-run previews without touching the lock
      Given the lock records a claude planning entry
      When I run "aof planning init --runtime codex --dry-run"
      Then the command exits 0
      And the output reports the runtime commands it would run
      And the lock file is byte-for-byte what it was

    Scenario Outline: the guard decides by the runtime named, not by the section existing
      Given the lock records planning entries for "<recorded>"
      When I run "aof planning init --runtime <runtime><flag>"
      Then the outcome is "<outcome>"

      Examples:
        | recorded     | runtime | flag    | outcome                       |
        | claude       | claude  |         | refused, lock unchanged       |
        | claude       | codex   |         | codex added                   |
        | claude,codex | codex   |         | refused, lock unchanged       |
        | claude,codex | codex   | --force | codex re-pinned, claude kept  |
