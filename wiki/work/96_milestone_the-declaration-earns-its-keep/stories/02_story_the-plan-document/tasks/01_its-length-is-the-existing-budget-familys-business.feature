@executable @cli @work @validate
Feature: The plan's length is governed by the budget family that already exists, with no new check, code or severity

  Milestone 16 already shipped exactly the mechanism this document needs. `BUDGET_KEY` maps a
  filename to a kind, `DEFAULT_BUDGETS` holds the numbers in one place — *"these numbers live ONLY
  here"* — `budgetsFromConfig` resolves `work.doctor.budgets` over them leaving unset kinds on their
  defaults, and `doc-over-budget` fires once per over-budget artifact at **warn** on a stream sweep,
  becoming a **refusal** only in the accepting item's scoped preflight. A document at its budget is
  healthy; the convention is strictly-greater.

  So `PLAN.md` joins that family: one row, one key, one resolver entry. What it must not do is arrive
  with a check of its own. A second length rule would be a second authority over the same question,
  and the first thing that happens to two authorities is that one of them is updated.

  The refine-time stop was considered and refused. A stop authored and evaluated by the same agent is
  precisely what story 04 of this milestone argues is not a gate; shipping one here would be arguing
  both sides of one question in one milestone. The existing ladder already has the right shape, and it
  already has a human at the end of it.

  The number is a default and is calibrated the way the family's others were — advisory guidance
  tighter than the hard warning, mirroring the `feature` kind's ~150-against-300. `plan: 80` lines
  with template guidance at ≈60. It is a default rather than a measurement because no plan document
  exists yet to measure, and when a distribution exists the repair is one line in `DEFAULT_BUDGETS`.

  What would quietly undo this: a length literal at a comparison site rather than in the defaults; a
  new finding code for an over-long plan; and a project setting `plan` in config that is silently
  ignored because the resolver was never taught the key.

  ADR-006 §1, §2, §3. FF-9603.

  Scenario: an over-long plan fires the existing finding at warn
    Given a story carrying a plan document longer than the resolved plan budget
    When the doctor sweeps the stream
    Then one `doc-over-budget` finding is returned for that document
    And its severity is warn
    And it names the measured line count and the budget

  Scenario: a plan at its budget is healthy
    Given a story carrying a plan document exactly as long as the resolved plan budget
    When the doctor sweeps the stream
    Then no finding is returned for that document

  Scenario: an over-long plan refuses acceptance in the accepting item's scoped preflight
    Given a story carrying a plan document longer than the resolved plan budget
    When the accepting item's scoped preflight runs for that item
    Then the finding refuses the acceptance
    And the same finding on a stream sweep does not

  Scenario Outline: the budget resolves from config over the documented default
    Given `work.doctor.budgets.plan` is <configured>
    When the budgets are resolved
    Then the plan budget is <resolved>

    Examples: the family's own robustness, applied to a new key
      | configured        | resolved            |
      | absent            | the documented default |
      | 120               | 120                 |
      | zero              | the documented default |
      | a negative number | the documented default |
      | a string          | the documented default |
      | null              | the documented default |

  Scenario: a partially-set budgets object leaves the other kinds alone
    Given `work.doctor.budgets` setting only `plan`
    When the budgets are resolved
    Then the plan budget is the configured value
    And every other kind is its documented default

  Scenario: the number lives in the defaults and nowhere else
    Given the budget group and its resolver
    When they are examined
    Then the plan budget number appears only among the documented defaults
    And no comparison site holds it as a literal

  Scenario: no new finding code and no new severity arrive with the plan kind
    Given the finding codes and severities this milestone introduces
    When they are compared with those in service before it
    Then the doc-budget vocabulary is unchanged
    And the plan kind fires the existing code

  Scenario: a story with no plan document is silent, not short
    Given a story carrying no plan document
    When the doctor sweeps the stream
    Then no plan finding is returned for it
