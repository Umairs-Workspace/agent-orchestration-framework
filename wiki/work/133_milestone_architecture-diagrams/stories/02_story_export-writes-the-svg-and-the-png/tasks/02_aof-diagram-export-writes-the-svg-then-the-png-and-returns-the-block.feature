@executable @cli @adapter @planning
Feature: `aof diagram export` writes the SVG first, then the PNG, and hands back the block to paste

  WHY. ADR-004 §3 and ADR-005 §4. The architect has drawn a source file. Export turns it into the
  committed exports and returns the exact markdown block ADR-003 §3 prints, which the architect
  pastes (aof never edits `ARCHITECTURE.md`). A PNG failure must never cost the SVG: the SVG is
  written first, a PNG miss leaves it in place, and the command exits non-zero naming what is
  missing, so the doctor lane keeps the item red until a node with a browser exports it.

  RULINGS (QA, 2026-09-23).
  (1) The source is found by listing `diagrams/` for `ADR-NNN-*.<sourceExt>`. Exactly one must
      match. The stem comes from that file name, so `export` needs no `--slug`.
  (2) The block's `title` is the ADR heading's text after the id and its dash
      (`## ADR-002 — The generator seam is one adapter…` gives `The generator seam is one
      adapter…`). The block is built by the layout's `renderDiagramBlock`, never re-spelled here.
  (3) A PNG miss answers `{ written: [svg], block, png: { ok: false, code, fix } }` on stdout under
      `--json` AND exits non-zero, so a script sees the partial result and a shell sees the failure.
  (4) Re-exporting an open item overwrites both exports (ADR-003 §4). A `done` item refuses before
      anything is written.
  (5) The PNG step runs through `rasterizeSvg`. A CLI child cannot spawn a fake browser script on
      Windows (only a real executable), so every scenario that reaches the PNG step invokes
      `diagram:export` in-process through `invoke`, with the rasterizer's `spawn`, clock and sleep
      injected through the command context. The scenarios that start no browser (the refusals, the
      missing-renderer row and the SVG-only project) run the real CLI, which also pins the exit codes.
  (6) `diagram-png-render-failed` (the browser exited non-zero without writing) is a code this
      contract adds beside ADR-005's two. It is ratified here, in the authoring beat that raised it.

  Background:
    Given a fixture project `P` in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And `P`'s config sets `work.diagrams` to `{ generator: "diagram-design", browser: <an existing file standing in for the browser> }`
    And `P` holds milestone `07_milestone_m`, `in-progress`, whose `ARCHITECTURE.md` carries `## ADR-002 — the generator seam`
    And `P/wiki/work/07_milestone_m/diagrams/ADR-002-generator-seam.html` holds one `<svg viewBox="0 0 1000 480">`

  Scenario: the happy path writes both exports and returns the block
    Given the fake browser writes a non-empty PNG and exits 0
    When `aof diagram export 07 ADR-002 --json` is run in `P`
    Then it exits 0
    And `diagrams/ADR-002-generator-seam.svg` exists and equals the adapter's `toSvg` of the source
    And `diagrams/ADR-002-generator-seam.png` exists and is non-empty
    And `written` lists the SVG then the PNG, project-root-relative with forward slashes
    And `block` equals `renderDiagramBlock({ adrId: "ADR-002", title: "the generator seam", stem: "ADR-002-generator-seam", sourceExt: ".html", formats: ["svg","png"] })`
    And `ARCHITECTURE.md` is byte-identical to before

  Scenario: an SVG-only project writes no PNG and starts no browser
    Given `P`'s config sets `formats` to `["svg"]`
    When `aof diagram export 07 ADR-002 --json` is run in `P`
    Then it exits 0
    And only the SVG was written, and no process was spawned
    And `block` carries no `· PNG:` part

  Scenario Outline: a PNG miss keeps the SVG and says what is missing
    Given <browser state>
    When `aof diagram export 07 ADR-002 --json` is run in `P`
    Then it exits non-zero
    And `diagrams/ADR-002-generator-seam.svg` exists
    And no `.png` exists for the stem
    And the envelope carries `written` naming the SVG, the `block`, and `png.code` <code>

    Examples:
      | browser state                                                    | code                              |
      | the configured browser path does not exist                       | `diagram-png-renderer-missing`    |
      | the fake browser exits 0 and never writes                        | `diagram-png-render-timeout`      |
      | the fake browser exits 1 and never writes                        | `diagram-png-render-failed`       |

  Scenario Outline: a coded refusal writes nothing
    Given <state>
    When `aof diagram export <ref> ADR-002 --json` is run in `P`
    Then it exits non-zero with code <code>
    And no `.svg` or `.png` was written

    Examples:
      | state                                                                              | ref  | code                        |
      | `P`'s config has no `work.diagrams`                                                | `07` | `diagram-disabled`          |
      | `P`'s config sets `generator: "off"`                                               | `07` | `diagram-disabled`          |
      | no item `99` exists                                                                | `99` | `ref-not-found`             |
      | `diagrams/` holds no `ADR-002-*.html`                                              | `07` | `diagram-source-missing`    |
      | `diagrams/` holds `ADR-002-a.html` and `ADR-002-b.html`                            | `07` | `diagram-source-ambiguous`  |
      | the source holds no `<svg>`                                                        | `07` | `diagram-source-no-svg`     |
      | the source's `<svg>` has no `viewBox`                                              | `07` | `diagram-svg-no-viewbox`    |
      | `07` is `done`                                                                     | `07` | `diagram-item-delivered`    |

  Scenario: an ambiguous source names every candidate
    Given `diagrams/` holds `ADR-002-a.html` and `ADR-002-b.html`
    When `aof diagram export 07 ADR-002 --json` is run in `P`
    Then the `diagram-source-ambiguous` message names both files

  Scenario: re-exporting an open item overwrites both exports
    Given a first export has written both files
    And the source is edited so its `<svg>` carries a different `<title>`
    When `aof diagram export 07 ADR-002 --json` is run again
    Then the SVG on disk carries the new `<title>`
    And the PNG's modification time is later than the first export's

  Scenario: the human face prints the block ready to paste
    Given `P`'s config sets `formats` to `["svg"]`, so the real CLI starts no browser
    When `aof diagram export 07 ADR-002` is run in `P` without `--json`
    Then it exits 0
    And its output names each written file
    And its output ends with the block, verbatim
