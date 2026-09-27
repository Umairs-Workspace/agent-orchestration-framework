@executable @cli @work @work-stream
Feature: The one-hour cache window is held deliberately, not inherited from how the account is billed

  The 1-hour prompt-cache TTL is automatic on a subscription but **drops to 5 minutes on usage
  credits** unless the environment says otherwise. aof's phases are long: a build, then a review,
  then a fix. A window that silently halves itself depending on billing mode is a window held by
  accident, and its collapse looks exactly like a prefix that stopped being shared — the same
  symptom 70/02 is built to detect, from a completely different cause.

  So the spawn sets it, at the same seam and for the same reason as 68/01's OTel keys: **after the
  IDE-attachment scrub**, so the scrub can never delete it. That ordering is load-bearing and was
  learned the expensive way — a worker spawned from a VS Code terminal inherited
  `CLAUDE_CODE_SSE_PORT`, `TERM_PROGRAM=vscode` and `VSCODE_*`, silently attached itself to the
  operator's own editor, and left the PTY's stdin dead to typed input
  (`src/agent-session-driver.mjs`, measured live 2026-07-27). The scrub removes a fixed set of keys;
  anything set before it that shares a prefix is at its mercy.

  ADR-005. This changes what the launch *environment* carries; the argv is task 00's and task 01's.

  Scenario: the spawn environment holds the one-hour window
    Given a phase session about to be spawned
    When the launch environment is resolved
    Then it carries the setting that holds the one-hour prompt-cache window

  Scenario: the setting survives the IDE-attachment scrub
    Given a launch environment that is scrubbed of the IDE-attachment vector
    When the environment is resolved
    Then the cache-window setting is present after the scrub
    And it is applied after the scrub rather than before it

  Scenario: the scrub still removes everything it removed before
    Given an environment inherited from an editor-hosted shell
    When the launch environment is resolved
    Then the IDE-attachment keys are absent
    And the attribution keys added at spawn are present
    And the cache-window setting is present

  Scenario: the window does not depend on how the account is billed
    Given two spawns whose accounts are billed differently
    When each launch environment is resolved
    Then both carry the same cache-window setting
    And neither relies on a default that differs between them

  Scenario Outline: the launch environment's contract, after the scrub
    Given a resolved launch environment
    When <key> is looked for
    Then it is <presence>

    Examples: what the scrub removes, and what must outlive it
      | key                                  | presence |
      | the cache-window setting             | present  |
      | the OTel attribution keys            | present  |
      | the editor SSE port                  | absent   |
      | the editor terminal-program markers  | absent   |
      | the editor-prefixed variables        | absent   |
