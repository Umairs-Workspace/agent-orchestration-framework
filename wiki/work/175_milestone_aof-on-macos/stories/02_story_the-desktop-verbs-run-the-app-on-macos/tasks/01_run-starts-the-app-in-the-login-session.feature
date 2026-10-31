@executable @cli @distribution @adapter
Feature: run starts the app in the login session

  WHY. A daemon started outside the Aqua session has no keychain, so its `claude` is signed out
  and its runs die (RESEARCH P4). launchd starts a registered LaunchAgent inside that session
  even when asked from SSH; a direct spawn from SSH does not (ADR-003 §2).

  Background:
    Given an isolated install dir holding an installed fixture bundle, uid 501, and an injected home
    And a fake runner that models the launchd job "com.aof.mesh.desktop" in "gui/501"

  Rule: R2 · run starts the app in the login session

    Scenario: E4 · a loaded LaunchAgent is kickstarted, and nothing is spawned
      Given the job is loaded
      When "aof mesh desktop run --json" runs with platform "darwin"
      Then the runner was asked for "launchctl kickstart gui/501/com.aof.mesh.desktop"
      And spawnFn was never called
      And the answer names the launch as "launchd"

    Scenario: E5 · a plist on disk that is not loaded is bootstrapped
      Given "<home>/Library/LaunchAgents/com.aof.mesh.desktop.plist" exists and the job is not loaded
      When "aof mesh desktop run --json" runs with platform "darwin"
      Then the runner was asked for "launchctl bootstrap gui/501 <home>/Library/LaunchAgents/com.aof.mesh.desktop.plist"
      And spawnFn was never called

    Scenario: E6 · with no LaunchAgent, a GUI terminal spawns the bundle's executable detached
      Given no plist exists and the environment has no "SSH_CONNECTION"
      When "aof mesh desktop run --json" runs with platform "darwin"
      Then spawnFn was called once with "<installDir>/aof-mesh-desktop.app/Contents/MacOS/AOF Desktop", detached, stdio ignored
      And the runner was asked for no "launchctl kickstart" or "launchctl bootstrap"

    Scenario: E7 · with no LaunchAgent, SSH is refused and nothing starts
      Given no plist exists and the environment has "SSH_CONNECTION" set to "10.0.0.5 51022 10.0.0.9 22"
      When "aof mesh desktop run --json" runs with platform "darwin"
      Then it answers ok false with code "desktop-run-needs-gui-session"
      And the message names "aof mesh desktop install --autostart"
      And spawnFn was never called

    Scenario: an uninstalled app is refused before launchd is asked anything
      Given the install dir holds no bundle and the job is loaded
      When "aof mesh desktop run --json" runs with platform "darwin"
      Then it answers ok false with code "desktop-not-installed"
      And the runner was asked for no "launchctl" command at all

    Scenario: Windows still spawns the exe directly
      Given an installed fixture "aof-mesh-desktop.exe"
      When "aof mesh desktop run --json" runs with platform "win32"
      Then spawnFn was called once with "<installDir>/aof-mesh-desktop.exe"
      And the runner was asked for no "launchctl" command
