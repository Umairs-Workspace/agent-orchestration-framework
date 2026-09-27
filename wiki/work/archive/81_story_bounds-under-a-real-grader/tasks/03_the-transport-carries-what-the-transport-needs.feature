@executable @cli @work @work-stream
Feature: The fix transport carries the findings and nothing else; the grade travels beside it

  **THE GAP, AS 54/03 DECLARED IT** (`54/03/OUTCOME.md` § Gaps, *"The transport bag carries more than
  the transport needs"*): *"`pendingFixes` carries the whole `GradeRecord` into `ctx.loopDrive.fix`;
  `composeFixInput` destructures only `findings` and `changeUnderReview` and the registered input
  schema is unchanged, so the rule holds in letter while the bag holds a second milestone's
  document."* Its discharge condition is exact: **a separate grade map keyed by ref, leaving
  `pendingFixes` exactly `70`'s shape.**

  **WHY A LETTER-ONLY COMPLIANCE IS WORTH A TASK.** `54/ADR-009 §3` says the transport is 70's — *"no
  second payload, no widened driver input schema"* — and `54/ADR-008 §5` says *"54 supplies the
  records; 70 carries them."* Both are satisfied today only because `composeFixInput` happens to
  destructure two keys and ignore the third. That is a guarantee held by a caller's omission rather
  than by the bag's shape, and the next reader of `ctx.loopDrive.fix` — a warm-resume decision, a
  telemetry projection, 78's execution record — inherits a `GradeRecord` nobody meant to give it. The
  bag is a boundary; a boundary that carries a neighbour's document has already stopped being one.

  **WHAT MOVES.** The grade rides its own map, keyed by ref, read at exactly the one place that needs
  it — the seam that writes `brief.grade` on the run being started (`54/ADR-008 §3`). `pendingFixes`
  returns to the shape `70/04` declared, and `ctx.loopDrive.fix` is that shape verbatim. Nothing about
  what lands on the run's brief changes: the durable record is written where it is written today, by
  the same seam, through `transitionRunStart`'s `edge.brief`. `src/effects/run-transitions.mjs` and
  `src/run-store.mjs` are passed **through** and not edited, as they are today.

  **AND ONE INCONSISTENCY THE SEPARATION EXPOSES, FIXED HERE.** There are four sites that prepare a
  pending fix — the gate re-drive, the progress `reset`, the progress `continue`, and the resume path's
  reconstruction. The gate site puts **`gradeFindings(...)`** on the bag, whose entries each name
  `work:grade` as their producing gate; the progress `continue` site puts the runner's raw
  `grade.failures` on it, whose entries name no producer at all. So the same maker, re-driven for the
  same reason, is handed two different documents depending on which branch decided it. `54/ADR-008 §5`'s
  property — *a reader tells a validate finding from a graded case by a KEY rather than by parsing
  prose* — holds on one branch and not the other. Every site now prepares the transport the same way.

  `54/ADR-008 §3`, `§5`; `54/ADR-009 §3`; `70/04`'s landed transport; `68/ADR-009`; `53/ADR-004`.

  Scenario: the object the driver receives carries exactly the transport's own keys
    Given a grade that returned `fail` for a story whose build completed
    When the loop re-drives `continue` for that story
    Then the object handed to the driver as its fix carries exactly the keys the transport declares
    And no grade record is among them
    And the driver's registered input schema is unchanged

  Scenario: the durable record still lands on the run the grade re-drove
    Given a grade that returned `fail` for a story whose build completed
    When the loop starts the run that re-drives the build
    Then that run's brief carries the grade beside the loop declaration
    And it is written through the same seam that writes the loop declaration
    And the run record gained no top-level key
    And no persistence module was edited to carry it

  Scenario: the rendered findings block carries the failing cases and not the record
    Given a grade that returned `fail` with two failing cases
    When the fix input is composed for the re-drive
    Then the `## REVIEW FINDINGS` block names both failing cases and what the runner said
    And it does not carry the grade's provenance, runner argv, cwd or duration
    And it does not carry the declared report shape

  Scenario Outline: every site that prepares a re-drive prepares the same transport
    Given a story re-driven because <cause>
    When the fix payload is prepared
    Then the payload carries exactly the transport's declared keys
    And every graded entry on it names `work:grade` as its producing gate
    And the grade, when one was taken, still reaches the re-driven run's brief

    Examples:
      | cause                                        |
      | the gate found findings or the grade failed  |
      | the build made no progress and was reset     |
      | the build is still failing and continues     |
      | the loop was resumed onto a reconstructed re-drive |

  Scenario: a validate finding and a graded case are told apart by a key, on every branch
    Given a story whose gate produced one validate finding and whose grade produced one failing case
    When the fix payload is prepared
    Then both entries are carried
    And each names the gate that produced it
    And no reader has to parse prose to tell them apart

  Scenario: the grade map is read once, where the record is written, and nowhere else
    Given the loop shell is read as source
    Then the grade for a pending re-drive is held in its own map keyed by ref
    And it is read only at the seam that writes the run's brief
    And `ctx.loopDrive.fix` is never the carrier for it

  Scenario: an unconfigured repository's transport is the one it carries today
    Given a repository that declares no `work.rubric`
    And a story whose validate gate reports one finding
    When the loop re-drives `continue` for that story
    Then the fix payload carries exactly the validate findings and nothing else
    And no grade map entry exists for that story
    And the shipped loop suites observe the payload they observe today
