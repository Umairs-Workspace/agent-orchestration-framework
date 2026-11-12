@executable @cli @work @work-stream
Feature: the supervisor is handed a fresh supervised start

  WHY. The desktop app spawns whatever argv a declaration row carries. A start row is that same row
  shape, with an argv that starts a supervised loop and never resumes one (ADR-005 §3, FF-19105).

  Scenario: a start request with a level carries it
    Given a start request for scope "191" with level "L3"
    When `supervisedDeclarations` runs
    Then the row's argv is the route followed by "191", "--level", "L3" and "--supervised"

  Scenario: a scope already running yields no start row
    Given a start request for scope "191" and a live run on scope "191"
    When `supervisedDeclarations` runs
    Then no row with id "start:ws-a:191" is answered

  Scenario: start rows are gated by the compute budget like every row
    Given the compute budget allows no further loop
    And a start request for scope "191"
    When `supervisedDeclarations` runs
    Then no start row is answered

  Scenario: a resume row is unchanged
    Given a halted supervised declaration with a resume request
    When `supervisedDeclarations` runs
    Then its row's argv still ends with "--resume"

  Scenario: FF-19105 · the request has one home and a start never resumes
    When `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` runs
    Then it fails if the segment "loop-starts" is spelled anywhere under `packages/` but `packages/work-loop/src/stop-request.mjs`
    And it fails if a start row's argv carries "--resume" or lacks "--supervised"

  Rule: R1 · A start is a request the supervisor honours, never a process started here

    Scenario: E2 · the next poll lists a fresh supervised start
      Given a start request for scope "191" in workspace "ws-a" at project root "/p/aof"
      When `supervisedDeclarations` runs
      Then it answers a row with id "start:ws-a:191", label "loop 191", cwd "/p/aof" and scope "191"
      And the row's argv is the `work:loop` route followed by "191" and "--supervised", with no "--resume"
