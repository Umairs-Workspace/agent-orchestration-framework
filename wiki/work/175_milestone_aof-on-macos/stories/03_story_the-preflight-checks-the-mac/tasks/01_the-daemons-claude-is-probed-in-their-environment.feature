@executable @cli @distribution @adapter
Feature: The daemons' claude is probed in the daemons' own environment

  WHY. launchd gives the app the plist's PATH, not the terminal's (RESEARCH P1), and `claude` is
  spawned by name. A check run with the terminal's PATH would pass while every supervised run
  dies on "claude not found", which is the WSL lesson: probe the daemon's environment (ADR-004 §4).

  Background:
    Given an injected home, and a fake runner that records the env each command was given

  Rule: R4 · The daemons' claude is probed with the daemons' PATH, not the terminal's

    Scenario: E7 · a LaunchAgent PATH with no claude fails, though the terminal's claude is signed in
      Given the LaunchAgent plist's PATH is "/usr/bin:/bin"
      And the runner answers "claude auth status" with exit -1 when PATH is "/usr/bin:/bin", and with loggedIn true otherwise
      When the preflight runs with platform "darwin"
      Then "claude-authenticated" is "pass"
      And "daemon-claude-authenticated" is "fail"
      And its message says claude is not on the LaunchAgent's PATH

    Scenario: E8 · a LaunchAgent PATH that holds a signed-in claude passes
      Given the LaunchAgent plist's PATH is "/Users/u/.local/bin:/usr/bin:/bin"
      And the runner answers "claude auth status" with '{"loggedIn": true, "authMethod": "claude.ai"}' and exit 0
      When the preflight runs with platform "darwin"
      Then "daemon-claude-authenticated" is "pass"
      And its message names "claude.ai"
      And the runner ran "claude auth status" with an env of exactly PATH "/Users/u/.local/bin:/usr/bin:/bin" and HOME "<home>"

    Scenario: E9 · no LaunchAgent means there is nothing to probe
      Given no LaunchAgent plist exists under the injected home
      When the preflight runs with platform "darwin"
      Then "daemon-claude-authenticated" is "skip"
      And its message names "aof mesh desktop install --autostart"
      And the runner was never asked for "claude auth status" with a LaunchAgent env

    Scenario Outline: what the daemons' claude answers decides the check
      Given the LaunchAgent plist's PATH is "/Users/u/.local/bin:/usr/bin:/bin"
      And the runner answers "claude auth status" with stdout '<stdout>' and exit <exit>
      When the preflight runs with platform "darwin"
      Then "daemon-claude-authenticated" is "<status>"

      Examples:
        | stdout                                       | exit | status |
        | {"loggedIn": false}                          | 0    | fail   |
        | not json                                     | 0    | fail   |
        | {"loggedIn": true, "authMethod": "claude.ai"} | 1    | fail   |

    Scenario: the check writes nothing
      Given the LaunchAgent plist exists
      When the preflight runs with platform "darwin"
      Then the plist is byte-identical afterwards
