@executable @cli @work @validate
Feature: The sources on the candidates that come out are exactly the records that went in

  Clustering is a summarising operation, and every summarising operation is under pressure to throw
  something away. The pressure here has a respectable name — a representative sample, a de-duplicated
  set, the clearest statement of a lesson said five times — and giving in to any of them would break
  the one number this milestone is built on. The floor counts distinct source documents behind a
  proposal, so a cluster that kept the best statement of a lesson and discarded the other four would
  leave the floor counting the survivors of a filter rather than the evidence.

  That is why losslessness is a criterion and not a tidiness preference. Two lessons that say the same
  thing are two sources: two authors, or one author on two occasions, each of whom reached the same
  conclusion independently. The whole discipline of this milestone is that a proposal knows how many
  independent times the world told it something, and a de-duplicating cluster is a proposer quietly
  deciding the world only said it once.

  The second half of the criterion is the direction nobody thinks to check. A record must not be
  carried twice either, because a source counted in two places inflates the same number a dropped
  source deflates, and an implementation that resolves a tie by putting a record in both clusters has
  invented evidence rather than lost it. So the sources across the emitted candidates are a partition
  of the records handed in: every record on exactly one candidate, none absorbed into a neighbour and
  none appearing in two places.

  Formation is also not the place where sources become documents. Two lesson sections of one
  retrospective are two records and one document, and collapsing them here would look like helpful
  normalisation while removing the raw material the count downstream is computed from. Formation
  carries records; counting distinct documents is answered where the citations resolve.

  A change that turns this green the wrong way de-duplicates by text, keeps a cluster representative,
  drops a record that matched nothing, or silently skips a record whose meta fields came back empty.
  Each of those looks like a clustering improvement and each of them is a hole in the evidence.

  ADR-013 §1, §1a. ADR-007 §4. ADR-014 §4, §5, §8. FF-6209.

  Scenario Outline: the shapes that tempt an implementation to drop one, and what it does instead
    Given lane records comprising <corpus>
    When candidates are formed from them
    Then the sources across the emitted candidates are exactly those records, none missing
    And <expectation>

    Examples: each row is a record an implementation could plausibly justify discarding
      | corpus                                                                | expectation                                                            |
      | two lesson sections with identical text in two different documents    | both are carried as two sources, neither dropped as a duplicate        |
      | two lesson sections with identical text in one document               | both are carried as two sources, not collapsed into the document       |
      | two lesson sections differing only in a trailing clause               | both are carried, whether or not the criterion puts them together      |
      | a record equally close to two clusters                                | it is carried on exactly one of them, and appears in the union once    |
      | a record close to nothing else in the corpus                          | it is carried on a candidate of its own                                |
      | a lesson section whose Kind, Area, Stage and Owner meta are all empty | it is carried, and is not skipped for having nothing to cluster on     |
      | a run record, which carries no Kind or Area meta at all               | it is carried alongside the lesson sections, by the same rule          |
      | records from every lane 62/00's registry declares                     | every record of every declared lane appears, whichever lanes those are |
      | five lesson sections that state one lesson five times                 | all five are carried as five sources, with no representative chosen    |
      | a record whose text is empty                                          | it is carried, and emptiness is not read as an absence of a record     |

  Scenario: every lane the registry declares reaches formation, and none is handled by name
    Given the lanes 62/00's registry declares, each handing its records over in the common shape
    When candidates are formed from the records of all of them at once
    Then every record of every declared lane is carried
    And a lane added to that registry is carried with nothing written for it here by name
    And no record is refused, skipped or treated differently for the lane it arrived from

  Scenario: a tie is broken by content, never by arrival
    Given a record equally close to two clusters
    When candidates are formed, and formed again from the same records shuffled into another order
    Then the record lands on the same candidate both times
    And the two sets of candidates are byte-identical
    And where the record sat in the input decided nothing about which candidate it landed on

  Scenario: the arithmetic is checked in both directions at once
    Given a corpus of lane records
    When candidates are formed
    Then the sources summed over every candidate equal the number of records handed in
    And the distinct sources across every candidate equal the records handed in
    And the two totals agree, so nothing was dropped and nothing was counted twice

  Scenario: a record is on exactly one candidate
    Given a corpus in which several records are close to more than one cluster
    When candidates are formed
    Then each record handed in appears on exactly one candidate
    And no record appears on two
    And no record is absent from all of them

  Scenario: a cluster names its sources rather than counting them
    Given a candidate formed from five records
    When its sources are read
    Then five sources are present
    And each of them is locatable back to the record it came from
    And none of the five is represented by a count standing in for the others

  Scenario: adding one record adds one source and removes none
    Given a corpus from which candidates have been formed
    When one further record is handed in and candidates are formed again
    Then every record that was carried before is still carried
    And the new record is carried too
    And the sources across the candidates grow by exactly one

  Scenario: two records from one document stay two sources here
    Given two lesson sections of one retrospective, both placed in the same cluster
    When the candidate is read
    Then it carries two sources
    And both name the same document
    And neither is collapsed into the other on the ground that the document is one

  Scenario: losslessness holds when the criterion is at either extreme
    Given a criterion so loose that every record joins one cluster
    When candidates are formed, and formed again under a criterion so tight that none joins
    Then every record handed in is carried in both cases
    And the sources across the candidates are the same set in both cases
