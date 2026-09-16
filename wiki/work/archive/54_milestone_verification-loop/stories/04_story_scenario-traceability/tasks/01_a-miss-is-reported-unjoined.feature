@executable @cli @work @validate
Feature: A miss is reported unjoined — both legs advisory, both at warn, neither moving a verdict

  A fallback that guesses is worse than a gap. So when the declared join does not resolve, the lane
  says so and stops: a case naming no scenario is **`case-unjoined`**, an `@executable` scenario named
  by no case is **`scenario-unjoined`**, and both are advisory (`ADR-005` §3 — the two members of
  `GRADE_CODES` that never move the verdict, stated apart so neither is mistaken for the other).

  **Both legs report at `warn`, deliberately, and this departs from the horizon's own mapping on
  purpose.** `severityFor` would render an open item's finding at `error`, and measured at refine
  **~75% of this tree's 4,290 `@executable` scenarios would report `scenario-unjoined` on arrival**.
  An `error` would be a wall of inherited red — the pathology chore 64 exists to clean up, and the
  one `70/ADR-007` refuses by name. The severity is therefore fixed at `warn` on open and `done` items
  alike, which is the honest reading of an advisory lane: it is a gap being surfaced, not a rule being
  broken.

  **These codes are structurally incapable of gating, and that is worth asserting rather than
  trusting.** The loop's doctor rung admits a set *derived by filter from* `CONTROL_FINDING_CODES`
  (54/02) — a different frozen array from this lane's — so no future severity change here can leak
  into the loop's gate.

  The loop does not need this join to re-drive: what re-drives a maker is *which cases failed and
  what they said*, strictly more actionable than a scenario name. That is why this lane is advisory,
  and why it can land before the runner does.

  ADR-006 §4, §5; ADR-005 §3; `66/ADR-002`'s horizon, departed from and said so.

  Scenario: a case naming no scenario is reported unjoined
    Given an item in scope declaring one `@executable` scenario
    And a report enumerating a case whose name contains no scenario name from that item
    When the traceability lane runs
    Then the lane reports `case-unjoined` for that case
    And the finding names the case as the runner emitted it
    And nothing was guessed about which scenario it might have meant

  Scenario: a scenario named by no case is reported unjoined
    Given an item in scope declaring two `@executable` scenarios
    And a report enumerating one case naming only the first
    When the traceability lane runs
    Then the lane reports `scenario-unjoined` for the second scenario
    And the finding names the scenario and the file that declares it

  Scenario Outline: both legs report at warn, on open and closed items alike
    Given an item whose status is <status>
    And a traceability miss of kind <code>
    When the traceability lane runs
    Then the finding's severity reads `warn`

    Examples: the severity does not move with the horizon
      | status      | code              |
      | not-started | scenario-unjoined |
      | in-progress | scenario-unjoined |
      | done        | scenario-unjoined |
      | not-started | case-unjoined     |
      | in-progress | case-unjoined     |
      | done        | case-unjoined     |

  Scenario: an advisory miss never moves a grade's verdict
    Given a report whose every enumerated case passed
    And a case among them that joins no scenario
    When the grade is compiled
    Then its `verdict` reads `pass`
    And the advisory code is reported beside it
    And the verdict was not changed by the advisory code

  Scenario: an advisory miss never gates the loop
    Given a story carrying both a `case-unjoined` and a `scenario-unjoined` finding
    And no other doctor finding on that story
    When the loop reaches its doctor rung
    Then the gate admits nothing
    And the loop proceeds to the next rung
    And the admitted set is derived from a different frozen array than this lane's codes

  Scenario: a complete join reports neither code
    Given an item in scope whose every `@executable` scenario is named by a case
    And a report whose every case names one of them
    When the traceability lane runs
    Then the lane reports nothing
    And the silence means the join resolved, not that the lane was skipped

  Scenario: an item with no `@executable` scenario reports no scenario miss
    Given an item in scope whose scenarios are all `@manual`
    And a report enumerating one case naming none of them
    When the traceability lane runs
    Then no `scenario-unjoined` finding is reported
    And the case is still reported `case-unjoined`
