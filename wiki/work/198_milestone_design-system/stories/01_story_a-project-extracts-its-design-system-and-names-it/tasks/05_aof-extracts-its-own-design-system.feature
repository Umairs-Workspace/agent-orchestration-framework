@manual @cli @design
Feature: AOF extracts its own design system from its code and its exported mocks, and names it in config

  WHY. This is the milestone's first deliverable an outsider can check, and it is time-critical:
  AOF's look lives in the page mocks of its Claude Design project, and standalone Claude Design
  closes on 2026-12-14 (ADR-004). The Artifact calls are the session's (ADR-003), so only a real
  run proves them. The run is the extract command's own procedure, on this repository's inputs:
  "apps/ui/src/index.css", every "mocks/" dir under "wiki/work", and the operator's fresh export.

  Run it in an interactive Claude Code session at this checkout, with "/aof:design-system extract".
  Record each scenario's evidence in the milestone's VERIFICATION.md.

  Rule: R7 · Extract builds the system from the code and the mocks, publishes it only after the operator agrees, and names it only when its title is unambiguous

    Scenario: E19 · AOF's own run builds the system and names it
      Given the operator has exported the AOF Claude Design pages not yet committed
      When "/aof:design-system extract" runs with "apps/ui/src/index.css" and those exports
      Then before anything is published, it shows an inventory of 20 colours and 1 radius
      And the components the mocks repeat: the bar, nav, scope segment, pills, cards and terminal pane
      And the values only a mock paints, each for the operator to accept or drop
      And once the operator agrees, a Design System titled "AOF" is published, its index marked "editing": "code"
      And its "tokens.json" carries "meta.source" with this repository, the ref and "apps/ui/src/index.css"
      And each listed component has a README and a static preview
      And "aof design-system check" against the published "tokens.json" reports no drift
      And once the operator approves the published system, ".aof/aof.config.json" holds {"enabled": true, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]}
      And "aof project validate" reports no "design-system-*" finding

    Scenario: E20 · a title another system already holds is a stop
      Given a Design System titled "AOF" is among the systems the operator can open
      When "/aof:design-system extract" reaches its title
      Then it stops before publishing, naming "AOF" and every candidate's title and link
      And nothing is published, and ".aof/aof.config.json" is unchanged

    Scenario: E21 · a declined inventory publishes nothing
      When the operator declines the inventory
      Then nothing is published, and ".aof/aof.config.json" is unchanged

    Scenario: an accepted mock-only value goes into the code first
      Given the inventory lists a value only a mock paints
      When the operator accepts it
      Then the session adds it to "apps/ui/src/index.css" and runs "aof design-system tokens" again
      And the published system holds it, and "check" still reports no drift

    Scenario: a run driven by the loop asks through the loop
      Given the extract command runs in a session the loop drives
      When it reaches the inventory review and the approval of the published system
      Then each one is a single question the loop posts, carrying the inventory or the system's link
      And no publish waits on a permission prompt nobody can answer

  Scenario: adding the package passes the dependency audit
    When "node scripts/supply-chain-audit.mjs" runs after "yarn.lock" gains "@aof/design-system"
    Then it reports no finding
