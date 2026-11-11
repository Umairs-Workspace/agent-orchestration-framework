@manual @cli @distribution @adapter
Feature: The preflight on a real Mac

  WHY. Tasks 00 and 01 drive the checks over fakes. On a real Mac the daemon-environment check
  must agree with what a supervised run actually sees, which is the point of probing the daemons'
  environment rather than the terminal's (ADR-004 §4).

  Rule: R4 · The daemons' claude is probed with the daemons' PATH, not the terminal's

    Scenario: the check agrees with what a supervised run sees
      Given the app installed with "--autostart" from a shell whose PATH holds a signed-in claude
      When "aof mesh desktop run" reports the preflight
      Then "daemon-claude-authenticated" reads "ok"
      And the deploy rules' auth probe, run with the plist's PATH and launchd's HOME, USER and LOGNAME only, prints "MESH_AUTH_OK"

    Scenario: a stale LaunchAgent PATH is caught before a run burns
      Given the LaunchAgent was registered from a shell whose PATH has no claude
      When "aof mesh desktop run" reports the preflight
      Then "daemon-claude-authenticated" reads "FAIL", while "claude-authenticated" reads "ok"
