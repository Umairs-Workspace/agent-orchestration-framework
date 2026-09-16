@executable @cli @work @validate
Feature: A cluster of one is a candidate, because the evidence floor is not formation's to apply

  The temptation here is strong and it has arithmetic on its side. A candidate behind a single source
  cannot clear a floor of two distinct documents, so filtering it at formation looks like saving work
  that is going to be thrown away anyway. It is not. The floor is applied where the citations resolve
  and the distinct documents are counted, and a candidate that never arrives there is not refused by
  the floor — it is absent, which is a different fact reported to nobody.

  What that filter would actually remove is a finding. A candidate below the floor appears in the
  report as below the evidence floor, carrying its count and the documents it did cite, because a
  surface that quietly declines work is indistinguishable from one that found none. A formation module
  that dropped its singletons would make that finding unreachable, and the reader would be left unable
  to tell a thin corpus from a shy proposer — which is the exact confusion the whole floor discipline
  exists to prevent.

  There is a second reason, and it is about where the arithmetic actually lives. The floor counts
  distinct source DOCUMENTS, and formation counts RECORDS. Two lesson sections of one retrospective
  are two records and one document, so a cluster of two is below the floor and a cluster of one might
  not be, once an id citation and a path citation into different documents are resolved. Formation
  cannot know which, because knowing requires resolving citations, and that is answered downstream.
  Anything it filtered on would be the wrong number.

  So every cluster is emitted, whatever its size, and a singleton is not a lesser kind of candidate. It
  carries its one source, its citations and its target in exactly the shape a cluster of nine carries
  nine, and the only thing that distinguishes them is how many sources are on them.

  ADR-007 §4. ADR-013 §1, §1a. FF-6209.

  Scenario Outline: whatever the corpus, every cluster is emitted and carries what is behind it
    Given lane records comprising <corpus>
    When candidates are formed
    Then <candidates> are emitted
    And <sources>
    And none is withheld on the ground that too little stands behind it

    Examples: sizes that a floor-aware implementation would be tempted to filter
      | corpus                                                      | candidates                   | sources                                           |
      | one lesson section and nothing else                         | one candidate                | it carries that one source                        |
      | two sections stating one lesson in one document             | one candidate                | it carries two sources, both naming that document |
      | five records the criterion places apart from one another    | five candidates              | each carries exactly one source                   |
      | three records the criterion groups, and two it places alone | three candidates             | they carry three, one and one source              |
      | one run record with no neighbour in the corpus              | one candidate                | it carries that one source                        |
      | a corpus in which every record is placed alone              | as many as there are records | each carries exactly one source                   |
      | no records at all                                           | no candidates                | nothing is reported as declined or withheld       |

  Scenario: a singleton is the same kind of thing as a cluster of nine
    Given a corpus producing one candidate behind one source and one behind nine
    When each is read
    Then both answer the same questions under the same names
    And a reader of one reads the other without asking how many sources it has
    And neither is marked as provisional, weak or pending more evidence

  Scenario: formation declines nothing, so it reports no decision to decline
    Given a corpus in which every candidate is a singleton
    When the result is read
    Then every candidate is present in the set handed on
    And no candidate is reported below the evidence floor
    And no count of candidates withheld appears, because none was

  Scenario: the floor can move without moving what formation emits
    Given a corpus of records producing singletons and larger clusters alike
    When candidates are formed, and the evidence a proposal needs is then changed
    And candidates are formed from the same records again
    Then the candidates are identical in both runs
    And no number governing how much evidence a proposal needs affected either run

  Scenario: a singleton reaches the place that counts documents
    Given a candidate behind a single source
    When the set formation emits is read
    Then that candidate is in it
    And it carries the citations by which its distinct documents will be counted
    And whether it clears the floor is left to be answered where they resolve

  Scenario: singletons and larger clusters are emitted together, in one set
    Given a corpus of many records, some grouped and many alone
    When candidates are formed
    Then the emitted set contains both kinds
    And they are not separated into two sets, two orders or two shapes
    And the sources across the whole set are exactly the records handed in
