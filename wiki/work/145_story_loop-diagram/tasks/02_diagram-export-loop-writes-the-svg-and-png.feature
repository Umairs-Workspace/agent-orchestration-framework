@executable @cli @work @design
Feature: "aof diagram export <ref> loop" writes the loop diagram's SVG and PNG

  WHY. The drawing agent writes `execution/loop.html` and nothing else. The SVG and PNG come from
  the engine's own export: the generator's `toSvg`, then the rasterizer through a browser aof
  finds. These are the same two steps `aof diagram export` runs for an ADR, with the same rule that
  a PNG failure never costs the SVG. A loop diagram is pasted into no document, so the answer
  carries no block.

  THE FIXTURE BELOW: the project from task 01 after "aof diagram plan 7 loop" has run, with a
  drawn "execution/loop.html" holding one <svg> with a viewBox. The rasterizer is driven
  in-process with a fake browser, as 133's export suite does.

  Scenario: a drawn loop diagram is exported beside its source
    When "aof diagram export 7 loop --json" is run
    Then it exits 0
    And "execution/loop.svg" is the generator's "toSvg" of "execution/loop.html"
    And "execution/loop.png" is written by the rasterizer
    And the answer's "written" lists both, and it carries no "block"

  Scenario: a PNG failure keeps the SVG and exits non-zero
    Given no browser can be found
    When "aof diagram export 7 loop --json" is run
    Then "execution/loop.svg" is written
    And the answer carries "png.ok: false" with the browser's code and fix
    And it exits non-zero

  Scenario Outline: every refusal comes before the first write
    Given <condition>
    When "aof diagram export 7 loop --json" is run
    Then it is refused with the code "<code>"
    And no "execution/loop.svg" exists

    Examples:
      | condition                                         | code                     |
      | "work.diagrams" is unset                          | diagram-disabled         |
      | "execution/loop.html" does not exist              | diagram-source-missing   |
      | "execution/loop.html" holds no <svg>              | diagram-source-no-svg    |
      | the <svg> in "execution/loop.html" has no viewBox | diagram-svg-no-viewbox   |

  Scenario: a done milestone's loop diagram can still be exported
    Given milestone 7 is "done"
    When "aof diagram export 7 loop --json" is run
    Then it exits 0 and "execution/loop.svg" is written

  Scenario: the ADR export answers exactly as before
    When "aof diagram export 7 ADR-002 --json" is run against an ADR source
    Then the answer is the one 133 delivered, its block included
