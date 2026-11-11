@manual @cli @distribution @adapter
Feature: The bundle and the payload on a real Mac

  WHY. Tasks 00 and 01 assert the plan and the files on any host. Only a Mac with Rust can show
  that the signed bundle verifies, runs with no Dock tile, and leaves the npm-linked `aof` first
  on PATH (ADR-002 §1, §6).

  Background:
    Given this MacBook (x86_64) with Rust installed

  Rule: R3 · The install leaves the shell alone and names its payload

    Scenario: E6 · the launcher reports the payload it loads, and the link stays first
      Given "node scripts/install-local.mjs --skip-ui" has run
      When "~/.aof/bin/aof --version" runs
      Then it answers "0.1.0 (payload <buildId>)", the buildId in "~/.aof/bin/BUILD_ID.json"
      And "which aof" still answers the npm-linked path under "~/.nvm"

  Rule: R4 · The app sits in the menu bar only

    Scenario: the placed bundle verifies and runs without a Dock tile
      When "node scripts/install-local.mjs --skip-ui --desktop" runs
      Then "codesign -v ~/.aof/bin/aof-mesh-desktop.app" exits 0
      And launching the bundle shows a menu-bar icon, no Dock tile, and no entry in Cmd-Tab
