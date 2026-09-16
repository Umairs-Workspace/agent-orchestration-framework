@executable @cli @work @validate
Feature: An unresolvable citation moves its proposal out of the emitted set and into findings, once

  There are three things a proposer can do with a claim it cannot substantiate, and only one of them
  is honest. Dropping it silently hides a defect in the proposer behind an output that looks merely
  modest — the run reports fewer proposals and nothing anywhere says why, which is the shape that
  survives longest while measuring nothing. Emitting it anyway puts an unfalsifiable claim in front of
  a reader, who then spends their attention on the one proposal whose evidence cannot be opened. The
  third answer is demotion: the proposal leaves the emitted set and appears in findings, naming the
  citation that failed and why.

  One bad citation is enough, and that is not severity theatre. The claim belongs to the PROPOSAL, not
  to the citation: a proposal resting on four readings, one of which points at nothing, is a proposal
  whose author's reading cannot be reproduced. Demoting it costs a reader nothing — the finding still
  carries the citations that did resolve, so the case is still there to be read — while emitting it
  would spend the surface's credibility on the one claim that is known to be unsupported.

  The third leg is the one a test suite usually misses. A proposal that appears in BOTH places is not
  a harmless duplication: it satisfies "it is in findings" while remaining in front of the reader, so
  a check written only on the finding passes with the defect still shipped. So the two sets are
  asserted DISJOINT, every candidate considered lands in exactly one of them, and the report says how
  many it considered — nothing evaporates between the two numbers.

  A change that turns this green the wrong way stops counting the candidate at all, or reports "a
  citation failed" without naming which one. The second is worse than it looks: a finding that names
  no citation cannot be acted on and cannot be falsified, which is the property the whole story exists
  to give the reader back.

  ADR-006 §3. FF-6204.

  Scenario Outline: whether every citation resolves decides where the candidate lands
    Given a candidate proposal whose provenance is <provenance>
    When the run's proposals are emitted
    Then the candidate is <emitted>
    And in findings it is <reported>

    Examples:
      | provenance                                        | emitted     | reported                                          |
      | four citations, all of which resolve               | emitted     | not reported                                      |
      | four citations, one of which does not resolve      | not emitted | reported once, naming that citation and why       |
      | four citations, none of which resolve              | not emitted | reported once, naming all four and why each failed |
      | one citation, which does not resolve               | not emitted | reported once, naming it and why                  |
      | two citations resolving into two documents         | emitted     | not reported                                      |
      | no citation at all                                 | not emitted | reported once, against the evidence floor rather than against a citation |

  Scenario: the emitted set and the findings share no proposal
    Given a run over candidates of which some carry an unresolvable citation
    When the report is read
    Then no proposal appears in both the emitted set and the findings
    And every candidate the run considered appears in exactly one of them
    And the report states how many candidates it considered

  Scenario: a proposal with three failing citations is one finding, not three
    Given a candidate three of whose citations do not resolve
    When the report is read
    Then the candidate appears in findings exactly once
    And that one finding names all three failures

  Scenario: nothing is silently dropped
    Given a candidate every one of whose citations fails to resolve
    When the report is read
    Then the candidate is still named
    And the run reports no fewer candidates than it considered

  Scenario: the finding names the citation as written and the question it failed
    Given a candidate demoted for a citation that does not resolve
    When the finding is read
    Then it names the proposal
    And it names the failing citation as it was written
    And it says whether the file, the line, the item or the declaration was the part that was absent
    And it is distinguishable from a proposal that was assessed and refused on its merits

  Scenario: a demoted proposal keeps the evidence that did resolve
    Given a candidate demoted for one citation among several
    When the finding is read
    Then it carries the citations that did resolve
    And the reader can open every one of them

  Scenario: repairing the citation restores the proposal with nothing else edited
    Given a candidate demoted because a cited file has no such line
    When the cited file gains that line
    And the run is made again
    Then the same candidate is emitted
    And it no longer appears in findings
    And the only thing that changed is the cited file
