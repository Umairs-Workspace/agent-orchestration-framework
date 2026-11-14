@executable @bug @finding-F-05 @cli @work @work-stream
Feature: a Claude launch keeps one record under Claude's own label

  WHY. Claude's own hooks key a session `claude-code`, and the launcher keyed a Remote Control
  launch `claude`. Verify measured two records and two presence entries for one id, and for up to
  30 s after each hook ping the fleet read the pane as not relaying (F-05). A Claude launch now
  registers under the hook's label, which has one home, `CLAUDE_HOOK_ASSISTANT` in
  `session-spawn-directive.mjs` (ADR-002 amendment 2026-11-14 §4).

  Background:
    Given a launched session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" with launch "claude-remote-control" for workspace "ws-a" on "wsl-2"

  Scenario: the launch and the hook upsert one record
    When Claude's SessionStart hook pings with session id "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" from that session's cwd
    And its prompt hook pings with the same id
    Then exactly one session record exists on disk for that id, keyed `(wsl-2, ws-a, claude-code, 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10)`
    And exactly one presence entry exists for that id

  Scenario: a hook ping never demotes the launched pane
    Given the launched record reads `relaying: true`
    When the hook pings with `relaying: false` for that id
    Then the record still reads `relaying: true`

  Scenario: the session is still found by id and by name
    When `aof mesh session list` is run
    Then it lists the session once, under its name "ws-a-0b9e6c1e"
    And `aof mesh session end ws-a-0b9e6c1e` ends that one record

  Rule: the other launches keep their labels

    Scenario Outline: a launch's record label
      Given a <launch> for workspace "ws-a" on "wsl-2"
      When it registers its session
      Then its record's assistant label is "<label>"

      Examples:
        | launch                                    | label       |
        | bare-shell launch from the fleet          | claude      |
        | loop drive child's session stream         | claude-code |
