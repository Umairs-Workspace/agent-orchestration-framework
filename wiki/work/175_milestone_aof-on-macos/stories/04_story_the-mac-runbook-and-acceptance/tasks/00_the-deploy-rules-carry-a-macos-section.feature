@manual @docs @distribution @adapter
Feature: The deploy rules carry a macOS section

  WHY. The deploy rules are the one place an operator or an agent looks up how to set up, deploy,
  restart and verify a node. This laptop is a standalone single-node mesh (ADR-005), supervised
  like the Windows control node (ADR-002 §6, ADR-003 §2), and its section assumes no other machine.

  Rule: R1 · This laptop reaches a supervised single-node mesh with only documented commands

    Scenario: the macOS section names every step from clone to a running mesh
      When ".claude/rules/build-deploy-restart.md" is read
      Then a macOS section names, in order: the Xcode command-line tools, rustup, "node scripts/install-local.mjs --desktop", the control-node nomination in "~/.aof/aof.config.json", and "aof mesh desktop install --app-artifact <bundle> --autostart"
      And the nomination step reads the node id from "aof mesh relay --json"
      And it names the deploy loop as "node scripts/install-local.mjs --skip-ui", with "--desktop" only when "apps/desktop/" changed
      And it says the npm-linked CLI needs no install, and the daemons do

    Scenario: the section says how to verify at the source
      When the macOS section is read
      Then it names "~/.aof/bin/aof --version" answering "payload <buildId>"
      And it names "aof mesh status --json" answering "isControlNode: true"
      And it names a daemon-environment auth probe that runs claude with the LaunchAgent's PATH and HOME only

  Rule: R4 · The restart over SSH goes through launchd

    Scenario: the restart is the one legal over SSH
      When the macOS section is read
      Then the restart is "aof mesh desktop stop && aof mesh desktop run", stated as the one restart that is legal over SSH, and only with the LaunchAgent registered
      And starting a daemon by hand over SSH is still forbidden, with the reason (no login session, so no keychain)

  Scenario: the gaps are written where an operator will meet them
    When the macOS section and "wiki/work/ROADMAP.md" are read
    Then the macOS section gives the recovery after a supervisor crash (find the orphaned daemons with "pgrep -fl", end them with SIGTERM, then run)
    And it says to re-run "aof mesh desktop install --autostart" after a Node version change
    And "ROADMAP.md" lists macOS crash containment as deferred, citing 175/ADR-001

  Scenario: the desktop README names the macOS prerequisites
    When "apps/desktop/README.md" is read
    Then its prerequisites name the Xcode command-line tools and Rust for macOS, beside MSVC and WebView2 for Windows
    And its install row names "aof-mesh-desktop.app" on macOS and "aof-mesh-desktop.exe" on Windows
