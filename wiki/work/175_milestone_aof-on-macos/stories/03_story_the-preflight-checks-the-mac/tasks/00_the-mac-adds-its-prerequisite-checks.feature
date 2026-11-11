@executable @cli @distribution @adapter
Feature: On macOS the preflight adds its prerequisite checks

  WHY. The SPEC asks the preflight to state what a Mac needs: the command-line tools and Rust to
  build the app, and no quarantine on a locally built one (ADR-004 §4). The preflight reports;
  it never repairs, and Windows' answer does not change.

  Background:
    Given injected seams that answer every existing check well, and a fake runner for the darwin probes

  Rule: R1 · On macOS the preflight adds four checks after the existing four

    Scenario: E1 · darwin reports eight checks in a fixed order
      Given the runner answers "xcode-select -p" with exit 0, "cargo --version" with exit 0, and "xattr -p com.apple.quarantine" with exit 1
      And the LaunchAgent's claude answers loggedIn true
      When the preflight runs with platform "darwin"
      Then its codes are, in order, "claude-authenticated", "payload-build", "workspace-identity-pinned", "heartbeat-hook-installed", "macos-command-line-tools", "rust-toolchain", "app-not-quarantined", "daemon-claude-authenticated"
      And each of the last four is "pass"

    Scenario: E2 · Windows reports the existing four and runs no darwin probe
      When the preflight runs with platform "win32"
      Then its codes are exactly "claude-authenticated", "payload-build", "workspace-identity-pinned", "heartbeat-hook-installed"
      And the runner was asked for no "xcode-select", "cargo" or "xattr"

  Rule: R2 · A build-only prerequisite says it matters only for building

    Scenario Outline: a missing build tool fails with the step that installs it
      Given the runner answers "<probe>" with <answer>
      When the preflight runs with platform "darwin"
      Then "<code>" is "fail"
      And its message says it is needed only to build the desktop app
      And its message names "<remedy>"

      Examples:
        | example | probe          | answer               | code                     | remedy                 |
        | E3      | cargo --version | a spawn fault (-1)   | rust-toolchain           | rustup                 |
        | E4      | xcode-select -p | exit 2               | macos-command-line-tools | xcode-select --install |
        |         | cargo --version | exit 101             | rust-toolchain           | rustup                 |

  Rule: R3 · A quarantined app is named, with the command that clears it

    Scenario: E5 · a quarantine attribute fails the check and names its removal
      Given the runner answers "xattr -p com.apple.quarantine <installDir>/aof-mesh-desktop.app" with stdout "0083;6720d2a1;Safari;" and exit 0
      When the preflight runs with platform "darwin"
      Then "app-not-quarantined" is "fail"
      And its message names "xattr -dr com.apple.quarantine <installDir>/aof-mesh-desktop.app"

    Scenario: E6 · no quarantine attribute passes
      Given the runner answers "xattr -p com.apple.quarantine <installDir>/aof-mesh-desktop.app" with exit 1
      When the preflight runs with platform "darwin"
      Then "app-not-quarantined" is "pass"

    Scenario: a probe that throws is reported by its code and does not end the preflight
      Given the runner throws on "xattr"
      When the preflight runs with platform "darwin"
      Then "app-not-quarantined" is "fail"
      And "daemon-claude-authenticated" is still reported after it

  Scenario: the render shows each check's status word
    Given a preflight answer holding one "pass", one "skip" and one "fail"
    When it is rendered
    Then the lines begin "ok", "--" and "FAIL" respectively
