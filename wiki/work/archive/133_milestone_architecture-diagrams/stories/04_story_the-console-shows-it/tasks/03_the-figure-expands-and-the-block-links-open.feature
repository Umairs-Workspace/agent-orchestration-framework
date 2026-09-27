@executable @ui @work @board @bug @finding-F-133-01 @finding-F-133-02
Feature: a diagram figure opens full size, and the pasted block's Source and PNG links open the committed files

  WHY THIS EXISTS. At `aof:verify 133` (2026-09-23) the operator read ADR-002's figure in the real
  board and ruled it "too small to be of any use", with nothing to click. The detail panel is about
  350 px wide at every viewport, so a 1000-wide diagram shows at a third of its size. The operator
  also found the block's `Source · PNG` links dead: they are relative `diagrams/…` hrefs, which resolve
  against the board's own URL and 404. Both are blockers on this story (VERIFICATION F-133-01 and
  F-133-02). DESIGN's "no zoom, pan or lightbox" line is overturned by the operator's ruling.

  RULINGS (PO at verify, 2026-09-23, the operator's choice of "serve them, sandboxed").
  (1) The viewer shows the SAME data-URI `<img>` the figure holds. No diagram body becomes markup, so
      FF-13304's trust line is unchanged.
  (2) A committed diagram file is served BY BYTES from this node's checkout by one registry command,
      `diagram:file`, which the board route `/api/diagram/file` forwards to (outside `/api/work`, whose routes are in bijection with the `work:*` commands, 15/ADR-005). Every answer carries
      `Content-Security-Policy: sandbox`, so the generator's HTML opens in an opaque origin with no
      script. The file name is checked by the layout's one grammar before any read.
  (3) A row another node holds is answered `not on this node`. The worker stream still carries the
      SVG alone (ADR-007 §2), and this route never fetches from a worker.
  (4) Task 01's scenarios are left as delivered. Without an item ref the renderer has no route to
      point at, and renders exactly as task 01 pins.

  Scenario: a populated figure is a button that names what it enlarges
    Given the ARCHITECTURE renderer is given the item ref "133" and ADR-002's populated figure
    When the pasted block is rendered
    Then the figure's frame is a `<button>` carrying `data-diagram-expand="diagrams/ADR-002-seam.svg"` and the escaped alt text
    And it still holds the same data-URI image and the same caption
    And a missing or loading figure is not a button

  Scenario: the block's links point at the served file in a new tab
    Given the ARCHITECTURE renderer is given the item ref "133"
    When the pasted block is rendered
    Then `Source` links to `/api/diagram/file?ref=133&file=ADR-002-seam.html` with `target="_blank"` and `rel="noopener noreferrer"`
    And `PNG` links to `/api/diagram/file?ref=133&file=ADR-002-seam.png` the same way
    And a link that does not point into `diagrams/` renders as marked renders it

  Scenario Outline: the layout admits one file name, and nothing outside the folder
    When `diagramFile` is asked for "<name>"
    Then it answers <answer>

    Examples:
      | name                        | answer                                   |
      | ADR-002-seam.html           | the name, under the item's `diagrams/`   |
      | ADR-002-seam.svg            | the name, under the item's `diagrams/`   |
      | ADR-002-seam.png            | the name, under the item's `diagrams/`   |
      | ADR-002-seam.js             | null                                     |
      | ADR-002.svg                 | null                                     |
      | ../SPEC.md                  | null                                     |
      | x/ADR-002-seam.svg          | null                                     |
      | ADR-2-seam.svg              | null                                     |

  Scenario: diagram:file answers the bytes, an absence, or a coded refusal
    Given a milestone whose `diagrams/` holds `ADR-002-seam.png`
    When `diagram:file` is asked for that file
    Then it answers `present: true`, `contentType: "image/png"` and the file's exact bytes
    And a file the folder does not hold answers `present: false` on this node
    And a name outside the grammar is refused with `diagram-file-invalid`

  Scenario: the board route serves the bytes sandboxed, and says plainly when there is nothing
    Given the board serves that milestone
    When `/api/diagram/file` is fetched for the PNG
    Then the response is 200 with `content-type: image/png`, `content-security-policy: sandbox` and the file's exact bytes
    And a file the folder does not hold is a 404 whose text names it
    And a name outside the grammar is a 400 carrying `diagram-file-invalid`
