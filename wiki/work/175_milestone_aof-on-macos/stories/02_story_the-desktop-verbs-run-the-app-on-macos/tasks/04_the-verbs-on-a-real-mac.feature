@manual @cli @distribution @adapter
Feature: The verbs on a real Mac

  WHY. Tasks 00-03 drive the verbs over fakes. Only a Mac with a GUI login shows that launchd
  accepts the plist, and that a `launchctl` asked from SSH starts the job inside the Aqua session
  (RESEARCH Q2, ADR-003 §2, ADR-004 §1). This task records Q2's answer in the story's Notes.

  Background:
    Given a Mac with a GUI login, and the app installed with "aof mesh desktop install --app-artifact <bundle> --autostart"

  Rule: R4 · --autostart registers a LaunchAgent on macOS

    Scenario: the real LaunchAgent parses, and loads at login
      When "plutil -lint ~/Library/LaunchAgents/com.aof.mesh.desktop.plist" runs
      Then it reports OK
      And after logging out and back in, "launchctl print gui/$(id -u)/com.aof.mesh.desktop" shows the job loaded

  Rule: R2 · run starts the app in the login session

    Scenario: from SSH, run brings the app up inside the login session
      Given the app is not running
      When "aof mesh desktop run" is typed in an "ssh localhost" session as the same user
      Then "launchctl print gui/$(id -u)/com.aof.mesh.desktop" shows it running
      And the menu-bar icon appears on the Mac's own screen

  Rule: R3 · stop asks the app to quit, waits for it, and never force-kills it

    Scenario: stop then run is a restart
      Given the app is running with both daemons up
      When "aof mesh desktop stop && aof mesh desktop run" runs
      Then the menu-bar icon returns, and both daemons print a new "Build: payload <buildId>" line
