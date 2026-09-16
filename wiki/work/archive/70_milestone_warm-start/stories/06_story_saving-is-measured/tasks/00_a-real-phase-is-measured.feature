@cli @work @work-stream
Feature: A real phase leaves a run record that carries its spend

  Every run record in this stream reports `unmeasured`, and the cause is not the one the phrase
  suggests. Measured at refine: **61 run records exist under `wiki/work/**/runs/`, and zero carry
  the `spend` key at all** — not `null`, absent. The newest is `66/03`, **2026-08-16**, reading
  `"brief": {}`, `"sessionId": null`, no `spend`. It predates milestone 68's writer entirely, and
  milestones **67, 68, 69 and 70 have no run record whatsoever**.

  So nothing is broken. The chain transcript → `spend` → record → ratio is complete and untried:
  68/01 populates `sessionId`, 68/02 stamps the envelope at settle, 70/02 reads the ratio. The loop
  has simply not minted a run since the writer landed, because these milestones were built by hand
  in interactive sessions, which mint nothing.

  **THE DOOR MATTERS, AND ONLY ONE OF THE TWO DECLARES A PHASE.** Both settle spend, and they are
  not interchangeable. A bare `aof work drive <phase> <ref>` mints through
  `transitionRunStart(item, { now })` with **no brief** (`src/commands/drive.mjs:154-156`), so the
  record carries `brief: {}` and its spend lands under *no declared phase* — the ratio exists and
  answers nothing. `aof work loop` mints with `brief: { loop: declaration }`, where
  `declarationFor({ …, phase: act.phase, … })` is rebuilt per act (`src/commands/loop.mjs:683, 693`)
  and handed to `transitionRunStart` (`:402`), so its spend groups under the phase 70/02 reports by.
  A measurement taken through the wrong door is not a cheaper measurement; it is the milestone's own
  question left unanswered in a new place.

  ADR-008 — this task reads what happened. It introduces no bound and fails no run.
  Closes finding F-12. Depends on 70/02 (the reader) and 70/01 (the flags being measured).

  @manual @finding-F-12
  Scenario: a phase is driven through the door that declares it
    Given an item of this milestone with no run record
    When a phase is driven to completion through the loop door on the deployed payload
    Then a run record exists for that item
    And it carries the phase the loop declared
    And it is not reported under "no declared phase"

  @manual @finding-F-12
  Scenario: the settled run carries a spend envelope
    Given a phase driven to completion through the loop door
    When the run settles
    Then its record carries a `spend` envelope rather than omitting the key
    And the envelope carries all four token buckets, the model, the effort and a cost source
    And the four buckets sum to the run's total with no term counted twice

  @manual @finding-F-12
  Scenario: the report stops saying unmeasured
    Given at least one settled run carrying spend
    When the report is produced for this milestone
    Then a measured cache ratio is stated for that phase
    And `unmeasured` is no longer the whole answer for the item

  @manual
  Scenario: the evidence is the written snapshot, not a hand-typed table
    Given the measurement has been taken
    When the report is written
    Then an `observability/` snapshot is committed under the milestone
    And every figure quoted elsewhere in this story is one that snapshot holds
    And a figure that appears in no snapshot is not quoted

  @manual
  Scenario: a measurement that could not be taken says so
    Given a driven phase whose transcript is missing, unreadable or reports no usage
    When the run settles
    Then `spend` is left unwritten rather than stamped as zero
    And the failure is reported rather than swallowed
    And the run is not failed on account of the missing measurement

  @manual
  Scenario: one run is a datapoint, not a measurement
    Given a single settled run carrying spend
    When the figures are recorded
    Then the number of runs behind each figure is recorded with it
    And a figure resting on one run is labelled as such rather than stated as the milestone's result

  @manual
  Scenario Outline: what a settled run must carry for a ratio to exist at all
    Given a settled run whose <element> is <state>
    When the report is produced
    Then the phase row reports <outcome>

    Examples: each is a separate way to arrive at `unmeasured`, and the report must not conflate them
      | element             | state       | outcome                                                        |
      | spend envelope      | absent      | unmeasured, and counted as unmeasured spend                    |
      | spend envelope      | present     | a ratio derived from its two cache buckets                     |
      | cache buckets       | both zero   | unmeasured — excluded from the ratio, never counted a miss     |
      | cache create bucket | zero, reads recorded | unbounded — warm, not a division by zero               |
      | cache read bucket   | zero, creates recorded | a ratio of zero — a real miss, reported as one       |
      | declared phase      | absent      | grouped under "no declared phase", ratio still stated          |
      | declared phase      | present     | grouped under that phase                                       |
      | session id          | absent      | spend unwritten — the ingest has no transcript to read         |

  @manual
  Scenario Outline: the door decides whether the measurement answers the question
    Given a phase driven through <door>
    When the run settles and the report is produced
    Then the spend is <spend>
    And the phase grouping is <grouping>

    Examples: both doors settle spend; only one of them declares the phase 70/02 reports by
      | door                        | spend    | grouping             |
      | the loop door               | recorded | the declared phase   |
      | a bare phase drive          | recorded | no declared phase    |
      | an interactive session      | never minted — no run record exists | none  |
