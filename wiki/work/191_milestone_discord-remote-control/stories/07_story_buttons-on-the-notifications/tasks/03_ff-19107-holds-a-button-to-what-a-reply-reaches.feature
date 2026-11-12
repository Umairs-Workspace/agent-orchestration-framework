@executable @cli @work @work-stream
Feature: FF-19107 holds a button to what a reply reaches

  WHY. A button that could reach any verb, or trusted a project named in its id, would be a door
  around the allowlist. FF-19107 is a leg in the Discord family's own control file, beside FF-13113
  (ADR-007 Invariant).

  Scenario: the buttons module reaches three verbs and starts no process
    When `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` runs
    Then it fails if `packages/messaging/src/discord-buttons.mjs` invokes any verb but `work:answer`, `work:loop` and `mesh:session-start`
    And it fails if that module imports `child_process`

  Scenario: custom_id has one spelling
    When the FF-19107 leg sweeps `packages/messaging/src/`
    Then it fails if any module other than `discord-buttons.mjs` spells the literal prefix "aof:answer:", "aof:resume" or "aof:session"

  Scenario: nothing dispatched is read from the id
    When the FF-19107 fixture taps a button whose custom_id carries extra segments naming another project
    Then the dispatched workspace is the index record's, never the id's

  Scenario: the test/discord budget row names the new suite
    When `test/arch/testing/acd-source-directory-budget.test.mjs` runs
    Then the `test/discord` row's reason names `discord-buttons` among its members
