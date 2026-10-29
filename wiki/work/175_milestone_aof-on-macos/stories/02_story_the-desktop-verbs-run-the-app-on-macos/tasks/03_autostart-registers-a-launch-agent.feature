@executable @cli @distribution @adapter
Feature: --autostart registers a LaunchAgent on macOS

  WHY. Login autostart on macOS is a per-user LaunchAgent in the Aqua session, carrying the
  installing shell's PATH so `claude` resolves in the daemons (ADR-004 §1-§3). It is the
  existing flag's darwin branch (m126/ADR-007), idempotent in both directions.

  Background:
    Given an isolated install dir, an injected home, a fixture bundle, and a fake runner that records every command

  Rule: R4 · --autostart registers a LaunchAgent on macOS

    Scenario: E11 · the plist carries the installing shell's PATH and starts at login only
      Given the environment PATH is "/Users/u/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin"
      When "aof mesh desktop install --app-artifact <fixture bundle> --autostart --json" runs with platform "darwin"
      Then "<home>/Library/LaunchAgents/com.aof.mesh.desktop.plist" holds:
        | key                       | value                                                             |
        | Label                     | com.aof.mesh.desktop                                              |
        | ProgramArguments          | <installDir>/aof-mesh-desktop.app/Contents/MacOS/AOF Desktop |
        | RunAtLoad                 | true                                                              |
        | LimitLoadToSessionType    | Aqua                                                              |
        | ProcessType               | Interactive                                                       |
        | KeepAlive                 | false                                                             |
        | EnvironmentVariables.PATH | /Users/u/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin            |
      And the runner was asked for no "launchctl" command
      And the answer's autostart names the plist path

    Scenario: E12 · removing an absent LaunchAgent is a success
      Given no plist exists
      When "aof mesh desktop install --app-artifact <fixture bundle> --no-autostart --json" runs with platform "darwin"
      Then the answer's autostart has alreadyAbsent true

    Scenario: E13 · linux is refused by name before anything is placed
      When "aof mesh desktop install --app-artifact <fixture bundle> --autostart --json" runs with platform "linux"
      Then it answers ok false with code "autostart-unsupported-platform"
      And the message names "`linux`"
      And the install dir is unchanged

    Scenario Outline: each prior state ends where the flag says
      Given the plist is "<before>"
      When install runs with "<flag>" on platform "darwin"
      Then the plist is "<after>"
      And the answer's autostart changed is <changed>

      Examples:
        | before                   | flag            | after                          | changed |
        | absent                   | --autostart     | present with the current PATH  | true    |
        | present with an old PATH | --autostart     | present with the current PATH  | true    |
        | present                  | --no-autostart  | absent                         | true    |
        | absent                   | --no-autostart  | absent                         | false   |

    Scenario: --dry-run names the plist it would write and writes nothing
      When "aof mesh desktop install --app-artifact <fixture bundle> --autostart --dry-run --json" runs with platform "darwin"
      Then the answer's autostart has dryRun true and names the plist path
      And no plist exists

    Scenario: the rendered plist reads back the PATH it was given
      Given the rendered plist for the fixture bundle and PATH "/Users/u/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin"
      When it is read back by the module's PATH reader
      Then the PATH reads "/Users/u/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin"
