@executable @cli @work @validate @bug @finding-F-54-00-2
Feature: A skipped case is not evidence — the floor measures what RAN

  Raised at 54/00's structural review, decided at 54/00's verify as **F-54-00-2**, and carried here
  because the three task features this story delivered are immutable: a new rule goes in a new
  scenario, never as an edit to a shipped contract.

  Measured through the shipped compiler before the fix — four cases each carrying `# SKIP`, a clean
  exit and a declared `floor: 4`:

  ```
  verdict: "pass"   codes: []   cases: { total: 4, failed: 0, skipped: 4 }
  ```

  Nothing executed, and the grade said `pass`. The compiler conformed to ADR-005 §2(c) **exactly as
  it was written** — `total > 0 and total >= floor`, where `total` counts skips — so this is a rule
  defect rather than a deviation, and it is fixed by **ADR-005's amendment of 2026-08-22**: the
  measure is the cases that **RAN**, `total - skipped`. The ratchet missed it too, because a prior
  four-case pass sets a bar that four skips clear.

  This is the milestone's own thesis turned on the milestone: `01_green-is-positive-evidence.feature`
  refuses a green bought with an exit code, and this refuses one bought with cases that never ran.
  Both are the same claim — **`pass` is paid for in positive evidence** — and neither is visible from
  a suite that reports itself green.

  **What deliberately does NOT change.** `cases` is still reported exactly as observed (ADR-005 §4):
  a skip is evidence about the RUN and belongs in the record; it is simply not evidence that anything
  was verified. No tenth code is coined and no fourth verdict invented — the refusal is
  `report-vacuous` at `indeterminate`, the shape already ruled for a report that is vacuous *as
  evidence*, so `GRADE_CODES` stays set-equal to the nine (FF-5403).

  ADR-005 §2(c) as amended, §4; F-54-00-2.

  Scenario: the measured case — a suite in which everything skipped is not a pass
    Given a rubric declaring a report floor of four
    And a runner that exited zero
    And a report enumerating four named cases, every one of them skipped
    When the grade is compiled
    Then its `verdict` reads `indeterminate`
    And its `codes` contain `report-vacuous`
    And `cases` still reports a total of four and a skipped count of four, as observed

  Scenario: with no declared floor at all, a report of nothing but skips still cannot pass
    Given a rubric that declares no report floor
    And a report enumerating two named cases, both skipped
    When the grade is compiled
    Then its `verdict` reads `indeterminate`
    And its `codes` contain `report-vacuous`

  Scenario Outline: the floor is measured against what ran, not against what was enumerated
    Given a rubric declaring a report floor of three
    And a report enumerating <total> named cases of which <skipped> skipped and the rest passed
    When the grade is compiled
    Then its `verdict` reads <verdict>

    Examples: the same enumerated total, a different amount of evidence
      | total | skipped | verdict       |
      | 3     | 0       | pass          |
      | 4     | 1       | pass          |
      | 3     | 1       | indeterminate |
      | 3     | 3       | indeterminate |

  Scenario: a skip does not mask a red
    Given a report enumerating one failing case and three skipped ones
    When the grade is compiled
    Then its `verdict` reads `fail`
    And its `codes` contain `case-failed`
    And the verdict is the reported red, not the missing evidence

  Scenario: the ratchet's bar is drawn on the same measure it is compared against
    Given a previous grade recorded as `pass` for the same item, observing forty cases of which ten skipped
    And a rubric that declares no report floor
    And a report enumerating forty cases of which ten skipped
    When the grade is compiled
    Then its `verdict` reads `pass`
    And a healthy re-run of a suite that legitimately skips is not refused by its own history

  Scenario: a bar drawn from a prior pass still refuses a run that skipped its way to the count
    Given a previous grade recorded as `pass` for the same item, observing forty cases none skipped
    And a rubric that declares no report floor
    And a report enumerating forty named cases of which thirty-nine skipped
    When the grade is compiled
    Then its `verdict` reads `indeterminate`
    And its `codes` contain `report-vacuous`
