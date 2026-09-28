@manual @cli @adapter @planning
Feature: on this machine, a real export renders through a browser aof found, and the result is the size the viewBox says

  WHY THIS IS MEASURED AND NOT INFERRED. Every `@executable` scenario in this story fakes the
  browser, which is right for the ladder and the timing cases and says nothing about whether a real
  Chromium accepts the argv. ARCHITECTURE records one scratchpad measurement (the headless shell,
  0.85 s, 2000×960, RGB). This task repeats it through the shipped command, so the measurement is
  of aof, not of a hand-typed command line.

  RULINGS (QA, 2026-09-23).
  (1) Evidence is recorded in the story's `VERIFICATION.md`: the command, its unedited output, the
      PNG's pixel size read from its IHDR header, and the instant. The repo scrub is applied to
      every pasted path (memory `public-repo-move-2026-09-13`).
  (2) The fixture is a scratch milestone in a temp project, NOT this repo's milestone 133. Drawing
      133's own diagram is story 06.
  (3) The run uses `node src/cli.mjs` from this checkout, because it needs no daemon and no deploy.
  (4) Both the headless-shell rung and a full-browser rung are exercised. The Edge case is the one
      that proves the file poll (its launcher returns before writing).

  Background:
    Given a scratch project `P` in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And `P` holds an in-progress milestone whose `diagrams/` carries a source copied from the plugin's `assets/example-architecture.html` as `ADR-001-example.html`
    And its `ARCHITECTURE.md` carries `## ADR-001 — example`

  Scenario: the cached headless shell renders it
    Given `P`'s config sets `work.diagrams` to `{ generator: "diagram-design" }` with no `browser`
    When `node <checkout>/src/cli.mjs diagram export <ref> ADR-001 --json` is run in `P`
    Then it exits 0
    And the recorded evidence shows the PNG is 2000 × 960 and non-empty
    And the SVG opens in a browser and shows the same diagram as the source HTML
    And no directory named like a Chromium user-data dir is left in the OS temp directory by this run

  Scenario: Edge renders it, and the command waited for the file
    Given `P`'s config sets `work.diagrams.browser` to Edge's absolute path
    When the same export is run
    Then it exits 0
    And the recorded evidence shows the PNG is 2000 × 960 and non-empty
    And the evidence records the wall time of the command, which is longer than the launcher's own return

  Scenario: no Playwright, no Python, no npx was involved
    When the process list is sampled while the export runs, or the spawned argv is logged
    Then the only process spawned is the browser named by the ladder
