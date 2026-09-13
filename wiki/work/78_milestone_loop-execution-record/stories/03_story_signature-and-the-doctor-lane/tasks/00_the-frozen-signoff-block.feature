@executable @docs @work @validate
Feature: The frozen sign-off block — a signature in a shape a check can read

  Milestone 66's law, applied: a frozen `h2`, a frozen table header, and the id ALONE in the first
  cell. The reason is the one 66 measured — a positional rule is what separates a DECLARATION from a
  mention, and an id sharing its cell with prose declares nothing. A signature written as prose in a
  paragraph is not checkable and will drift, which is why `SPEC.md` asks for this shape by name.

  THE FIRST CELL HOLDS A LOOP ID — `loop:<name>`, the endpoint grammar the registry already uses. This
  milestone deliberately introduces NO new id form: `src/declared-id.mjs`'s set is closed and, by
  66/ADR-008, extended by ADR only. A sign-off is per engagement, because a human accepting that the
  build loop ran acceptably has said nothing about the review loop.

  WHAT COUNTS AS SIGNED is a whole row, not a name: an id, a signer, a date and a verdict. A row with a
  name and no verdict is half a claim, and the writer that carries rows forward (78/02) needs an
  unambiguous answer to "is this row signed" before it can decide what to preserve.

  Scenario: the block's heading and header row are frozen
    Given a rendered `EXECUTION.md`
    Then it carries the sign-off block under its frozen `h2`
    And the block's table header row is the frozen literal
    And a document whose heading or header row differs is reported as malformed rather than read loosely

  Scenario: the id stands alone in the first cell
    Given a sign-off row
    Then its first cell carries the loop id and nothing else
    And a first cell carrying the id followed by prose declares nothing

  Scenario Outline: a row is signed only when it is complete
    Given a sign-off row with <signer>, <date> and <verdict>
    When the row is read
    Then it is treated as <state>

    Examples: the signed / unsigned boundary
      | signer     | date         | verdict  | state    |
      | a name     | a date       | accepted | signed   |
      | a name     | a date       | rejected | signed   |
      | a name     | a date       | (empty)  | unsigned |
      | a name     | (empty)      | accepted | unsigned |
      | (empty)    | (empty)      | (empty)  | unsigned |
      | the placeholder | the placeholder | the placeholder | unsigned |

  Scenario: an untouched placeholder row is unsigned, not signed
    Given a freshly written `EXECUTION.md` whose sign-off rows are placeholders
    When the rows are read
    Then every row is unsigned
    And no placeholder is mistaken for a recorded signature

  Scenario: one row per engagement
    Given an execution model reporting two engagements
    When the record is written
    Then the sign-off block carries one row for each
    And each row's first cell names the loop of its engagement

  Scenario: a rejected verdict is a signature, not an absence
    Given a sign-off row signed with a rejected verdict
    When the rows are read
    Then the row is signed
    And it is distinguishable from an accepted row

  Scenario: the block survives a document with no engagements
    Given an execution model reporting no engagements
    When the record is written
    Then the sign-off block is present with its frozen heading and header
    And it carries no rows
