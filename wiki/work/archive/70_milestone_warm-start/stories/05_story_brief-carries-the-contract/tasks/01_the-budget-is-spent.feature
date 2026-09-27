@executable @cli @work @work-stream @bug @finding-F-11
Feature: The brief spends its budget instead of stopping at the first miss

  Two structural faults leave more than half the ceiling unspent while the contract is dropped.

  **One miss cascades.** Packing walks the sections in priority order and, at the first section that
  does not fit, drops every section below it regardless of its own size. 70/03's declared ADR slice
  measures 5,306 chars and is evicted with roughly 4,400 chars of budget still unused. The story it
  belongs to delivered a working capability that reaches no brief on this repo's data.

  **The sections are whole documents.** The reader passes the entire `SPEC.md` — 9,514 chars — as
  the objective, and the entire `STORY.md`, frontmatter and scaffold comments included, as the
  story. A 9,514-char section can never fit under an 8,000-char ceiling, and sitting at priority
  three it takes `tasks`, `fitness` and `dependencies` down with it. That is why **every** refine
  brief in this stream retains the item and the story and nothing else — one un-addressed document
  poisons the four sections beneath it. This cause is the largest of the three and was not recorded
  in the finding; it was found by measuring the reader.

  ADR-009 §3 replaces the prefix cut with strictly bottom-up sacrifice: a section is never dropped
  because a higher-priority one did not fit, and when the condensed set still overflows the
  lowest-priority section goes first. ADR-009 §4 rules that the compiler is handed addressed
  extracts, never documents. ADR-009 §1 leaves the ceiling exactly where ADR-003 put it — the
  measurement says the budget is half-spent, so a larger one would spend none of the extra.

  Scenario: a section that does not fit does not evict the sections below it
    Given a brief in which one section cannot be carried even condensed
    When the brief is compiled
    Then the lower-priority sections that do fit are still carried
    And the brief does not drop them on account of the section above them

  Scenario: sacrifice starts at the lowest declared priority
    Given a set of condensed sections that still exceeds the ceiling
    When the brief sheds what it cannot carry
    Then the lowest-priority section is sacrificed first
    And a higher-priority section is sacrificed only after every lower one has been

  Scenario: a section that cannot be carried at all is unshippable, not sacrificed
    Given a section whose condensed form still exceeds the whole ceiling
    When the brief is compiled
    Then that section is named as unshippable rather than as sacrificed
    And no lower-priority section is given up on its account
    And the notice points at where that section is read in full

  Scenario: the retained sections keep their declared order
    Given a brief that sacrificed at least one section
    When a phase reads the brief
    Then the sections that remain appear in their declared priority order
    And the order does not follow the order they were supplied in

  Scenario: the sections carried are the longest run of the priority order that fits
    Given a story with contracts, architecture and an objective available
    When its build brief is compiled
    Then the sections carried are the highest priorities that fit together
    And a section is sacrificed only while the brief is still over the ceiling
    And an unshippable section does not shorten that run

  Scenario: the ceiling is unchanged by this story
    Given the brief's declared ceiling before this story
    When the ceiling is read after this story
    Then it is the same number
    And it is still enforced inside the compiler
    And no second ceiling literal exists outside it

  Scenario: a milestone objective reaches the brief as its objective, not as its whole spec
    Given a milestone whose specification is many times the ceiling
    When a brief carrying the objective is compiled
    Then the brief carries the specification's objective
    And it does not carry the whole specification document

  Scenario: no document reaches the brief unaddressed
    Given every section the brief can carry
    When each section's value is traced back to what produced it
    Then each is an addressed extract of a document
    And no section carries a document the reader did not address
    And no section carries a record's frontmatter block or its scaffold comments

  Scenario Outline: a section too large is condensed before anything is sacrificed
    Given sections measuring <situation>
    When the brief is compiled
    Then the outcome is <outcome>
    And sections sacrificed are <sacrificed>

    Examples: the packing matrix — a section that cannot fit never takes the ones below it
      | situation                                       | outcome                                           | sacrificed                               |
      | every section within the ceiling whole          | every section carried in full                     | none                                     |
      | one section over on its own, the rest fitting   | that section condensed, the others whole          | none                                     |
      | a mid-priority section too large even condensed | every lower-priority section still carried        | none — that section is unshippable       |
      | the condensed set still over the ceiling        | condensed sections carried up to the ceiling      | the lowest priority first, then the next |
      | every section over the ceiling even condensed   | the item named and a notice, never an empty brief | every section but the item               |
      | only the item available to carry                | the item alone                                    | none, and no notice claiming a loss      |

  Scenario Outline: what the objective and story sections carry
    Given a document of kind <document>
    When it is addressed for the brief
    Then the section carries <carried>

    Examples: addressed extracts — ADR-009 §4, no document reaches a section whole
      | document                  | carried                                                           |
      | a milestone specification | its `## Objective` block, never the whole document                |
      | a story record            | its `## User story` block, then `## Notes` if budget holds        |
      | an architecture record    | the declared ADRs' headings and decisions, not the register whole |
      | a task contract set       | the headlines and tag lines of every contract in the story        |
      | a fitness register        | the register's rows, without the instructional comment            |
      | a document that is absent | no section at all, rather than an empty one                       |
      | a document missing the block | no section, rather than the whole file as a fallback           |
