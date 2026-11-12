@executable @cli @work @work-stream
Feature: one session, one record, ended with Claude

  WHY. Handing `claude` the control-minted id means its own hooks register the same key the launcher
  already wrote, so the grid shows one slot instead of 50/ADR-007's two (ADR-002 §4). With `exec`, a
  Claude that ends leaves no bare shell behind (§2).

  Scenario: Claude's hook ping lands on the launcher's record
    Given a launched session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" registered as `(wsl-2, ws-a, claude, 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10)`
    When the session hook path pings with session id "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" from that session's cwd
    Then the session index holds exactly one record for workspace "ws-a" on "wsl-2"

  Rule: R2 · When Claude ends, the session ends

    Scenario: E4 · Claude exiting ends the PTY and the session record
      Given a launched Claude session is open
      When its PTY exits with code 0, as it does when `/exit` ends the `exec`'d claude
      Then `endSession` is called once for its key, its ping interval is cleared and a terminal end is sent
