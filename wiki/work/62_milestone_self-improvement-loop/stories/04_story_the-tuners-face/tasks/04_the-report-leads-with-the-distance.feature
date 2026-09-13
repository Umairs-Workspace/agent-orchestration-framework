@executable @cli @work @validate
Feature: The report leads with what stands between a commit and these proposals, and each carries one

  The honest steady state of this command is that nothing can be committed today, and the whole
  difference between a discipline and an off switch is in how that sentence is delivered. "No proposal
  can commit" is a shrug an operator can do nothing with. "This knob has nothing executed reading its
  resolved value, and a consumer at a decision site would remove that" is a work item they can
  schedule this week.

  So the distance leads. It is the first thing the report says and the proposal list follows it,
  because a reader who stops after one line should still leave holding the thing that has to change.
  A report that buries it under the proposals has inverted its own product: the proposals are the
  evidence, and what stands in their way is the finding.

  Every proposal carries one, whichever lane it is in and whatever its verdict — including the ones
  the acceptor found eligible and the ones whose class can never commit at all. A proposal with no
  distance is a claim with no work attached to it, and it is exactly the row a reader skips.

  It is computed, never phrased. A distance that reads the same over two different trees is a sentence
  somebody wrote once; a distance that disappears when its obstacle is removed is a measurement. The
  change that turns this file green the wrong way is a constant string in the shape of a diagnosis,
  and it is indistinguishable from the real thing on any single run.

  Something holding back the whole set is said once, as a fact about the run. Repeated down every
  line it reads as many small obstacles rather than one large one, and a reader who schedules from
  that list schedules the wrong work.

  One claim here cannot be made over a fixture, and it is the one that decides whether the milestone
  was worth building. Run over this repository's own corpus — 392 lesson sections across 63
  retrospectives, 61 run records, 8 observation snapshots — the command must emit at least one
  proposal, fill both lanes, cite two distinct resolving documents behind each, and carry a distance
  on every one. A proposer that finds nothing to say about that much material is the vacuous control
  this milestone exists not to be, and a green suite over invented input says nothing about it: a
  fixture proves the shape of the answer, and only the real corpus proves there is one. In the last
  block below a fixture is not a fair stand-in — it is the failure being checked for.

  ADR-001 §3, §4, §5. ADR-007 §3, §4. ADR-013 §7. FF-6206, FF-6208.

  Scenario: the distance leads and the proposals follow
    Given a tune report carrying proposals
    When it is read from the top
    Then the first thing it states is what stands between these proposals and a commit
    And the proposal list follows that statement
    And nothing stands ahead of it that a reader could mistake for the answer

  Scenario: the machine-readable rendering carries the same headline, as one statement
    Given a tune report carrying proposals
    When it is rendered machine-readably
    Then the headline is present as one statement about the run
    And it is not something a reader has to assemble from the proposal list

  Scenario Outline: no proposal is rendered without a distance
    Given a report carrying <proposal>
    When its line is read
    Then it states what stands between it and a commit
    And that statement is <distance>

    Examples: every lane, every verdict — including the eligible and the never-eligible
      | proposal                                                     | distance                                                             |
      | a tunable proposal the acceptor refused for want of evidence | the rulings still to accrue, as the acceptor stated them             |
      | a tunable proposal on a knob nothing executed reads          | a consumer reading the resolved value at a decision site             |
      | a tunable proposal whose metric no series can measure        | an instrument writing the series its metric reads                    |
      | a tunable proposal whose key resolves to more than one bound | that the key must stop being two bounds, which is other work         |
      | a tunable proposal the acceptor reported as eligible         | that nothing stands there but an explicit commit on the acceptor     |
      | a tunable proposal for which no verdict could be obtained    | that no verdict could be obtained, and what would obtain one         |
      | an advisory model reallocation                               | that the class can never commit, and the human diff that applies it  |
      | an advisory prompt revision carrying no computable patch     | that no complete change is computable here, and what makes it so     |
      | an advisory story-sizing hint                                | that nothing consumes it, so it is addressed to a reader             |

  Scenario: one thing holding back every proposal is said once
    Given a report every one of whose proposals is held back by the same single thing
    When the report is read
    Then the headline names that thing once, and how many proposals stand behind it
    And it names what would remove it once
    And no proposal's line presents it as an obstacle particular to that proposal

  Scenario: a mixed set is not collapsed into a summary that names nothing
    Given a report whose proposals are held back by several different things
    When the headline is read
    Then every distinct one of them appears, with the number of proposals behind it
    And each carries what would remove it
    And no proposal stands behind an obstacle the headline does not name

  Scenario Outline: a run that formed no proposal says what it read and what stopped one
    Given a tune run that formed no proposal because <cause>
    When the report is read
    Then the headline states what each corpus lane read, against the floor it was measured against
    And it states <stated>
    And it does not read as though there were nothing here worth improving

    Examples: "no proposals" and "no input" are opposite states and may not share a sentence
      | cause                                                        | stated                                                            |
      | a lane read below its floor                                  | the lane, the root it walked and the floor it missed              |
      | every candidate cited fewer than two distinct documents      | each candidate and the count it fell short by                     |
      | every candidate carried a citation that did not resolve      | each failing citation and the candidate it demoted                |
      | the scope matched no item of the stream                      | the reference asked for, and that nothing on the stream carries it |
      | every lane read well above its floor and nothing clustered   | what was read, and that the material carried nothing to propose against |

  Scenario: the distance is measured over the tree it was taken on
    Given two work trees whose obstacles differ
    When a report is taken over each
    Then each headline names the obstacles its own tree carries
    And neither names an obstacle its tree does not carry

  Scenario: an obstacle that is removed leaves the report
    Given a report whose headline names a knob nothing executed reads
    When something executed begins reading that knob's resolved value at a decision site
    And the report is produced again
    Then the headline no longer names that obstacle
    And the obstacles it still names are unchanged
    And no message here was edited to make that happen

  Scenario: an obstacle nobody can measure says so, and is never reported as none
    Given an obstacle whose removal cannot be computed
    When the headline is read
    Then it states that obstacle as not measurable
    And it does not state a distance of zero for it
    And it does not omit it

  Scenario: a report that can commit nothing today still leaves a reader with work
    Given a report in which not one proposal can be committed
    When it is read
    Then it names, for each proposal, the thing that would have to change
    And each of those names the change and where it would have to be made
    And the report does not state that there is nothing to be done

  Scenario Outline: over this repository's own corpus, the command has something real to say
    Given the tuner run unscoped over this repository's own work stream
    When the report is read
    Then <claim>

    Examples: the acceptance condition this milestone may not be accepted without — read over the real corpus
      | claim                                                                        |
      | at least one proposal is emitted                                             |
      | at least one emitted proposal is in the tunable lane                         |
      | at least one emitted proposal is in the advisory lane                        |
      | every emitted proposal cites at least two distinct source documents          |
      | every citation on every emitted proposal resolves to a target that exists    |
      | every emitted proposal states what stands between it and a commit            |
      | at least one prerequisite limb stands between this corpus and a live proposal |

  Scenario: over this corpus, "nothing to propose" is a defect rather than a clean bill of health
    Given the tuner run unscoped over this repository's own work stream
    When the report emits no proposal at all
    Then the material it read is stated lane by lane against each floor
    And what stopped every candidate is stated by name
    And the report does not present that run as a healthy harness with nothing to improve
