@executable @cli @work @work-stream
Feature: The grade's failures are bounded where they are WRITTEN, not only where a human reads them

  **THE GAP, AS 54 DECLARED IT** (`54/OUTCOME.md` § Gaps, `54/03/OUTCOME.md` § Gaps): *"the operator
  line slices to 20; the run record's `brief.grade`, the cap-exhausted report line and the fix
  transport's `## REVIEW FINDINGS` each carry the record whole."* Three writers, no bound; one
  reader, bounded — which is the bound in exactly the one place it does not matter, because a human
  can stop reading and a run record, a report line and a maker's prompt cannot.

  **THE PRECEDENT IS ALREADY RULED AND IS FOLLOWED HERE VERBATIM** — `70/ADR-003`: the ceiling lives
  **in the write path**, `compilePhaseBrief` *refuses to return an over-ceiling brief*, *"it is not a
  lint, not a caller's responsibility, and not a comment"*; when it truncates it **states in the
  payload itself that it did so, naming what was dropped**; and it **never returns an empty payload**,
  because *"a phase handed nothing is strictly worse than a phase handed a truncated something."*
  `70/ADR-003`'s own rejected alternative — *warn and ship* — is rejected again here for the same
  reason: a budget nothing enforces has already been exceeded.

  **ONE BOUND, ONE HOME, FOUR SURFACES.** The bound is a single pure function in `src/work-grade.mjs`
  — which keeps its FF-5406 property of importing nothing from `src/`, so the ceiling is handed in
  rather than reached for — and every surface that writes a grade payload calls it. The operator
  render's `failures.slice(0, 20)` (`src/commands/grade.mjs`) is **replaced by that call**, not left
  beside it: a second bound is how two numbers become two different numbers.

  **NO NUMBER IS INVENTED.** The entry count is the **20 this repository already declares** at the
  operator render, promoted from a render-local literal into the one home; the character ceiling is
  the one `70` already declared for a payload handed to a maker (`PHASE_BRIEF_MAX_CHARS`,
  `src/phase-brief.mjs`), which is the budget the `## REVIEW FINDINGS` block is spent against. This
  story chooses the SHAPE and reuses the values, exactly as task 00 does.

  **`GradeRecord` IS UNCHANGED, AND SO IS FF-5403.** `compileGrade` returns what it returns today —
  the runner's verbatim failures, whole — and `aof work grade <ref> --json` still carries them, which
  is where the complete truth belongs. What is bounded is every payload WRITTEN from that record. So
  the record's key set stays exact, no tenth code is coined, and `ADR-005 §2`'s ratchet is untouched
  because it reads `cases`, never `failures`.

  `70/ADR-003`; `54/ADR-005 §2`; `54/ADR-008 §3`; `54/ADR-004 §2`; F-54-VERIFY-3's sibling gap.

  Scenario: the durable record on a re-driven run carries a bounded payload
    Given a grade whose runner reported more failing cases than the ceiling admits
    When the loop starts the run that re-drives the build
    Then that run's brief carries the grade with its failures bounded
    And the payload states that it was truncated and how many failures were dropped
    And the run record gained no top-level key
    And the brief's loop declaration is unchanged

  Scenario: the cap-exhausted report line carries a bounded record
    Given a loop that exhausts its cycle cap carrying an accumulated grade record
    When it halts
    Then the reported findings are bounded by the same ceiling
    And the report line states what was dropped
    And the halt still names `cap-exhausted` and its producer

  Scenario: the fix transport hands the maker a bounded payload
    Given a grade that returned `fail` with more failing cases than the ceiling admits
    When the loop re-drives `continue` for that story
    Then the rendered `## REVIEW FINDINGS` block is within the ceiling
    And it names how many failures were dropped
    And it is not empty

  Scenario: a single enormous failure message is cut rather than dropped whole
    Given a grade whose one failing case carries a message longer than the whole ceiling
    When the payload is written
    Then the payload still names that case
    And the message is cut to fit
    And the payload states that it was cut
    And the payload is not empty

  Scenario Outline: the writer refuses to emit an over-ceiling payload at every surface
    Given a grade record whose failures exceed the ceiling
    When the payload is written to <surface>
    Then what is written is within the ceiling
    And it declares that it was truncated

    Examples:
      | surface                            |
      | the re-driven run's `brief.grade`  |
      | the cap-exhausted report line      |
      | the fix transport's findings block |
      | the operator's rendered verdict    |

  Scenario Outline: a payload that already fits is passed through unchanged and says nothing
    Given a grade whose failures are <count> and within the ceiling
    When the payload is written
    Then every failure is carried
    And the payload makes no truncation statement

    Examples:
      | count |
      | 0     |
      | 1     |
      | 20    |

  Scenario: there is exactly one bound, and the render reads it rather than repeating it
    Given the grade path is read as source
    Then exactly one function bounds a grade payload
    And it lives in the pure leaf and imports nothing from `src/`
    And the operator render calls it instead of slicing to a literal of its own
    And no module hard-codes a second failure ceiling

  Scenario: the record itself is unchanged, and the machine face still carries the whole truth
    Given a grade whose runner reported more failing cases than the ceiling admits
    When `aof work grade <ref> --run --json` is read
    Then the record carries every failure the runner emitted
    And the record's key set is exactly the one it carries today
    And its `cases` counts are the ones the runner reported

  Scenario: a repository that declares no rubric writes no payload and no statement
    Given a repository that declares no `work.rubric`
    When the loop re-drives after a red validate gate
    Then the fix payload carries exactly the validate findings and nothing else
    And no truncation statement appears anywhere
    And no grade key is written to the run's brief
