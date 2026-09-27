@executable @cli @work @validate
Feature: The lane reads the last report as snapshot text, and runs nothing at all

  `work:doctor` is the deterministic engine, and `66/ADR-004` §2's *"ACD never executes anything"* is
  pinned on it by name: `acd-controls-never-execute.test.mjs` holds `THE_LANE =
  "src/work-doctor-controls.mjs"` and `THE_SPINE = "src/work-doctor.mjs"` (`:51-52`) and checks their
  direct imports. This story adds a lane to that engine, so the prohibition applies to it at full
  force — and the design that satisfies it already exists one lane over.

  **The lane reads the last report as SNAPSHOT TEXT, exactly as the controls lane's leg B reads its
  runner texts** (`src/work-doctor.mjs:439-450`): the file read happens at the engine's one impure
  edge, in `commands/doctor.mjs`, and arrives as plain data on the snapshot. The lane itself stays a
  pure `(snapshot, ctx) => Finding[]` function appended to `CHECK_GROUPS` — no clock, no filesystem,
  no child process, no dynamic import. That is what makes its answers reproducible from a literal
  snapshot on any machine.

  **A new lane leaf, not an edit to 66's.** `src/work-doctor-rubric.mjs` copies
  `work-doctor-freshness.mjs`'s one-lane shape (1 dependency, 1 dependent — the cheapest cut in this
  tree); `src/work-doctor-controls.mjs` is **not touched** (`66/FF-6605` guards it), and
  `src/feature-parse.mjs` is read and not edited.

  **Absent is an honest no-op, and never a silent pass.** With no `work.rubric.report` declared, or no
  report at its declared path, the lane says so and names the key to set — `roadmap-folder-mismatch`'s
  idiom verbatim (`src/work-doctor-freshness.mjs:9-11`), and the same honesty `ADR-004` §4 requires of
  the grade. It does not report every scenario unjoined on the strength of a report it never read;
  that would be the same "green for the wrong reason" defect wearing the opposite sign.

  ADR-006 §5; `66/ADR-003`, `66/ADR-004`; ADR-003 §1; FF-5407.

  Scenario: the lane is a pure function of the snapshot
    Given a literal snapshot carrying an item's scenarios and a report text
    When the traceability lane is invoked twice with that same snapshot
    Then it returns the same findings both times
    And it opened no file
    And it read no clock
    And it resolved no path against the current working directory

  Scenario: the report text arrives at the engine's existing impure edge
    Given a repository declaring a report path under `work.rubric.report`
    When the doctor is invoked
    Then the report is read once, at the command boundary
    And it arrives on the snapshot as plain text
    And the lane itself performed no read

  Scenario: running the doctor never runs the project's rubric
    Given a repository whose declared rubric command would fail loudly if invoked
    When the doctor is invoked over an item in that repository
    Then the doctor answers
    And the rubric command produced none of its effects
    And the doctor started no child process

  Scenario: the doctor's existing lanes answer exactly as they did before
    Given an item whose doctor result is recorded before this lane exists
    When the doctor is invoked over that item with the traceability lane present
    Then every previously reported finding is reported again, unchanged
    And the only difference is what the traceability lane itself contributes

  Scenario: an undeclared report is an honest no-op that names the key to set
    Given a repository declaring no `work.rubric.report`
    When the traceability lane runs
    Then it reports that the join was not checked
    And the message names the configuration key that would enable it
    And it reports no `scenario-unjoined` finding for any scenario
    And it reports nothing that could be read as a clean join

  Scenario: a declared report that is missing from disk says so rather than guessing
    Given a repository declaring a report path with no file at it
    When the traceability lane runs
    Then it reports that the join was not checked
    And it names the declared path
    And no scenario is reported unjoined on the strength of the absent report

  Scenario: an unreadable report names nothing rather than joining nothing
    Given a repository whose declared report exists but does not parse
    When the traceability lane runs
    Then it reports that the join was not checked
    And it reports no `case-unjoined` finding
    And the unparseable text was not scanned for scenario names

  Scenario: the lane is horizon-scoped like every other doctor lane
    Given a scope naming one item
    When the doctor is invoked with that scope
    Then the traceability lane reports only that item's findings
    And an item outside the scope contributes no finding
