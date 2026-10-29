@uat @docs @distribution @adapter
Feature: This laptop goes from clone to a supervised single-node mesh with only the documented commands

  WHY. This is the SPEC's proof that it was met. A fresh clone on this laptop reaches a working
  single-node mesh with the menu-bar icon healthy, quitting leaves no `aof` process, and logging
  back in brings it back. Only a person at a Mac with a GUI login can confirm it: autostart, the
  keychain and the menu bar cannot be checked headless (SPEC §Dependencies).

  Background:
    Given this laptop (x86_64) with a GUI login, a fresh clone of this repository, and only the macOS section of the deploy rules to follow

  Rule: R1 · This laptop reaches a supervised single-node mesh with only documented commands

    Scenario: E1 · the laptop reaches a running single-node mesh
      When the operator follows the macOS section from clone to "aof mesh desktop run"
      Then "aof mesh status --json" answers "isControlNode: true"
      And "http://127.0.0.1:4181/?mode=fleet" lists one node in a browser
      And the menu-bar icon shows healthy, with "mesh serve --serve" and "mesh ui" both running in the app's window
      And no command was typed that the section does not name

    Scenario: E2 · the installed launcher names its payload
      When "~/.aof/bin/aof --version" runs
      Then it answers "0.1.0 (payload <buildId>)", where buildId is the one in "~/.aof/bin/BUILD_ID.json"

  Rule: R2 · Quitting leaves no aof process behind

    Scenario: E3 · Quit from the menu reaps everything
      Given both daemons are up under the app
      When the operator chooses Quit from the menu-bar menu
      Then within 10 s "pgrep -fl 'aof mesh'" prints nothing

    Scenario: E4 · stop returns once the app has gone
      Given both daemons are up under the app
      When "aof mesh desktop stop" runs
      Then it returns
      And straight away "pgrep -x 'AOF Desktop'" and "pgrep -fl 'aof mesh'" print nothing

  Rule: R3 · Logging out and back in brings it back

    Scenario: E5 · the mesh returns at login with no terminal open
      Given autostart is registered and both daemons are up
      When the operator logs out, and logs back in without opening a terminal
      Then the menu-bar icon returns and shows healthy
      And a supervised run started from the board reaches its first turn without an auth failure

  Rule: R4 · The restart over SSH goes through launchd

    Scenario: E6 · a restart from SSH keeps the daemons in the login session
      Given autostart is registered and the operator is logged in at the laptop
      When "aof mesh desktop stop && aof mesh desktop run" is typed in an "ssh localhost" session as the same user
      Then the menu-bar icon returns on the laptop's own screen
      And the daemon-environment auth probe from the deploy rules prints "MESH_AUTH_OK"
