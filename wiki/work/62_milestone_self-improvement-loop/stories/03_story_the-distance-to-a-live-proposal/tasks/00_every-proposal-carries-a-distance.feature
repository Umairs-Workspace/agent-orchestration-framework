@executable @cli @work @validate
Feature: No proposal is emitted without a statement of what stands between it and a commit

  A milestone whose honest steady state is "not one of these can be committed today" owes the operator
  a precise, falsifiable statement of why — for every proposal, not for the convenient ones. That
  statement is the deliverable. Without it the surface is a shrug with a table attached, and the only
  action it supports is switching it off.

  The failure this prevents is coverage, and it is quiet. A distance computed on the path where a
  refusal already arrived is nearly free, so that is the path an implementation reaches first; the
  eligible proposal, the advisory one and the one whose change could not be computed then carry
  nothing at all. A reader scanning the report learns which proposals the surface happened to be able
  to account for rather than which ones can move, and the proposals that are silent are exactly the
  ones a reader would otherwise assume are clear.

  So the criterion is stated over the whole emitted set rather than over a sample: every proposal
  emitted carries a distance, in either lane and under every verdict, including the verdicts that are
  not refusals at all. An advisory proposal's distance is not a shortage — its class can never reach a
  commit under any future evidence, and the report says that as a standing property. A proposal whose
  change is not computable is still worth reading and still carries a distance; what it may never be
  is silent about why no step is offered.

  A change that turns this green the wrong way narrows the emitted set to the proposals a distance
  could be computed for, or stamps one default phrase on all of them. The first is caught here, by
  counting; the second is caught by the two criteria that follow, which say where each half of a
  distance must come from.

  ADR-001 §3, §4. ADR-003 §2. ADR-004 §2. FF-6206.

  Scenario Outline: both lanes and the full verdict spread, each carrying its own distance
    Given a proposal in the <lane> lane whose verdict is <verdict>
    When the emitted proposal is read
    Then it carries a distance
    And the distance states <statement>

    Examples: the verdicts a proposal can arrive under, and what each one owes a reader
      | lane     | verdict                                                     | statement                                                                      |
      | tunable  | refused by the acceptor on more than one count              | every refusal the acceptor reported, each with what would remove it            |
      | tunable  | refused only as short of the evidence threshold             | the evidence still to accrue, and any prerequisite limb still standing         |
      | tunable  | reported eligible by the acceptor                           | that nothing stands in the way, without a refusal invented to fill the line    |
      | tunable  | no verdict obtained, because the acceptor could not answer  | that the verdict was not obtained, and no verdict reached any other way        |
      | advisory | a model reallocation, which no commit path reaches          | that its class can never reach a commit, as a standing property of the class   |
      | advisory | a prompt revision, whose replacement text is not computable | that standing property, and what makes the change uncomputable                 |
      | advisory | a story-sizing hint, which has no target file at all        | that standing property, and that there is no target for a change to be made to |

  Scenario: the distance is carried by all of them, not by the ones it was cheap for
    Given an emitted set holding proposals in both lanes and across every verdict
    When the emitted set is read
    Then the number of proposals carrying a distance equals the number of proposals emitted
    And no proposal is dropped from the emitted set for want of a distance

  Scenario: a set in which nothing was refused still carries a distance on every proposal
    Given an emitted set in which the acceptor refuses none of the tunable proposals
    When each proposal is read
    Then each one carries a distance
    And none of them is left without one on the grounds that there was no refusal to report

  Scenario: an advisory proposal's distance is permanent, not this quarter's limitation
    Given an advisory-lane proposal
    When its distance is read
    Then it states that no future evidence could make its class committable
    And it is not stated as a shortage of evidence
    And it names no threshold and no count of rulings still to accrue

  Scenario: two proposals refused for different reasons carry different distances
    Given two tunable proposals the acceptor refused on different counts
    When both distances are read
    Then each states its own proposal's reasons
    And neither states the other's

  Scenario: a candidate that never became a proposal is a finding, not a proposal with a distance
    Given a candidate demoted before it reached the emitted set
    When the report is read
    Then the candidate appears as a finding naming why it was demoted
    And it does not appear in the emitted set
    And no distance is stated for it

  Scenario: a proposal whose change cannot be computed still carries a distance
    Given a proposal that offers no change because none is computable for its target
    When it is read
    Then it carries a distance naming what makes the change uncomputable
    And it is emitted rather than withheld
    And it states no step it cannot take
