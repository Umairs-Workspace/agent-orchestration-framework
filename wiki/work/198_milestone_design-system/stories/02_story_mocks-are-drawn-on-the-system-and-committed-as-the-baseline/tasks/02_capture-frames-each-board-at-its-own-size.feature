@executable @cli @design
Feature: "aof design-system mocks capture" frames each imported board at its own size, and records the frames

  WHY. The fidelity judge compares a screenshot of the build with an image of the mock (m07/ADR-001).
  Milestone 47 took its frames by hand, with headless Chromium driven directly, because Playwright is
  blocked here. The rasterizer of milestone 133 already finds such a browser and never installs one
  (RESEARCH R6). Capture is that rasterizer, pointed at each imported board at its "boards" size
  (ADR-006 §3).

  The package spawns nothing (FF-19804). Core hands it the rasterizer's page entry through the
  practice's command services, as it hands the Hyperagent verbs their collaborators. The page entry
  forms its argv with the rasterizer's one argv function (FF-13303), so the suites drive it with an
  injected spawn and no real browser.

  "The import" is task 01's E11: milestone "12", whose mocks/ holds "canvas.json" with the boards
  "fleet-filter.dc.html" (1280x884) and "fleet-filter-390.dc.html" (390x274), in that order.

  Rule: R5 · "mocks capture" frames each imported board at its own size, and records the frames

    Scenario: E16 · each board is framed at its own size, and the frames are recorded
      Given the import
      And a browser that writes each screenshot it is asked for
      When "aof design-system mocks capture --item 12 --json" runs
      Then the browser is asked for "fleet-filter.dc.html" with "--window-size=1280,884" and "--force-device-scale-factor=2"
      And for "fleet-filter-390.dc.html" with "--window-size=390,274" and "--force-device-scale-factor=2"
      And mocks/ holds "fleet-filter.png" and "fleet-filter-390.png"
      And README.md's frame table lists "fleet-filter.png" 1280x884, then "fleet-filter-390.png" 390x274
      And the JSON answer lists both frames with their sizes

    Scenario: capturing again replaces the frames and the table
      Given the import was captured once
      When capture runs again
      Then README.md holds one frame table, listing the same two frames

    Scenario: E17 · with no browser, capture is refused and writes nothing
      Given the import
      And no Chromium-family browser is found
      When capture runs
      Then it is refused with the rasterizer's fix, naming "work.diagrams.browser" and "AOF_DIAGRAM_BROWSER"
      And no PNG is written, and README.md is unchanged

    Scenario: a board the browser fails on stops the capture without a partial table
      Given the import
      And a browser that exits 1 without writing "fleet-filter-390.png"
      When capture runs
      Then it is refused, naming "fleet-filter-390.dc.html" and the browser's exit
      And README.md is unchanged

    Scenario: E18 · capture with nothing imported is refused
      Given milestone "12"'s mocks/ holds no README.md with a "Canvas:" line
      When capture runs
      Then it is refused, saying to run "aof design-system mocks import" first

    Scenario Outline: a board with no usable size is refused
      Given the import's "canvas.json" gives "fleet-filter.dc.html" the frame <frame>
      When capture runs
      Then it is refused, naming "fleet-filter.dc.html" and saying its size is not usable

      Examples:
        | frame                                  |
        | {"x": 0, "y": 0, "w": 0, "h": 884}     |
        | {"x": 0, "y": 0, "w": 1280}            |

  Rule: The rasterizer's page entry is the SVG path's twin, and the SVG path is unchanged

    Scenario: a page is rendered at the size it is given, through the one argv function
      When the rasterizer's page entry renders "fleet-filter.dc.html" at 1280x884
      Then its spawn's argv is the one "browserArgv" forms, ending in the page's file URL
      And the render is done only once the browser has exited and the PNG has stopped growing

    Scenario: the diagram export is unchanged
      When the rasterizer renders an ".svg" diagram, as "aof diagram export" does
      Then the argv and the result are what they were before the page entry existed
      And a source that is not an ".svg" is still refused by the SVG entry as "diagram-png-source-not-svg"

  Scenario: the rasterizer's control still holds, and the package spawns nothing
    When "test/arch/diagrams/acd-diagram-export-no-playwright.test.mjs" (FF-13303) runs
    Then the rasterizer still has exactly one function that returns a browser argv, and each spawn uses it
    And FF-19804's control still finds no HTTP client in "packages/design-system/src"
    And no module under "packages/design-system/src" imports "node:child_process"
