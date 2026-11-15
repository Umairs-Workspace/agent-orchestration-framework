@executable @cli @work @validate
Feature: A finding counts only when it names its source

  WHY. `researched F<n>` is only as good as what it points at. The research document gains one form
  code can read: a level-2 heading that carries the finding's id, and a Source line in its block
  (ADR-001 §6). The reader sits beside the map's own grammar, so the id is spelt once. What the
  reader proves is that a source is named, never that the source is right (ADR-001 §9).

  Background:
    Given the finding reader exported by "packages/specification-by-example/src/map.mjs"

  Rule: R3 · A finding counts only when it names its source

    Scenario: E7 · a heading with a Source line is a sourced finding
      Given a research document holding
        """
        ## F2 · What notice must a landlord give before entry?
        - **Finding:** At least 24 hours' written notice, at a reasonable time of day.
        - **Source:** https://www.legislation.gov.uk/ukpga/1985/70/section/11
        """
      When the document's findings are read
      Then it answers finding "F2" with the text "What notice must a landlord give before entry?", its line number, and sourced

    Scenario: E8 · a finding with no source is read, and is not sourced
      Given a research document holding the heading "## F2 · What notice must a landlord give before entry?" and a Finding line only
      When the document's findings are read
      Then it answers finding "F2", not sourced

    Scenario: E9 · an id used twice resolves to neither
      Given a research document holding two headings that start "## F2 · ", each with a Source line
      When the document's findings are read
      Then "F2" is reported as a duplicate
      And asking for finding "F2" answers none

    Scenario Outline: what counts as a source line
      Given a finding "F1" whose block holds the line "<line>"
      When the document's findings are read
      Then finding "F1" is <sourced>

      Examples:
        | line                                         | sourced     |
        | - **Source:** https://example.org/act#s11    | sourced     |
        | - **Source:** Housing Act 1988, section 21   | sourced     |
        | - **Source:** packages/core/src/paths.mjs:42 | sourced     |
        | - **Source:**                                | not sourced |
        | - **Source:** followed only by spaces        | not sourced |
        | - Source: https://example.org                | not sourced |
        | **Source:** https://example.org              | not sourced |

    Scenario Outline: what counts as a finding heading
      Given a research document holding the line "<heading>" and a Source line under it
      When the document's findings are read
      Then it answers <answer>

      Examples:
        | heading                | answer        |
        | ## F1 · A question     | finding "F1"  |
        | ## F12 · A question    | finding "F12" |
        | ### F1 · A question    | no finding    |
        | # F1 · A question      | no finding    |
        | ## F1 - A question     | no finding    |
        | ## F1 ·                | no finding    |
        | ## F0 · A question     | no finding    |
        | ## F01 · A question    | no finding    |
        | ## R1 · A question     | no finding    |

    Scenario: a finding's block ends at the next level-1 or level-2 heading
      Given a research document holding "## F1 · First" with no Source line, then "## F2 · Second" with a Source line
      When the document's findings are read
      Then finding "F1" is not sourced and finding "F2" is sourced

    Scenario: a level-3 heading stays inside its finding
      Given a research document holding "## F1 · First", then "### Detail", then a Source line
      When the document's findings are read
      Then finding "F1" is sourced

    Scenario: a form shown inside a comment is not a finding
      Given a research document whose only "## F1 · " heading sits inside an HTML comment block
      When the document's findings are read
      Then it answers no finding

    Scenario Outline: the reader is total over text
      When the finding reader is given <input>
      Then it <outcome>

      Examples:
        | input                                   | outcome                                  |
        | the empty string                        | answers no finding                       |
        | a document with CRLF line endings       | answers what the same text with LF does  |
        | a document with frontmatter and no "F"  | answers no finding                       |
        | a value that is not a string            | throws a TypeError                       |

    Scenario: what the reader answers cannot be changed by its caller
      When the document's findings are read
      Then the value is deeply frozen

    Scenario: the research document's file name has one home
      When the package's map module is read
      Then it exports the research document's file name, "RESEARCH.md", beside the map's own
