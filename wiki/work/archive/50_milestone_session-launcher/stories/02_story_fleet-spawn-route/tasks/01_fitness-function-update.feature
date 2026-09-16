@executable @cli @validate
Feature: Fitness function update — the bounded write allowlist grows to two

  The fitness function `acd-mesh-ui-write-isolation` is updated to enumerate
  BOTH named write routes (assign + session) and fire on any unenumerated third.
  The bound stays a bound. ADR-001.

  Scenario: mesh-ui-serve.mjs declares exactly the two named write routes (assign + session)
    Given the source of src/mesh-ui-serve.mjs with comments stripped
    Then it declares pathname === "/api/mesh/assign"
    And it declares pathname === "/api/mesh/session"
    And it does NOT declare pathname === "/api/mesh/route"
    And it does NOT declare pathname === "/api/mesh/revoke"
    And it does NOT declare any other /api/mesh/<write-path>

  Scenario: a planted third write route is detected
    Given a source fixture containing BOTH /api/mesh/assign AND /api/mesh/session AND /api/mesh/route
    Then the "no OTHER write route" assertion fires on the planted /api/mesh/route

  Scenario: mesh-ui-serve.mjs still performs no fs write (the face itself writes nothing)
    Given the source of src/mesh-ui-serve.mjs with comments stripped
    Then it contains no writeFile, appendFile, mkdir, rm, rmdir, unlink, or rename call

  Scenario: mesh-ui-serve.mjs still performs no shell-out
    Given the source of src/mesh-ui-serve.mjs with comments stripped
    Then it contains no child_process import
    And it contains no spawn, spawnSync, exec, execSync, or execFile call

  Scenario: mesh-ui-serve.mjs still serves no /ws/terminal
    Given the source of src/mesh-ui-serve.mjs with comments stripped
    Then it contains no "/ws/terminal" pathname declaration (the board's own route)

  Scenario: the self-check planted-violation still fires (non-vacuous)
    Given a planted source with /api/mesh/session + a SECOND unregistered /api/mesh/route
    Then the detector fires

  Examples:
    | route declared      | allowed | detector fires |
    | /api/mesh/assign    | yes     | no             |
    | /api/mesh/session   | yes     | no             |
    | /api/mesh/route     | no      | yes            |
    | /api/mesh/revoke    | no      | yes            |
    | /api/mesh/terminate | no      | yes            |
