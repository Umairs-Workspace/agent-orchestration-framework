@executable @cli @work @validate
Feature: Green is positive evidence — four pieces, all of them, and an exit code is none of them

  Measured at HEAD on this repo, the node test runner over
  `test/arch/acd-controls-never-execute.test.mjs`:

  ```
  ok 1 - test\arch\acd-controls-never-execute.test.mjs
  1..1
  # tests 1   # suites 0   # pass 1   # fail 0        →  exit 0
  ```

  The file declares **four** real arch-tests. **None of them ran.** The "test" is the file itself,
  the suite count is zero, and the process exited 0. A grader reading that as green would ship a lie
  into the loop's own termination decision — and this is the fourth measured instance of the same
  class in this codebase (66's 4-of-5 audit, `m46/ADR-006`'s vacuous sweep, this run, and
  ADR-007 §2d's sixteen unprobed controls).

  So `pass` is a claim that must be paid for, in four pieces, all of them (ADR-005 §2): **(a)** the
  declared report EXISTS; **(b)** it PARSES in its declared format; **(c)** it enumerates NAMED
  cases, `total > 0` and `total >= floor`; **(d)** every case CARRIES a status from that format's
  own vocabulary. The exit status is checked **first** (`m11/R2` — *a command that wraps a
  subprocess must check the subprocess's exit status before reading its expected output*) and then
  discarded as insufficient: it can VETO a pass, and it can never buy one.

  **A refine-time ruling, recorded because the ADR left it open (STATE, 2026-08-22).** Two shapes
  are neither absent, nor unparseable, nor below a floor, yet carry no adequate evidence: a report
  that parses but whose cases carry no status, and a report showing no red while the runner exited
  non-zero. Both are `report-vacuous` — the report is vacuous *as evidence* — and both are
  `indeterminate`. No tenth code is invented; `GRADE_CODES` stays set-equal to the nine (FF-5403).
  The second shape is not hypothetical: this repo's own runner writes `ok - <name>` to **stdout**
  and `not ok - <name>` to **stderr** (`scripts/test.mjs:3730,3733`), so a stdout-only capture of a
  failing run is an all-green report beside a non-zero exit, exactly.

  The trade is stated and accepted (ADR-005 §Consequences): an `indeterminate` that halts costs an
  operator a minute; one read as `pass` costs a milestone.

  ADR-005 §2; ADR-004 §4; `69/ADR-004`'s primary/backstop idiom.

  Scenario: the complete case — four pieces of evidence and a clean exit
    Given a runner that exited zero
    And a declared report that exists, parses, enumerates named cases at or above its floor
    And every enumerated case carries a status, and none of them is a failing one
    When the grade is compiled
    Then its `verdict` reads `pass`
    And its `codes` are empty
    And `cases` reports the observed total

  Scenario Outline: remove exactly one piece of evidence and the pass is gone
    Given a runner that exited zero
    And a declared report that <defect>
    When the grade is compiled
    Then its `verdict` reads <verdict>
    And its `codes` contain <code>
    And its `verdict` does not read `pass`

    Examples: the four pieces, one removed at a time
      | defect                                                              | code               | verdict       |
      | is absent from disk at its declared path                            | report-missing     | indeterminate |
      | is present but does not parse in its declared format                | report-unreadable  | indeterminate |
      | parses but enumerates no named case at all                          | report-vacuous     | indeterminate |
      | enumerates named cases of which one carries no status               | report-vacuous     | indeterminate |

  Scenario: an exit code of zero is not evidence of anything
    Given a runner that exited zero
    And no report at its declared path
    When the grade is compiled
    Then its `verdict` reads `indeterminate`
    And the record reports the exit status as zero
    And no code path derived `pass` from that exit status

  Scenario: a non-zero exit vetoes a pass even when the report shows no red
    Given a runner that exited non-zero
    And a report that exists, parses and enumerates only passing cases
    When the grade is compiled
    Then its `verdict` reads `indeterminate`
    And its `codes` contain `report-vacuous`
    And the record reports the real non-zero exit status
    And the report's passing cases are still enumerated in `cases`

  Scenario: a reported red is a red whatever the exit status said
    Given a report enumerating at least one case whose status is a failing one
    When the grade is compiled for a runner that exited zero
    Then its `verdict` reads `fail`
    And its `codes` contain `case-failed`
    And the same verdict is reached when the runner exited non-zero

  Scenario: the declared floor is the primary defence, and it catches the measured case
    Given a rubric declaring a report floor of four
    And a report that parses and enumerates exactly one named, passing case
    When the grade is compiled
    Then its `verdict` reads `indeterminate`
    And its `codes` contain `report-vacuous`
    And `cases` reports the observed total of one, as the evidence of what was short

  Scenario: with no declared floor the evidence floor is still a case that ran
    Given a rubric that declares no report floor
    And a report that parses and enumerates no named case
    When the grade is compiled
    Then its `codes` contain `report-vacuous`
    And a report enumerating one named, passing case is not refused on the floor

  Scenario: the ratchet is the backstop, and it needs no configuration
    Given a previous grade recorded as `pass` for the same item, observing forty cases
    And a rubric that declares no report floor
    And a report that parses and enumerates one named, passing case
    When the grade is compiled
    Then its `verdict` reads `indeterminate`
    And its `codes` contain `report-vacuous`

  Scenario Outline: what the ratchet measures against
    Given a recorded grade history for the same item of <history>
    And a report enumerating <observed> named, passing cases and no declared floor
    When the grade is compiled
    Then its `verdict` reads <verdict>

    Examples: only a recorded pass raises the bar
      | history                                 | observed | verdict       |
      | no recorded grade at all                | 1        | pass          |
      | a `pass` observing 40 cases             | 40       | pass          |
      | a `pass` observing 40 cases             | 1        | indeterminate |
      | a `fail` observing 40 cases             | 1        | pass          |
      | an `indeterminate` observing 40 cases   | 1        | pass          |

  Scenario: the ratchet is scoped to the item, never to the stream
    Given a recorded `pass` observing forty cases for a different item
    And no recorded grade for the item being graded
    And a report enumerating one named, passing case
    When the grade is compiled
    Then its `verdict` reads `pass`
    And another item's history did not lower or raise this item's floor
