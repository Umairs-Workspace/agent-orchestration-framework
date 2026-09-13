@executable @docs @work @work-stream
Feature: The document body — the facts, the coverage, and the gaps

  The graph is half the record. The other half is what a picture cannot carry: the execution facts
  against the declaration (ADR-004), the join coverage the model always states (ADR-003), and the
  three gap classes (ADR-005). This task renders those, and freezes the bytes.

  DETERMINISM IS THE CONTRACT, not a nicety. A committed projection of a deterministic function is a
  thing a diff can mean something about: regenerate, and a non-empty diff says an input changed. That
  claim is only as good as the bytes, so the rendering carries no timestamp of its own, no absolute
  path, no host name and no run duration in wall-clock terms — every one of those would make the file
  differ on every regeneration and turn the drift check into noise.

  THE DOCUMENT IS MARKDOWN wrapping a fenced `mermaid` block, so it renders on GitHub, in an editor
  preview and in the board. Its frontmatter comes first and any generated-file marker after it — the
  trap recorded as F-73-G, where a leading comment before frontmatter breaks frontmatter parsing
  silently.

  Scenario: the coverage line is always present, and states what was measured
    Given an execution model reporting 14 runs found and 0 carrying a declaration
    When the document body is rendered
    Then it states that 14 runs were found and 0 carried a loop declaration
    And that line is present whether coverage is zero or complete

  Scenario Outline: an engagement renders its cycles against its declared ceiling
    Given an engagement observing <cycles> cycles with <declared>
    When the document body is rendered
    Then the row reports <rendered>

    Examples: the ceiling states ADR-004 keeps distinct on the page
      | declared            | cycles | rendered                                    |
      | `ceiling: 6`        | 4      | 4 cycles against a declared ceiling of 6     |
      | `ceiling: 6`        | 7      | 7 cycles against a declared ceiling of 6, over the bound |
      | `ceiling: none`     | 4      | 4 cycles, ceiling `none` — terminates by construction |
      | `ceiling: unknown`  | 4      | 4 cycles, ceiling `unknown` — nothing has declared one |
      | `ceiling: uncapped` | 4      | 4 cycles, ceiling `uncapped` — deliberately unbounded |

  Scenario: a capped engagement and an uncapped one do not render the same bytes
    Given two engagements identical in every observed fact
    And the first declares `ceiling: 6` while the second declares `ceiling: uncapped`
    When the document body is rendered for each
    Then the two renderings differ

  Scenario: phases, attempts and the terminal outcome appear per engagement
    Given an engagement reporting phases, a 3-link retry chain and a terminal outcome
    When the document body is rendered
    Then its row carries the phases entered, the attempt count and the terminal outcome
    And an engagement still in flight renders as in flight rather than as failed

  Scenario Outline: each gap class renders under its own heading
    Given an execution model reporting one <gap> gap
    When the document body is rendered
    Then the gap appears under the heading for <gap>
    And the heading names the remedy: <remedy>

    Examples: the three classes and what each asks of the reader
      | gap                  | remedy                                    |
      | ran-undeclared       | declare the loop, or fix the id it named   |
      | declared-never-ran   | drive the loop, or accept that it does not apply here |
      | authority-unresolved | fix the registry record's endpoint         |

  Scenario: a class with no gaps renders no heading
    Given an execution model reporting gaps in one class only
    When the document body is rendered
    Then only that class's heading appears
    And the absence of a heading is not rendered as an empty "None" placeholder

  Scenario: the rendering is byte-identical on unchanged input
    Given one execution model
    When the document body is rendered twice
    Then the two renderings are byte-identical

  Scenario: the rendering carries nothing that changes by itself
    Given a document body rendered from a fixed execution model
    Then it contains no generation timestamp
    And it contains no absolute filesystem path
    And it contains no host or node name
    And rendering it again an hour later produces the same bytes

  Scenario: the frontmatter comes first and the generated marker after it
    Given a rendered document
    Then its frontmatter is the first block in the file
    And any generated-file marker appears after the frontmatter, never before it
    And the document's frontmatter parses
