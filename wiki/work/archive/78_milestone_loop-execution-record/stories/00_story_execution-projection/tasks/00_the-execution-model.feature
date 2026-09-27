@executable @cli @work @work-stream
Feature: The execution model — what ran, against what was declared

  The projection takes two things it is HANDED — the loaded loop registry model, and the run records
  belonging to one work item — and returns the execution facts for that item. It opens no file, reads
  no clock and spawns nothing (FF-7801 holds that structurally; nothing below restates it).

  THE JOIN IS ONE KEY. A run belongs to a loop when its `brief.loop` envelope carries a `loopRunId`
  and a loop id the registry resolves — the seven-key declaration milestone 53 mints
  (`src/commands/loop.mjs:1065`, `buildLoopDeclaration`, `src/work-loop.mjs:903-923`). Runs are
  grouped by `loopRunId`, because one loop RUN mints many run records and a naive group-by-loop-id
  would fuse two separate engagements of the same loop into one.

  CYCLES AND CEILINGS COME FROM DIFFERENT PLACES, AND THAT IS THE POINT (ADR-004). The declared
  ceiling is the registry record's `ceiling:`; the cycles observed are counted from the declarations
  on the runs. Neither is derivable from the other, and a record that showed only one of them would
  be the record we already have. `ceiling` is rendered as its own state — the three non-numeric
  values are NOT collapsed into "no limit", because "terminates by construction" (`none`), "nobody
  has said" (`unknown`) and "deliberately unbounded" (`uncapped`) have three different remedies.

  ORDER IS CANONICAL, because 78/01 renders these bytes and FF-7803 freezes them. Engagements sort by
  `startedAt`, then by `loopRunId` — the same shape `compareRuns` already uses
  (`src/work-loop.mjs:931-938`), so a record does not reorder because two runs share a timestamp.

  Scenario: a loop that ran once reports its cycles against its declared ceiling
    Given a registry declaring `loop:build-to-green` with `ceiling: 6`
    And four run records for the item carrying one `loopRunId` for that loop, at cycles 1 through 4
    When the execution model is projected
    Then it reports one engagement of `loop:build-to-green`
    And that engagement observed 4 cycles against a declared ceiling of 6

  Scenario: two engagements of the same loop are two rows, not one
    Given a registry declaring `loop:review-fix-rereview`
    And run records carrying two different `loopRunId` values for that loop
    When the execution model is projected
    Then it reports two engagements of `loop:review-fix-rereview`
    And each carries its own cycle count, phases and outcome

  Scenario: the phases entered are reported in the order they were first entered
    Given an engagement whose runs carry the phases `continue`, `verify`, `continue`
    When the execution model is projected
    Then that engagement reports the phases entered as `continue`, `verify`
    And a phase entered twice is listed once, at its first entry

  Scenario: the attempt chain is reported as a chain, not a count
    Given an engagement whose runs carry attempts 1, 2 and 3, each retry naming the run it retried
    When the execution model is projected
    Then that engagement reports 3 attempts
    And it reports the retry chain in order, each link naming the run it retried

  Scenario Outline: the declared ceiling is reported as its own state
    Given a registry declaring `loop:the-loop` with <declared>
    And an engagement of that loop observing <cycles> cycles
    When the execution model is projected
    Then the engagement reports its ceiling state as <state>
    And it reports <at-or-over> the declared bound

    Examples: the four ceiling states ADR-004 keeps distinct
      | declared           | cycles | state      | at-or-over               |
      | `ceiling: 6`       | 4      | bounded    | within the declared bound |
      | `ceiling: 6`       | 6      | bounded    | at the declared bound     |
      | `ceiling: 6`       | 7      | bounded    | over the declared bound   |
      | `ceiling: none`    | 4      | none       | no bound to compare against |
      | `ceiling: unknown` | 4      | unknown    | no bound to compare against |
      | `ceiling: uncapped`| 4      | uncapped   | no bound to compare against |

  Scenario: a capped engagement and an uncapped one do not produce equal models
    Given two engagements identical in every observed fact
    And the first declares `ceiling: 6` while the second declares `ceiling: uncapped`
    When the execution model is projected for each
    Then the two engagements are not equal
    And they differ in their ceiling state, not only in a rendered string

  Scenario Outline: the terminal outcome and stop reason are carried through, never re-derived
    Given an engagement whose last run settled with <outcome> and <reason>
    When the execution model is projected
    Then the engagement reports the outcome <outcome>
    And it reports the stop reason <reason>

    Examples: the outcomes an engagement can end on
      | outcome | reason           |
      | done    | the loop's own settled stop reason |
      | failed  | the recorded failure reason       |
      | (none)  | still running — no terminal run yet |

  Scenario: an engagement still in flight is reported as in flight, not as failed
    Given an engagement whose runs carry no terminal outcome
    When the execution model is projected
    Then that engagement reports no terminal outcome
    And it is distinguishable from an engagement that ended having failed

  Scenario: the projection is deterministic and does not mutate what it is handed
    Given a registry model and a set of run records
    When the execution model is projected twice from the same inputs
    Then the two models are deeply equal
    And the registry model and the run records are unchanged
