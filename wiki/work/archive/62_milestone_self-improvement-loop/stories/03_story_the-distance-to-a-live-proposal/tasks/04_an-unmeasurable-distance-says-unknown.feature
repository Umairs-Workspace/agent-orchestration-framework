@executable @cli @work @validate
Feature: A distance nobody could measure is reported as unknown, never as a distance of none

  Three states a reader will run together unless the surface holds them apart. Nothing stands in the
  way of this proposal. Several things stand in the way and here they are, counted. And: nobody was
  able to look. The first and the third are opposite answers, and the natural rendering collapses them
  into the same one, because both arrive as an empty list.

  That collapse is the whole hazard. An empty site list reads as no sites; a lane that read nothing
  reads as nothing found; a verdict that never arrived reads as no refusals. Each of those zeros is
  the same lie told by a different input, and each of them puts a proposal in front of an operator
  looking clear when in fact it was never examined. The proposal that has been checked and has nothing
  standing in its way is the rarest and most consequential row on this report; it must not be
  reachable by failing to check.

  The honest third answer is the one this repository already makes elsewhere: a sweep that read
  nothing is a finding rather than a pass, stated with the input that could not be read. So an
  unmeasurable distance says unknown, names the input it could not read, and is never rendered as a
  distance of none — and a distance that was measured and found large keeps its number rather than
  being softened into an unknown.

  Unknown is also not all-or-nothing. One limb measured and one unreadable is a mixed answer, and
  reporting the whole distance either way loses the half that was actually established.

  ADR-001 §3. ADR-007 §3. ADR-013 §4. FF-6206.

  Scenario Outline: the three states, told apart
    Given <situation>
    When the distance is read
    Then it reads as <state>
    And it does not read as <never>

    Examples: the sources of an unmeasurable distance, each with the zero it must not become
      | situation                                                            | state                                             | never              |
      | the acceptor reports the proposal eligible and both limbs are closed | a distance of none                                | unknown            |
      | the acceptor refuses on several counts and both limbs stand          | the things standing in the way, counted and named | a distance of none |
      | the acceptor refuses on one count and no limb stands                 | that one thing, with what would remove it         | a distance of none |
      | the acceptor answered, but its report carried no grounds to read     | unknown, naming the grounds that were absent      | a distance of none |
      | a corpus lane read nothing at all                                    | unknown, naming the lane and the root it walked   | a distance of none |
      | no verdict could be obtained from the acceptor                       | unknown, naming the verdict that was not obtained | a distance of none |
      | the corpus was handed in empty                                       | unknown, stating that nothing was examined        | a distance of none |

  Scenario: none and unknown do not render the same
    Given one proposal with nothing standing in its way
    And one proposal whose distance could not be measured
    When both are read
    Then the two do not render the same
    And neither is rendered as the other

  Scenario: a zero that was measured reads differently from a zero nobody measured
    Given grounds that name no resolution site at all for a knob
    And a report that carried no grounds for that knob at all
    When both readings are read
    Then the first states that the knob was examined and no site was found
    And the second states that nothing could be read for it
    And the two do not render the same

  Scenario: a proposal whose distance is unknown is not reported as ready to commit
    Given a proposal whose distance could not be measured
    When it is read
    Then it is not reported as having nothing standing in its way
    And it is not reported as eligible on the strength of a distance nobody took
    And it is not counted among the proposals whose way is clear

  Scenario: one half unreadable does not make the whole distance unknown
    Given a proposal whose consumer limb was measured and whose corpus lane read nothing
    When the distance is read
    Then it states the measured limb with its own reading
    And it states the other as unknown, naming what could not be read
    And it does not report the whole distance as measured
    And it does not report the whole distance as unknown

  Scenario: an unknown names the input rather than reporting an empty result
    Given a distance reported unknown
    When it is read
    Then it names the input that could not be read
    And it states why that input could not be read
    And it is not rendered as an empty result

  Scenario: a distance that was measured and is large keeps its number
    Given a proposal standing behind several refusals and both limbs
    When the distance is read
    Then it states how many things stand in the way
    And each of them is named
    And none of them is softened into an unknown

  Scenario: an unknown distance is still carried by its proposal
    Given a proposal whose distance could not be measured
    When the emitted set is read
    Then the proposal carries a distance
    And it is not dropped from the emitted set for want of a measurable one

  Scenario: an input that becomes readable turns an unknown into a measurement
    Given a proposal whose distance is unknown because a lane read nothing
    When that lane reads its source and the distance is read again
    Then the distance is stated as measured
    And it is not still stated as unknown
