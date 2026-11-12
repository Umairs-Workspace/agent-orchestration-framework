@executable @cli @work @work-stream
Feature: a start request is written, or refused by name

  WHY. A scope that has never run has no declaration, so the supervisor cannot start it. The verb
  writes a durable request instead, and starts nothing itself (ADR-005 §1–§2).

  Scenario: the request holds exactly five keys
    Given workspace "ws-a" with no run on scope "191"
    When `aof work loop 191 --hand-off-start --json` runs
    Then the request at the answered path holds exactly `scope`, `workspaceId`, `by`, `requestedAt` and `level`

  Scenario: a scope the grammar refuses is refused before any read
    When `aof work loop "../x" --hand-off-start --json` runs
    Then it answers ok false with code "loop-start-scope"

  Scenario Outline: the flag refuses its incompatible companions
    When `aof work loop 191 --hand-off-start <other>` runs
    Then it is refused naming both flags

    Examples:
      | other      |
      | --stop     |
      | --resume   |
      | --hand-off |
      | --dry-run  |

  Rule: R1 · A start is a request the supervisor honours, never a process started here

    Scenario: E1 · a scope that never ran gets a start request and nothing is spawned
      Given workspace "ws-a" with no run on scope "191"
      When `aof work loop 191 --hand-off-start --json` runs
      Then it answers ok with `requested: true` and a path under `<meshRoot>/loop-starts/`
      And no process is spawned

  Rule: R2 · A start never resumes, and never runs twice

    Scenario: E3 · a halted supervised scope is refused toward resume
      Given scope "131" with a halted supervised declaration
      When `aof work loop 131 --hand-off-start --json` runs
      Then it answers ok false with code "loop-start-resumable"
      And its message names `/loop resume 131` and `aof work loop 131 --hand-off`
      And no start request is written

    Scenario: E4 · a running scope is refused
      Given scope "191" whose latest loop run is running
      When `aof work loop 191 --hand-off-start --json` runs
      Then it answers ok false with code "loop-start-running"
      And no start request is written

    Scenario: E5 · two requests a second apart leave one request
      Given a start request for scope "191" written at 10:00:00
      When a second `--hand-off-start` for "191" runs at 10:00:01
      Then exactly one start request for "191" exists, and its `requestedAt` is 10:00:01
