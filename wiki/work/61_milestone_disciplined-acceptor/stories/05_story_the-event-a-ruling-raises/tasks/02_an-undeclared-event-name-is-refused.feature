@executable @cli @work @work-stream
Feature: A name the vocabulary does not declare is refused, not quietly owed to nobody

  The vocabulary of events says of itself that a name it does not declare is refused. It is not. A
  misspelled name is accepted, recorded, and resolves to no consequence at all — the fact is filed and
  the thing that was supposed to happen because of it is owed to nobody. Nothing fails, nothing warns,
  and the seam that raised it gets back exactly what a correctly spelled event with nothing to do
  would give it. This task makes the claim true.

  The distinction that must survive the fix is the one the silent hole destroys: "no consequence
  applies here" and "nobody knows that name" are different answers. A workspace with no external
  integration configured genuinely owes nothing for an event that only that integration reacts to,
  and that must stay a clean resolution rather than becoming an error. A typo owes nothing for a
  different reason, and must be refused with a code its caller can act on.

  Where the refusal lives is the other thing worth arguing about. It belongs with the vocabulary,
  which is the one place that knows what a name means, and not in the storage underneath it. Storage
  that learned the vocabulary in order to police it would invert the layering this whole family is
  built on, and the fix would cost more than the hole.

  ADR-007 §4. FF-6108.

  Scenario: the misspelling that motivated this is refused
    Given a seam raising an event whose name is a declared name with one letter wrong
    When the consequences owed are resolved
    Then it is refused as undeclared
    And the refusal names the name it was given
    And nothing is recorded under that name

  Scenario: a refusal leaves nothing behind
    Given a seam raising an undeclared name
    When it is refused
    Then no event was stored
    And no consequence is left owed to anyone

  Scenario: an undeclared name is told apart from a declared one with nothing to do
    Given a declared event none of whose consequences apply to this workspace
    When the consequences owed are resolved
    Then it resolves to no consequence
    And it is not refused
    And the event is recorded as it always was

  Scenario Outline: the names a seam may raise, and the ones it may not
    Given a seam raising <offered>
    When the consequences owed are resolved
    Then <outcome>

    Examples: near-misses are not names — every one of these appended silently before this task
      | offered                                            | outcome                                |
      | a name the vocabulary declares                     | its declared consequences are owed      |
      | the ruling name this story adds                    | its one consequence is owed             |
      | a declared name with one letter wrong              | it is refused as undeclared             |
      | a declared name in the wrong case                  | it is refused as undeclared             |
      | a declared name with whitespace around it          | it is refused as undeclared             |
      | a name a past version declared and no longer does  | it is refused as undeclared             |
      | a name that is the empty string                    | it is refused                           |
      | a name that is not text at all                     | it is refused                           |

  Scenario: the refusal is coded rather than a message to read
    Given a seam raising an undeclared name
    When the refusal reaches the caller
    Then it carries a code the caller can branch on
    And it is distinguishable from a failure to store the event

  Scenario: every seam already in service keeps working
    Given each seam that raises an event today
    When each raises the name it has always raised
    Then none of them is refused
    And each is owed the consequences it was owed before

  Scenario: the refusal comes before anything is stored
    Given a seam raising an undeclared name
    When the raise is attempted
    Then the storage holds no event under that name
    And no partially owed consequence is left for a later pass to find
