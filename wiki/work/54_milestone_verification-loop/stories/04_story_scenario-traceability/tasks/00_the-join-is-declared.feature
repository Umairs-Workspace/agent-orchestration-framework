@executable @cli @work @validate
Feature: The join is declared — a case names its scenario, and aof asserts exactly that

  **There is no join key both sides already carry, and the measurement is the decision.** Across 719
  `.feature` files this tree holds **4,744 distinct scenario names**; across `test/` and `test/arch/`
  it declares **5,725 test names**. Of those, **0** are exactly equal to a scenario name and **1,203**
  contain one longer than 25 characters — so an exact-name join resolves nothing and a containment
  join roughly a quarter. The `.feature`-to-test references that do exist (178 files naming a
  `test/…` path) are all **in comments**: prose, not a join. And the id namespace that could carry a
  scenario id is closed — `ID_FORMS` in `src/declared-id.mjs` is five members pinned by set-equality,
  and `validateWork`'s tag check would reject a new scenario tag as *"unknown tag (outside the closed
  vocabulary)"*.

  That is exactly the situation `68/ADR-005` legislates for: join on a key both sides hold, and
  report an unattributable result as unattributed. So the join is **declared, not inferred**. aof
  asserts one thing and one thing only:

  > an emitted case's name **contains** an `@executable` scenario name from the item in scope.

  QA makes it true by naming the case after the scenario. This is `66/ADR-004`'s leg B one level
  down — *a runner names the cited file's basename* — an instrument already CI-pinned in this
  repository. It is **not a classifier**: it never decides what a result *means*; the meaning is the
  status the runner emitted (`ADR-006` §1).

  **Two shapes the ADR leaves open are ruled here rather than in the ADR** — 54/00's and 54/01's
  precedent, applied a third time. **(1) No minimum name length is invented.** The 25-character
  figure above was a *measurement filter*, not a rule; inventing a threshold would make the join's
  answer depend on a constant nobody declared. **(2) Containment is many-to-many, and a case
  containing two scenario names joins both.** Neither is an ambiguity, neither is a miss, and no
  tenth code is coined — a scenario name that is a substring of another's is a naming fact about the
  contract, reported by joining both rather than by guessing which was meant.

  `src/feature-parse.mjs` is the ONE feature parser (`66/ADR-003`); it is **read and not edited**,
  and no second parser is written.

  ADR-006 §1, §2, §3; `68/ADR-005`; `66/ADR-004` leg B.

  Scenario: a case named after its scenario joins it
    Given an item in scope declaring an `@executable` scenario named `the declared floor is the primary defence`
    And a report enumerating a case named `work-grade: the declared floor is the primary defence`
    When the traceability lane runs
    Then the case is joined to that scenario
    And the lane reports no miss for either side

  Scenario: the assertion is containment, and nothing weaker
    Given an item in scope declaring an `@executable` scenario named `the ratchet is the backstop`
    And a report enumerating a case named `the ratchet is a backstop`
    When the traceability lane runs
    Then the case is not joined to that scenario
    And nothing was inferred from the near-match

  Scenario: aof never decides what a result means
    Given a joined case whose emitted status is a failing one
    When the traceability lane runs
    Then the lane reports the join and the status the runner emitted
    And the lane forms no opinion about whether the failure is acceptable
    And no status was derived from the case's free text

  Scenario: only `@executable` scenarios take part in the join
    Given an item in scope declaring one `@executable`, one `@manual` and one `@uat` scenario
    And a report enumerating a case named after the `@manual` scenario
    When the traceability lane runs
    Then only the `@executable` scenario is offered to the join
    And the `@manual` and `@uat` scenarios are neither joined nor reported unjoined

  Scenario: no minimum name length is invented
    Given an item in scope declaring an `@executable` scenario named `the cap binds`
    And a report enumerating a case named `loop: the cap binds`
    When the traceability lane runs
    Then the case is joined to that scenario
    And the join applied no length threshold

  Scenario: a case containing two scenario names joins both
    Given an item in scope declaring `@executable` scenarios named `the pool gets its caller` and `the pool gets its caller under load`
    And a report enumerating one case named `the pool gets its caller under load`
    When the traceability lane runs
    Then the case is joined to both scenarios
    And neither scenario is reported unjoined
    And the case is not reported unjoined
    And no ambiguity code was coined

  Scenario: the scenarios come from the one feature parser
    Given an item in scope whose feature files carry tags on the feature line and on individual scenarios
    When the traceability lane resolves the item's `@executable` scenarios
    Then it reads them through the repository's single feature parser
    And a scenario inheriting `@executable` from its feature line is included
    And no second parser was written

  Scenario: the join is scoped to the item under examination
    Given two items each declaring an `@executable` scenario of the same name
    And a report enumerating one case naming that scenario
    When the traceability lane runs for the first item
    Then the join considers only the first item's scenarios
    And the second item's identically named scenario is not consulted
