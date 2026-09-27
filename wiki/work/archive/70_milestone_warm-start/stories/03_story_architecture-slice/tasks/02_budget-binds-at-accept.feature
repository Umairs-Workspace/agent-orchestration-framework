@executable @cli @work @work-stream
Feature: The artifact budget binds at accept, on the item being accepted

  `DEFAULT_BUDGETS = { spec: 300, architecture: 700, story: 150, feature: 300 }`
  (`src/work-doctor.mjs:590`), and `doc-over-budget` fires at **`warn`**
  (`src/work-doctor-budget.mjs`). A budget nothing enforces is a budget that has already been
  exceeded: measured across this stream, **15 milestones exceed 700 lines**, the worst at **3,975**,
  then 2,922, 2,552, 2,232, 2,103 and 2,016.

  **It cannot bind retroactively.** Failing the stream-wide sweep turns 15 `done` milestones red at
  once — chore 64's exact pathology, whose own record names the cost: *a genuinely new red hides in
  a suite that is already expected to be red, which is how three of seven survived a whole milestone
  unnoticed.* The mechanism that would normally absorb this is milestone 55's frozen set; 55 is
  `not-started` and no frozen-set machinery exists in `src/**`, so a design leaning on it would be
  leaning on nothing.

  So it binds where it can still be acted on: **the accepting item's own gate**. This is 68's
  `pending` posture applied to bloat rather than to controls — admitted while open, refused at
  accept — through the reporting surface that already exists (`aof work doctor <ref>` scoped to one
  item) rather than a second one. Items already `done` are never re-accepted, so nothing is
  re-litigated and no baseline file is needed.

  ADR-007. This milestone's own `ARCHITECTURE.md` is written to the rule it sets.

  Scenario: an item within its budgets can be accepted
    Given an item whose artifacts are all within their budgets
    When it is checked for acceptance
    Then no budget refusal is raised

  Scenario: an over-budget item is refused at accept
    Given an item whose architecture document exceeds its budget
    When it is checked for acceptance
    Then acceptance is refused
    And the refusal names the artifact, its measured size and its budget

  Scenario: an open item is warned, not blocked
    Given an item still open whose architecture document exceeds its budget
    When the item is checked
    Then the over-budget artifact is reported at warning severity
    And the item is not refused

  Scenario: the stream-wide sweep is unchanged
    Given a work stream containing items that already exceed their budgets
    When the stream is swept
    Then each over-budget artifact is reported at warning severity
    And no already-accepted item is refused

  Scenario: an artifact exactly at its budget is healthy
    Given an item whose architecture document is exactly at its budget
    When it is checked for acceptance
    Then no budget refusal is raised

  Scenario: the budget numbers keep their single home
    Given a project that configures its own budgets
    When an item is checked for acceptance
    Then the configured budgets are the ones applied
    And the refusal reads from the same resolved budgets the warning does

  Scenario Outline: the same measurement, two gates
    Given an item whose <artifact> measures <size>
    When it is checked <when>
    Then the outcome is <outcome>

    Examples: warn while open, refuse at accept — one measurement, two consequences
      | artifact               | size                  | when          | outcome        |
      | the architecture doc   | over its budget       | while open    | a warning      |
      | the architecture doc   | over its budget       | at accept     | a refusal      |
      | the architecture doc   | exactly at its budget | at accept     | no refusal     |
      | the architecture doc   | under its budget      | at accept     | no refusal     |
      | a task contract        | over its budget       | at accept     | a refusal      |
      | the story record       | over its budget       | at accept     | a refusal      |
