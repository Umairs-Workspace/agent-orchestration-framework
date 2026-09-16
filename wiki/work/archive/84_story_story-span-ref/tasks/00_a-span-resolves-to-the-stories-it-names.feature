@cli @work @work-stream
Feature: A story span resolves to the stories it names, and leaves the other ref forms alone

  THE REF VOCABULARY HAD A HOLE BETWEEN ITS TWO NUMERIC FORMS. `findWork` admitted a bare number (a
  top-level item) and a `NN/MM` pair (one story), then fell through to a free-text slug match. A
  typed `44/01-03` therefore matched no slug and answered `[]` — a read miss reported as though the
  stories did not exist.

  A SPAN IS THE ONE REF FORM THAT RESOLVES TO MANY ROWS. Every other form answers with at most one
  item, which is why the rows are ORDERED here rather than left in `listItems` order: the caller that
  drives them needs the order the milestone walk would offer them in, not the order the directory
  happened to list. Many rows from a span is the answer, not an ambiguity to disambiguate.

  A DESCENDING SPAN PARSES AND ADMITS NOTHING. `44/03-01` is not an error — an empty set is the
  honest answer to "the stories from 3 to 1", and it is the same answer `decideLoopScope` already
  gives the driver range `53-52`. The same holds for a span naming stories or a driver that do not
  exist: a read miss, never a throw.

  THE EXISTING FORMS ARE THE REGRESSION SURFACE. The span pattern is tested AFTER the two numeric
  forms precisely so neither changes meaning, and the free-text branch must still match slugs — a
  span regex that swallowed free text would break every `aof work find <slug>` in the framework.

  @executable
  Scenario: a span resolves to exactly the stories it names, in walk order
    When an operator resolves the ref 44/01-03
    Then it answers with the stories 44/01, 44/02 and 44/03
    And the rows are ordered by story number rather than by directory listing order

  @executable
  Scenario Outline: a span is bounded by both ends, by its driver, and by what exists
    When an operator resolves <span>
    Then it answers with <rows>

    Examples:
      | span     | rows                                             |
      | 44/00-01 | the first two stories of milestone 44             |
      | 44/04-09 | only the stories that exist within the upper end  |
      | 45/00-05 | only the named driver's own stories               |
      | 44/40-42 | the empty set — no story falls in that range      |
      | 99/00-02 | the empty set — no such driver                    |
      | 44/03-01 | the empty set — lo is greater than hi             |

  @executable
  Scenario: the ref forms that existed before the span still mean what they meant
    When an operator resolves a bare number, a NN/MM pair, or free text
    Then the bare number is still the top-level item at that slot
    And the pair is still that one story
    And the free text still matches item slugs
