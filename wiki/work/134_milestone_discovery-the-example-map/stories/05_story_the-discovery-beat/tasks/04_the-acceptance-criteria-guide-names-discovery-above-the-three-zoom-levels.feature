@executable @docs @work @planning
Feature: the acceptance-criteria guide names discovery, the level above the three zoom levels

  WHY. `wiki/acceptance-criteria.md` is the human registry of what a task feature holds. It
  describes formulation (Scenario, Scenario Outline + Examples, step definitions) and nothing
  before it, which is the gap this milestone measures: aof's examples are written by agents, as a
  coverage matrix, after the behaviour is decided. The guide gains the level above: the example
  map, in which rules and key examples are agreed and business questions go to a person before any
  Scenario is written. It points at the map's own home rather than restating its grammar.

  RULINGS (QA, 2026-09-24).
  (1) The guide is not a bundle document, so it has no rendered copies. This suite reads it from
      this checkout and pins content, not wording.
  (2) "Before the three zoom levels" is measured against the `## Three zoom levels from one source`
      heading: the example-map passage opens under a heading of its own that comes earlier.
  (3) "Points rather than restates" is measured: the passage holds no line that opens as a map line
      does (`## R`, `- E` or `- Q` followed by a digit). It states the class policy and the three
      labels once. The question states and the doctor codes stay with 02 and 04.
  (4) The template is named by a path that resolves in this checkout: the bundle source
      `src/bundle/templates/story/EXAMPLES.md` or its installed copy
      `.aof/templates/work/story/EXAMPLES.md`. `wiki/templates/story/` holds no map template, and
      this story does not write there.
  (5) QA's Examples tables do not change (SPEC, out of scope), so the guide's zoom-level sections
      are not a subject of this task; the change is the one added passage.

  Background:
    Given `wiki/acceptance-criteria.md` is read from this checkout

  Scenario: the guide places discovery above the three zoom levels
    When the guide is read
    Then it has a passage on the example map that comes before the section on the three zoom levels
    And that passage says the map is written before any Scenario, and that its key examples are agreed rather than enumerated

  Scenario: the guide says who decides a business rule
    When the example-map passage is read
    Then it says a business-rule question goes to a person, and a technical one may take a documented default
    And it says an example is `proposed` until a person's recorded answer makes it `confirmed` or `stated`

  Scenario: the guide says the map is conditional and points at its home
    When the example-map passage is read
    Then it says the map is written only when `work.examples.enabled` is on
    And it names the story's `EXAMPLES.md` and its template as where the map's form is defined

  Scenario: the guide points at the template by a path that resolves, and restates no line of the grammar
    When the example-map passage is read
    Then the template path it names exists in this checkout
    And it holds no line that opens as a map line does: `## R`, `- E` or `- Q` followed by a digit
