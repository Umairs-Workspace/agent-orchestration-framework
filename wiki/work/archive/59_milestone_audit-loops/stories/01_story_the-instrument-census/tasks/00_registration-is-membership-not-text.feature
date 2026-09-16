@executable @cli @work @validate
Feature: A gate is registered when the runner assembled it, not when the runner's source mentions it

  The question "is this fitness function actually wired into CI?" has had a wrong answer in this
  repository for a month. The gate that asks it searches the runner's source text for the suite's
  filename — so an import with no spread satisfies it perfectly, and twenty-six suites carrying a
  hundred and seventeen test entries went dark in one commit while still looking registered.

  The right answer is the one the runner itself would give: ask what it assembled. A suite is
  registered when the tests it exports are members of the array CI will execute, and unregistered
  otherwise — regardless of what the runner's source text happens to contain.

  This is deliberately not fixed by adding a spread check. A spread check is one more claim about
  text, and a commented-out spread would satisfy it exactly as a commented-out import satisfied the
  lane it replaces.

  ADR-003 §2, §4. FF-5903.

  Scenario: a suite whose tests are in the assembled suite is registered
    Given a test suite on disk whose tests the runner assembles
    When registration is decided
    Then the suite is reported as registered

  Scenario: a suite that is imported and never spread is not registered
    Given a test suite the runner imports and never adds to what it assembles
    When registration is decided
    Then the suite is reported as unregistered
    And it is named, so the report says which one

  Scenario: the same suite is registered by the source-text rule and unregistered by this one
    Given a test suite the runner imports and never adds to what it assembles
    When the retired source-text rule and the assembled-suite rule are both applied
    Then the source-text rule reports it as registered
    And the assembled-suite rule reports it as unregistered
    And the assembled-suite rule is the one that decides

  Scenario: a spread that exists only inside a comment does not register anything
    Given a test suite whose only mention in the runner is inside a comment
    When registration is decided
    Then the suite is reported as unregistered

  Scenario: a suite no runner mentions at all is unregistered
    Given a test suite on disk that neither runner imports
    When registration is decided
    Then the suite is reported as unregistered

  Scenario Outline: every directory a runner may draw from is walked
    Given a test suite on disk under <directory>
    When the census walks the test tree
    Then that suite is part of the population it considered

    Examples:
      | directory        |
      | the test root    |
      | the arch tree    |
      | the integration tree |

  Scenario: a suite that is deliberately unregistered is carried with its reason
    Given a suite recorded in the shrink-only baseline with its reason and its origin
    When registration is decided
    Then it is not reported as a new failure
    And it is still reported as unregistered

  Scenario: the baseline may only shrink
    Given a suite that is unregistered and is not in the shrink-only baseline
    When registration is decided
    Then the census fails rather than absorbing it
    And the message says that the list is shrink-only and what would have to change

  Scenario: a baseline entry naming a suite that no longer exists is itself a failure
    Given a baseline entry naming a suite that is not on disk
    When registration is decided
    Then the stale entry is reported by name
    And a permission with no subject is refused rather than kept
