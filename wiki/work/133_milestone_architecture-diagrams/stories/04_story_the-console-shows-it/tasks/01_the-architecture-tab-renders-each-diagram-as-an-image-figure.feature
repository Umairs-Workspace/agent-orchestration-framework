@executable @ui @work @board
Feature: a milestone's ARCHITECTURE tab renders the document, and each linked diagram as an image figure in one of four states

  WHY. The board has no architecture surface at all (measured: a milestone's tabs are
  `SPEC, VERIFICATION, RETROSPECTIVE, RUNS, FINDINGS`). ADR-007 §3 adds `ARCHITECTURE`, second,
  for milestones. It renders like every other doc tab, and each `diagrams/<member>.svg` image is
  drawn where its ADR links it (DESIGN's binding checklist). The diagram arrives as an SVG body and
  reaches the page ONLY as a `data:image/svg+xml` URI in an `<img src>` (ADR-007 §4). An `<img>`
  runs no script, so the unsanitised-markdown trust model stays true (FF-13304).

  RULINGS (QA + developer, 2026-09-23).
  (1) The logic is headless-testable. `ui/src/board/diagrams.mjs` (with its `.d.mts`) holds the
      member collection, the data URI, the mapping from a doc response to a figure state and the
      figure's markup for each state. `Markdown.tsx` gains an optional `images` prop and passes
      image tokens to that module. `DetailPanel.tsx` gains only the tab, the Records row and one
      call. `DetailPanel.tsx` is at 993 of its 1,000 lines.
  (2) The member is the file name as the manifest spells it (`ADR-002-seam.svg`), taken from an
      image `src` that is exactly `diagrams/<member>.svg` with no further `/`. Anything else is an
      ordinary image, rendered as `marked` renders it today.
  (3) Each distinct member is fetched once per render of the tab, however many times it is linked.
  (4) The figure's alt text and caption are HTML-escaped. The data URI is the only
      diagram-derived content in the markup.
  (5) State mapping: pending → `loading`; a body → `populated`; an absent doc → `missing` (with the
      reporting node's wording when the row came from another node); a thrown or error response →
      `error`, carrying its message.
  (6) The tab set itself is in `DetailPanel.tsx`, which no headless suite can import. It is judged
      in the real board by task 02.

  Background:
    Given `ui/src/board/diagrams.mjs` is imported headlessly, the way `test/ui` imports `action.mjs` and `freshness.mjs`

  Scenario Outline: only diagrams/<member>.svg images are diagrams
    Given a markdown text whose images are <images>
    When `diagramMembers(text)` is asked
    Then it answers <members>

    Examples:
      | images                                                                                   | members                               |
      | `![a](diagrams/ADR-002-seam.svg)`                                                        | `["ADR-002-seam.svg"]`                |
      | `![a](diagrams/ADR-002-seam.svg)` twice and `![b](diagrams/ADR-005-x.svg)`               | `["ADR-002-seam.svg", "ADR-005-x.svg"]` |
      | `![a](diagrams/ADR-002-seam.png)`, `![b](mocks/x.svg)`, `![c](diagrams/old/y.svg)`       | `[]`                                  |
      | none, only the link `[s](diagrams/ADR-002-seam.html)`                                    | `[]`                                  |

  Scenario: the data URI carries the body encoded, and nothing else
    Given an SVG body `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>a & b</title></svg>`
    When `svgDataUri(body)` is asked
    Then it answers `data:image/svg+xml;charset=utf-8,` followed by `encodeURIComponent(body)`
    And decoding the part after the comma gives back the body byte for byte

  Scenario Outline: a doc response maps to a figure state
    Given the doc fetch for member `ADR-002-seam.svg` <response>
    When `figureState(response)` is asked
    Then it answers state <state> <with>

    Examples:
      | response                                                           | state         | with                                                |
      | has not settled                                                    | `"loading"`   | nothing else                                        |
      | answered a body                                                    | `"populated"` | the body's data URI                                 |
      | answered absent, on a row this node holds                          | `"missing"`   | the text `Diagram not found — ADR-002-seam.svg is not in this item` |
      | answered absent, on a row reported by `node-a1b2`                  | `"missing"`   | the text `Diagram not synced from node-a1b2 yet`    |
      | failed with the message `HTTP 500`                                 | `"error"`     | the text `Could not load diagram: HTTP 500`         |

  Scenario Outline: the figure's markup, per state
    When `figureHtml({ alt: "ADR-002 — the <seam>", state: <state>, … })` is asked
    Then the markup is one block `<figure>` whose frame carries <frame>
    And it holds <content>

    Examples:
      | state         | frame                                      | content                                                                                                                 |
      | `"populated"` | `rounded-md`, `border`, `border-border`, `bg-card` | an `<img>` whose `src` is the data URI and whose `alt` is `ADR-002 — the &lt;seam&gt;`, and a `<figcaption>` in `text-xs text-muted-foreground` with the same escaped text |
      | `"loading"`   | the same classes and `aspect-ratio: 16 / 9` | the line `Loading diagram…` in `text-sm text-muted-foreground`, and no `<img>`                                          |
      | `"missing"`   | `border-dashed` and `border-border`        | the missing text in `text-sm text-muted-foreground`, never `text-accent`, and no `<img>`                                |
      | `"error"`     | `border-dashed` and `border-border`        | the error text in `text-sm text-accent`, and no `<img>`                                                                 |

  Scenario: the image never grows past its own width and never scrolls sideways
    When `figureHtml` is asked for a populated figure whose SVG viewBox is `0 0 1000 480`
    Then the `<img>` carries `display:block`, `width:100%`, `height:auto`, `max-height:70vh`, `object-fit:contain` and `max-width:1000px`

  Scenario: a figure replaces its image in place, and the block's source line stays a paragraph
    Given the `ARCHITECTURE.md` text of an ADR whose block is `![ADR-002 — seam](diagrams/ADR-002-seam.svg)`, a blank line, then `Source: [ADR-002-seam.html](diagrams/ADR-002-seam.html) · PNG: [ADR-002-seam.png](diagrams/ADR-002-seam.png)`
    And an images map giving `diagrams/ADR-002-seam.svg` the populated state
    When the text is rendered through the image renderer `diagrams.mjs` hands `Markdown`
    Then the output holds the populated `<figure>` at the image's position, between the ADR's prose and the source line
    And the `<figure>` is not nested inside a `<p>`, since a block inside a paragraph is split apart by the browser
    And the source line renders as a `<p>` holding two ordinary links
    And the output contains no `<svg` markup

  Scenario: an image the map does not know renders the missing figure
    Given an images map that has no entry for `diagrams/ADR-002-seam.svg`
    When the block above is rendered
    Then the figure is in the `missing` state

  Scenario: a document with no diagrams renders as it does today
    Given an `ARCHITECTURE.md` text with no `diagrams/` image
    When it is rendered with an empty images map and without one
    Then both outputs are byte-identical to `marked`'s output for the same text today
    And neither contains `<figure`
