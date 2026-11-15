@executable @cli @work @work-stream
Feature: FF-19101 holds one handler for both roles

  WHY. The control's session must stay the worker's session (ADR-001 Invariant). A second handler
  written for the control would drift from the worker's one fix at a time. FF-19101 founds
  `test/arch/session/acd-launched-session-from-discord.test.mjs`, which 01 and 02 extend.

  Scenario: the control branch builds its handler from the worker's factory
    When `test/arch/session/acd-launched-session-from-discord.test.mjs` runs
    Then it fails unless `packages/mesh/src/launcher.mjs` calls `createMeshWorkerSessionSpawnHandler` in both its control and its worker branch
    And it fails if any module under `packages/mesh/src/` other than `session-spawn-handler.mjs` spawns a PTY for a `session-spawn` frame

  Scenario: the router's two destinations are exclusive
    When the FF-19101 fixture routes one frame per lane for the local node and one for a remote node
    Then each frame reaches exactly one of the local handler and `dispatchDirective`

  Scenario: the directory budget moves once, with its reason
    When `test/arch/testing/acd-source-directory-budget.test.mjs` runs
    Then the `test/arch/session` row's ceiling is 40
    And its reason names FF-19101, FF-19102 and FF-19103 as the one file's three controls
