@executable @cli @work @planning
Feature: the layout module owns the diagram's folder, its stem, its brief and its link block

  WHY. Three parties must agree on one spelling: the writer (`aof diagram plan` / `export`), the
  reader (the doctor lane, story 03) and the architect who pastes the block. ADR-003 gives that
  spelling one home, `src/diagrams/layout.mjs`, and FF-13302 keeps it there. This task pins the
  behaviour of that module. The fitness function pins that nothing else re-derives it.

  RULINGS (QA, 2026-09-23).
  (1) All functions here are pure over text and paths. None reads the disk. The listing and the
      markdown are passed in, which is what lets the doctor lane stay a pure lane.
  (2) `diagramPaths` answers project-root-relative paths with forward slashes whatever the host OS,
      because they are compared across nodes and pasted into markdown.
  (3) An ADR's section runs from its `## ADR-NNN` heading to the next `## ` heading or the end of
      the file. The `### Diagram` brief runs from that subsection's heading to the first line that
      is an image or a link into `diagrams/`, or to the next `##`/`###` heading, whichever is
      first. The brief is trimmed, and an empty brief is null.
  (4) The heading match is on the id only: `## ADR-002 — anything` is ADR-002. `## ADR-2` is not.
  (5) `parseDiagramLinks` reports both image targets `![…](diagrams/…)` and plain link targets
      `[…](diagrams/…)`. A link outside any `## ADR-NNN` section is reported with `adr: null`
      rather than dropped, so the gate can see it.

  Background:
    Given `src/diagrams/layout.mjs` is imported directly

  Scenario Outline: the stem grammar
    When `diagramStem(<adr>, <slug>)` is asked
    Then it answers <answer>

    Examples:
      | adr         | slug                   | answer                                       |
      | `"ADR-002"` | `"generator-seam"`     | `"ADR-002-generator-seam"`                    |
      | `"ADR-010"` | `"a"`                  | `"ADR-010-a"`                                 |
      | `"ADR-2"`   | `"generator-seam"`     | a coded refusal `diagram-adr-invalid`         |
      | `"adr-002"` | `"generator-seam"`     | a coded refusal `diagram-adr-invalid`         |
      | `"ADR-002"` | `"Generator-Seam"`     | a coded refusal `diagram-slug-invalid`        |
      | `"ADR-002"` | `"-seam"`              | a coded refusal `diagram-slug-invalid`        |
      | `"ADR-002"` | `"seam/../x"`          | a coded refusal `diagram-slug-invalid`        |
      | `"ADR-002"` | a 49-character slug    | a coded refusal `diagram-slug-invalid`        |
      | `"ADR-002"` | a 48-character slug    | the stem, accepted                            |

  Scenario: the paths sit in the item's own diagrams folder
    When `diagramPaths("wiki/work/133_milestone_x", "ADR-002-generator-seam", ".html", ["svg","png"])` is asked
    Then it deep-equals `{ dir: "wiki/work/133_milestone_x/diagrams", source: "wiki/work/133_milestone_x/diagrams/ADR-002-generator-seam.html", svg: "wiki/work/133_milestone_x/diagrams/ADR-002-generator-seam.svg", png: "wiki/work/133_milestone_x/diagrams/ADR-002-generator-seam.png" }`
    And with formats `["svg"]` the answer has no `png` key
    And an item dir spelled with backslashes answers the same forward-slash paths

  Scenario Outline: the brief is the prose under the ADR's own Diagram heading
    Given an `ARCHITECTURE.md` text <text>
    When `readDiagramBrief(text, "ADR-002")` is asked
    Then it answers <brief>

    Examples:
      | text                                                                                                   | brief                          |
      | `## ADR-002 — seam` / `### Diagram` / `Draw the seam.` / `## ADR-003 — x`                              | `"Draw the seam."`             |
      | `## ADR-002 — seam` / `### Diagram` / `Draw it.` / `` / `![a](diagrams/ADR-002-s.svg)` / `after`       | `"Draw it."`                   |
      | `## ADR-002 — seam` / `### Consequences` / `none` / `## ADR-003 — x` / `### Diagram` / `not mine`      | `null`                         |
      | `## ADR-002 — seam` / `### Diagram` / `` / `## ADR-003 — x`                                            | `null`                         |
      | `## ADR-003 — x` / `### Diagram` / `other ADR`                                                         | `null`                         |

  Scenario: the link block is exactly the shape ADR-003 §3 prints
    When `renderDiagramBlock({ adrId: "ADR-002", title: "the generator seam", stem: "ADR-002-generator-seam", sourceExt: ".html", formats: ["svg","png"] })` is asked
    Then it answers the two lines
      """
      ![ADR-002 — the generator seam](diagrams/ADR-002-generator-seam.svg)

      Source: [ADR-002-generator-seam.html](diagrams/ADR-002-generator-seam.html) · PNG: [ADR-002-generator-seam.png](diagrams/ADR-002-generator-seam.png)
      """
    And with formats `["svg"]` the second line ends after the source link, with no `· PNG:` part

  Scenario: a rendered block parses back to every target it wrote, under its own ADR
    Given an `ARCHITECTURE.md` whose `## ADR-002 — seam` section ends with the block rendered above
    When `parseDiagramLinks(text)` is asked
    Then it answers three entries, for the `.svg` image, the `.html` link and the `.png` link
    And each carries `adr: "ADR-002"`, `stem: "ADR-002-generator-seam"`, its `target` and its 1-based `line`
    And the `.svg` entry carries `kind: "image"` and the other two `kind: "link"`

  Scenario: links outside diagrams/ are not diagram links, and a link outside an ADR is still reported
    Given an `ARCHITECTURE.md` with `[x](../SPEC.md)` and `![y](mocks/a.png)` inside `## ADR-001`, and `![z](diagrams/ADR-009-z.svg)` above the first `## ADR` heading
    When `parseDiagramLinks(text)` is asked
    Then it answers one entry, for `diagrams/ADR-009-z.svg`, with `adr: null`
