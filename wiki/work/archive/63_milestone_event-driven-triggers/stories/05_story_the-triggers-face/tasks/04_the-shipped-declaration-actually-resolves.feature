@executable @cli @work @validate
Feature: Run over this repository's own declaration, the face resolves something, and names whatever it could not

  A trigger vocabulary with no member that resolves is a declaration nobody can act on. It passes every
  test written over a fixture, reads as armed to anyone who opens it, and wakes nothing — which is the
  species this repository indicts by name everywhere else, arriving in the one milestone whose whole
  subject is waking something. So the claim is made over the file this repository actually ships and
  installs, with this workspace's real readings, and green tests over planted declarations do not
  discharge it.

  What the run has to show is small and exact. Every source the vocabulary declares has at least one
  declared trigger, and at least one of those resolves to a well-formed loop input. Every declared
  trigger either resolves or refuses, and none does neither. Every resolved scope is one the loop's own
  scope forms admit, and every resolved argv names a command the registry answers for. Anything else is
  the shipped declaration being decorative.

  The report is read at accept by someone deciding whether the milestone did anything, so each gap
  names what was missing rather than contributing to a count. A count is the shape that fails this: "3
  of 4 sources resolve" tells a reader nothing about which one to go and fix, and a figure stored as
  the expected answer goes stale on the next edit to the very file the run reads — leaving a control
  that fails for a reason unrelated to what it was written to catch.

  The way a wrong implementation passes here is by being satisfied with arithmetic. A declaration
  carrying one member per source, all of which refuse, satisfies "every source is declared" and wakes
  nothing. A report that states how many triggers were read and never states whether any of them
  resolved is the same failure in a friendlier format. What settles it is a named resolution: this
  trigger, this scope, this level, this argv.

  ADR-001 §4. ADR-003 §1. ADR-002 §1. FF-6308.

  Scenario: the declaration this repository ships resolves something
    Given this repository's own trigger declaration
    When the face is run over it with no trigger named
    Then at least one declared trigger resolves
    And the answer names that trigger, its scope, its level and its argv
    And the run exits successfully

  Scenario: every declared source has a trigger that resolves
    Given this repository's own trigger declaration
    When the answer is read
    Then every source the vocabulary declares has at least one declared trigger
    And at least one trigger under each source resolves
    And each of those resolutions is named with the source it was declared under

  Scenario Outline: what every resolved trigger over the shipped declaration carries
    Given a trigger that resolves over this repository's own declaration
    When its resolution is read
    Then <property>

    Examples: well-formed means the loop could be run from it as it stands
      | property                                                              |
      | its scope is one the loop's own scope forms admit                     |
      | its argv begins with the loop's own route                             |
      | the command its argv names is one the registry answers for            |
      | its level is one the loop's own level vocabulary carries              |
      | its level is one this workspace's gate would not refuse               |
      | it carries no admission that the run may proceed                      |

  Scenario: every declared trigger either resolves or refuses
    Given this repository's own trigger declaration
    When the answer is read
    Then every declared trigger appears in it
    And each one is either a resolution or a refusal carrying a code
    And none of them is reported as neither
    And every refusal for a declared level names the failing half of its gate

  Scenario Outline: a gap is named, never counted
    Given a declaration in which <gap>
    When the answer is read
    Then it names <named>
    And it states no figure in place of that name

    Examples: the report is read by someone deciding what to go and fix
      | gap                                                       | named                                                    |
      | a declared source has no declared trigger                 | that source, by name                                     |
      | a declared source's triggers all refuse                   | that source, and each of its triggers with its code      |
      | a declared trigger neither resolves nor refuses           | that trigger, by id                                      |
      | a resolved trigger's scope matches no admitted form       | that trigger, its scope, and the forms that are admitted |
      | a resolved trigger's argv names an unregistered command   | that trigger, and the command its argv names             |
      | a refusal carries no code                                 | that trigger, and that its refusal named no code         |

  Scenario: the answer names the declaration it read
    Given a run over this repository's own trigger declaration
    When the answer is read
    Then it names the declaration it read
    And what it read is the installed declaration a consumer of this tool would get
    And nothing in the answer was taken from a planted or example declaration

  Scenario: nothing in the answer has to be updated when the declaration grows
    Given this repository's own trigger declaration carrying one more trigger than it did
    When the answer is read
    Then that trigger is named among what was read
    And it appears as a resolution or as a refusal carrying a code
    And no statement in the answer contradicts the declaration having grown
    And no expected figure had to be changed for the answer to be right

  Scenario: a declaration that resolves nothing is legible as exactly that
    Given a declaration whose every declared trigger refuses
    When the answer is read
    Then it states that no declared trigger resolves
    And it names each source for which nothing resolved
    And it names the refusal code standing in the way of each
    And the sentence it produces is not one a declaration that resolves would also produce
