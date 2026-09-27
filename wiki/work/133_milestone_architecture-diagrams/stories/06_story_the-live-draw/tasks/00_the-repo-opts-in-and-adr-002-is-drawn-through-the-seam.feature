@manual @cli @work @planning
Feature: this repo opts in with the console's own style, ADR-002's diagram is drawn and exported through the seam, doctor is clean, and the board shows it

  WHY THIS IS MEASURED AND NOT INFERRED. Stories 01 to 05 prove each part against fixtures: config,
  seam, export, gate, console and prose. None of them proves that the real plugin, driven by the
  real `instructions`, produces a source `toSvg` accepts, that a real browser rasterizes it, or that
  the board shows it. ADR-009 §3 names the proof: draw THIS milestone's own seam, ADR-002, whose
  `### Diagram` brief is already written. The diagram appends the link its own brief asks for, and
  the decision itself does not change.

  RULINGS (QA, 2026-09-23).
  (1) The agent does the drawing, the export, the paste and the reads at the source. The operator's
      judgement of the drawing is task 01 (`@uat`). This task does not claim it.
  (2) The CLI is this checkout's (`node src/cli.mjs`), so no deploy or restart is needed for the
      draw. The board read in the last scenario uses `aof work ui` from this checkout on an
      ephemeral port. The live desktop supervisor is not restarted. If the operator wants the
      installed board to show it, that is a normal `install-local` and an operator restart, recorded
      as outstanding rather than done.
  (3) Evidence goes in the story's `VERIFICATION.md`: each command, its unedited output with the repo
      scrub applied, and the instant. "At the source" means files on disk and a fresh process.
  (4) Both `.aof/` edits and the `ARCHITECTURE.md` block are committed BY HAND on the branch. A lane
      reconcile drops `.aof/` (memory `lane-commits-drop-aof-config`).
  (5) The style file follows the plugin's `references/style-guide.md` structure. That file is read
      from the plugin install, outside the repo, and is not a declared path.

  Background:
    Given stories 01 to 05 are done on this branch
    And the plugin is locatable on this machine (the measured project-scoped install)

  Scenario: the style file maps the console's tokens
    When `.aof/diagrams/style.md` is written and then read
    Then it has the plugin style guide's sections: semantic roles, typography, stroke/radius/spacing, node treatments and the light→dark inversion rule
    And its values trace to `ui/src/index.css:3-25`: primary teal `hsl(174 72% 27%)` as the structural accent, crimson `hsl(347 66% 44%)` as the focal role, background `hsl(210 18% 96%)`, foreground `hsl(220 18% 13%)`, border `hsl(214 16% 78%)`, muted foreground `hsl(218 9% 38%)` and radius `0.5rem`
    And its font stacks are the UI's own

  Scenario: the repo opts in, and config validates
    When `.aof/aof.config.json` gains `work.diagrams = { generator: "diagram-design", formats: ["svg","png"], style: ".aof/diagrams/style.md" }`
    Then `aof project validate --json` reports no diagnostic whose path starts with `work.diagrams`
    And no `.diagram-design` marker was written anywhere in the repo, and nothing under `~/.diagram-design/` changed

  Scenario: the plan answers from config
    When `node src/cli.mjs diagram plan 133 ADR-002 --slug generator-seam --json` is run from the repo root
    Then the evidence shows `enabled: true`, `available: true`, `stem: "ADR-002-generator-seam"`
    And `brief` equals the prose under ADR-002's `### Diagram` heading
    And `instructions` name the absolute paths of the located `SKILL.md`, of `.aof/diagrams/style.md` and of the source

  Scenario: the drawing agent follows the instructions and writes only the source
    When a drawing agent is given exactly the `instructions` text
    Then it writes `wiki/work/133_milestone_architecture-diagrams/diagrams/ADR-002-generator-seam.html` and no other file
    And it did not pause for onboarding

  Scenario: export writes both files and returns the block
    When `node src/cli.mjs diagram export 133 ADR-002 --json` is run from the repo root
    Then it exits 0
    And the `.svg` and `.png` exist beside the source, the PNG non-empty, and the evidence records the PNG's pixel size
    And the returned `block` is pasted under ADR-002's `### Diagram` brief, and ADR-002's other text is byte-identical to before

  Scenario: doctor is clean for the diagram lane
    When `aof work doctor 133 --json` is run from the repo root
    Then no finding's code starts with `diagram-`

  Scenario: the board shows it
    When `aof work ui` from this checkout serves the repo, milestone 133 is selected and its ARCHITECTURE tab is captured at 1280
    Then ADR-002's figure is populated, inline under its brief, in the frame DESIGN's checklist describes
    And the other nine ADRs show no figure
