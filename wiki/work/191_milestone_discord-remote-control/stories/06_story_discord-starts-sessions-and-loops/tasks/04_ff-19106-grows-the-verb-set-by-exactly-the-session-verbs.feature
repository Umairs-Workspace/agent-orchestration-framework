@executable @cli @work @work-stream
Feature: FF-19106 grows the verb set by exactly the session verbs

  WHY. FF-13113 held the commands to two verbs. This story widens that on purpose, to the six ADR-006
  §5 names. The `child_process` leg stays unchanged, because starting a session is a directive, never
  a process the bot owns.

  Scenario: the allowed set is exactly six verbs
    When `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` runs
    Then `ALLOWED_VERBS` is exactly "work:list", "work:loop", "mesh:session-start", "mesh:session-list", "mesh:session-end" and "mesh:status"
    And it fails if `discord-commands.mjs` invokes any other verb

  Scenario: every allowed verb is invoked by some command
    When the FF-19106 leg reads `discord-commands.mjs`
    Then each of the six verbs appears in at least one `invoke(` call

  Scenario: the family still starts no process
    When the FF-13113 structural leg runs
    Then no module under `packages/messaging/src/` imports `child_process`

  Scenario: every command still defers first
    When the FF-13113 fixture runs each command in the table, the new ones included
    Then each sends its type-5 callback before its first `invoke`
