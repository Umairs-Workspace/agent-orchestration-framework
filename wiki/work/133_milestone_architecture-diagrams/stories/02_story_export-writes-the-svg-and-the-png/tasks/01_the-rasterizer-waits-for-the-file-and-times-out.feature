@executable @cli @adapter @planning
Feature: the rasterizer renders the committed SVG at viewBox × 2, and is done only when the file is written

  WHY. Measured at refine: Chrome's headless shell exited only after it wrote the PNG, but Edge's
  launcher RETURNED in 0.07 s, before the file existed. A rasterizer that trusted the exit would
  report success over a missing PNG on exactly the browser a Windows node is most likely to have.
  ADR-005 §2 therefore makes "done" two facts: the process has exited AND the output file exists
  and is non-empty. It gives up after 30 s.

  RULINGS (QA, 2026-09-23).
  (1) `rasterizeSvg({ svgPath, pngPath, scale, browser, spawn, exists, stat, now, sleep, tmp })`
      takes its process and clock as injected functions. The suites drive every timing case with
      fakes, and no real browser starts in `@executable`.
  (2) The window is the viewBox's width and height, read from the SVG, and the scale factor is
      `scale` (2 by default). A viewBox with a non-zero origin still sizes by its width and height.
      Fractional sizes round UP.
  (3) The user-data dir is a fresh temp directory, and it is removed on EVERY path: success, render
      failure and timeout.
  (4) An output file left over from a previous export does not count. It is removed before the
      spawn, so the file poll cannot be satisfied by stale bytes.
  (5) The argv is formed by ONE function (FF-13303). Its shape is pinned here as behaviour.

  Background:
    Given `rasterizeSvg` and `browserArgv` are imported from `src/diagrams/rasterize.mjs`
    And an SVG fixture at `S` whose root carries `viewBox="0 0 1000 480"`
    And a fake `spawn` that records its argv

  Scenario Outline: the argv
    When `browserArgv` is asked for a browser of kind <kind>, the fixture's viewBox, scale 2, user-data dir `U` and output `O`
    Then the argv holds <headless>, `--window-size=1000,480`, `--force-device-scale-factor=2`, `--user-data-dir=U`, `--screenshot=O` and, last, the `file:///` URL of `S`
    And `O` and the URL use forward slashes, and `O` is absolute

    Examples:
      | kind               | headless                          |
      | `"headless-shell"` | no `--headless` flag              |
      | `"full"`           | `--headless=new`                  |

  Scenario Outline: the window follows the viewBox
    Given the SVG root carries viewBox <viewBox>
    When `rasterizeSvg` is asked at scale 2
    Then the recorded argv holds `--window-size=<size>`

    Examples:
      | viewBox               | size        |
      | `"0 0 1000 480"`      | `1000,480`  |
      | `"-20 -10 640 360"`   | `640,360`   |
      | `"0 0 800.4 600.2"`   | `801,601`   |

  Scenario Outline: done means exited AND written
    Given the fake browser <behaviour>
    When `rasterizeSvg` is asked
    Then it answers <answer>
    And the temp user-data dir no longer exists

    Examples:
      | behaviour                                                                  | answer                                                          |
      | writes a non-empty PNG, then exits 0                                       | `{ ok: true, pngPath }`                                         |
      | exits 0 at once, then writes the PNG 400 ms later (the Edge launcher case) | `{ ok: true, pngPath }`, answered only after the file appeared  |
      | exits 0 and writes a zero-byte file that never grows                       | `{ ok: false, code: "diagram-png-render-timeout" }` after 30 s  |
      | exits 0 and never writes                                                   | `{ ok: false, code: "diagram-png-render-timeout" }` after 30 s  |
      | never exits and never writes                                               | `{ ok: false, code: "diagram-png-render-timeout" }` after 30 s, and the process was killed |
      | exits 1 and never writes                                                   | `{ ok: false, code: "diagram-png-render-failed" }` carrying the exit code and the captured stderr |

  Scenario: a stale PNG cannot satisfy the poll
    Given a non-empty PNG already exists at the output path
    And the fake browser exits 0 and never writes
    When `rasterizeSvg` is asked
    Then it answers `diagram-png-render-timeout`
    And no file exists at the output path

  Scenario: the rasterizer renders the SVG, never the source HTML
    When `rasterizeSvg` is asked with `svgPath` ending `.html`
    Then it refuses with a coded error before any spawn
