@executable @cli @work @validate
Feature: Every lane states the root it walked, the count it found, and the floor it was measured against

  An analysis pass whose input is empty reports "nothing to propose" in precisely the words it would
  use if the harness were already perfect, and those two states are the opposite of one another.
  Nothing else this milestone emits can be believed until they are told apart, and only one thing
  tells them apart: the pass saying out loud what it read before it says what it found.

  So a count is not a result here — a count beside its floor is. Three lanes are walked in every run:
  the lesson sections of the retrospectives in scope, the run records of the items in scope, and the
  observability snapshot series. Each comes back naming the root it walked, the size of the population
  it found there, and the floor that population was measured against. A reader shown 61 against a
  floor of 30 can make the comparison themselves; a reader shown "healthy" has been handed the verdict
  and asked to trust arithmetic they were not shown.

  The floor is the half that is easy to lose, which is why a lane declaring none is refused rather
  than run. A defaulted floor would make "found nothing" and "looked at nothing" indistinguishable in
  every lane at once — and this repository has already had a renamed fixture root turn a probe into a
  comparison of nothing with nothing, which passed. A change that turns this green by supplying a
  floor where a lane forgot to declare one has removed the control and left its report standing.

  The record is owed on a healthy run too. A lane says what it read when it read plenty, because the
  run where a reader most needs to know what was walked is the clean one.

  ADR-007 §1, §2. ADR-012 §2. ADR-001 §5. FF-6205.

  Scenario Outline: every lane declares the same three things about itself
    Given a corpus assembled over the work stream
    When the <lane> lane's record is read
    Then it names the root it walked, which is where <root> are found
    And it states how many <population> it counted there
    And it states the floor that count was measured against

    Examples: the three lanes, and there are three of them in every run
      | lane         | root                                      | population                   |
      | lessons      | the retrospectives of the items in scope  | lesson sections              |
      | lineage      | the run records of the items in scope     | run records                  |
      | observations | the snapshot series of the items in scope | readings taken from them     |

  Scenario: all three lanes are present in one run, whatever any of them found
    Given a corpus assembled over the work stream
    When the run is read
    Then all three lanes appear in it
    And no lane is omitted for having found little or nothing

  Scenario: the count is shown next to its floor, not behind a verdict
    Given a lane whose count is comfortably above its floor
    When the run is read as an emitted object and again as a rendered report
    Then both faces carry the count and the floor it was measured against
    And neither reduces the pair to the verdict it implies

  Scenario Outline: a lane that does not declare what it reads is refused before anything is counted
    Given a lane declared with <omission>
    When the corpus is assembled
    Then the run is refused, naming that lane
    And no report is produced that states a count without a floor

    Examples: the declaration is complete by construction, or there is no run
      | omission                                                  |
      | no floor at all                                           |
      | a floor of zero                                           |
      | a negative floor                                          |
      | no root, so a finding could not say what it walked        |
      | no description of the population it reads                 |
      | no statement of what kind of claim its reading is         |

  Scenario: a lane added later inherits the obligation with nothing written for it by name
    Given a fourth lane added to the corpus and declared without a floor
    When the corpus is assembled
    Then the run is refused for the same reason and in the same words as any other lane
    And nothing had to be written for that lane by name to make it so

  Scenario: one record shape, so a reader of one lane can read all three
    Given the records of all three lanes in a single run
    When each of them is read
    Then each answers the same questions under the same names
    And a face that renders one lane's record renders every lane's without asking which lane wrote it

  Scenario: the record is stated on a lane that read plenty
    Given a lane whose count is many times its floor
    When its record is read
    Then it still names the root it walked and the floor it was measured against
    And the record is not reserved for lanes that came back unhappy
