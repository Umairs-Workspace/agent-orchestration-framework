@executable @cli @work @validate
Feature: One doctor lane that reads and never runs

  The milestone's hard boundary is that ACD never executes a project's tests. This task holds that
  boundary STRUCTURALLY rather than by intention: leg A of a control resolution is a `stat`, leg B
  is a text read, and the lane imports nothing that could spawn or evaluate anything.

  THE SEAM ALREADY EXISTS. `CHECK_GROUPS` (`src/work-doctor.mjs:411-426`) is an append-only array
  of pure `(snapshot, ctx) => Finding[]` functions; four lanes are registered there today (budget,
  coherence, freshness, identity). This milestone appends ONE entry, and one story owns the array —
  three stories appending to it would be merge friction wearing an independence claim, which story
  65's own record prices (`65/STORY.md:69-74`: two stories partitioned as independent both edited
  one file, ×9 and ×8).

  ONE MODULE, NOT THREE. `src/` is a flat root at 115 `.mjs` files (TECH_DEBT item 10 measured 108;
  m52 measured 112). Three modules for ~80 lines each would buy nothing. Doctor's lane count goes 4
  to 5, and the recorded ratchet is that the SIXTH lane folds the family into `src/work-doctor/`.

  THE SNAPSHOT EXTENSION RIDES READS THAT ALREADY HAPPEN. `buildSnapshot`
  (`src/work-doctor.mjs:242`) already reads `VERIFICATION.md` and `ARCHITECTURE.md` in full
  (`CONVENTION_DOCS`, `:109`; `fileState` reads the text at `:126-133`) and then DISCARDS it,
  returning only `{present, nonEmpty, lines}`. The lane needs exactly what is thrown away. All I/O
  stays at the snapshot boundary, so the groups stay pure and test against literal snapshots with
  no filesystem — the half of m52/ADR-007 this milestone adopts verbatim.

  SEVERITY IS NOT PER-CODE, WITH ONE EXCEPTION. It is ADR-002's horizon predicate: inside `error`,
  outside `warn`. `control-runner-unchecked` is always `warn` because it reports that a leg did not
  run, which is not a violation to be graded. The table below is the whole severity rule, and it is
  also the reachability claim — each of the eight codes is produced by a named fixture, because an
  unreachable code is as much a defect as an unfrozen one.

  Scenario: the lane is registered once, and doctor's existing answers are unchanged
    Given a stream that declares no controls and carries no register ids
    When `aof work doctor` runs over it
    Then its findings are identical to the pre-change answer, code for code and path for path
    And the controls lane appears in the check registry exactly once

  Scenario: the groups answer from a literal snapshot, with no filesystem present
    Given a snapshot constructed in memory whose paths name a directory that does not exist
    When each group in the lane is called
    Then it returns its findings without reading disk
    And calling it twice with the same snapshot returns byte-identical findings

  Scenario: a cited control file is never executed to find out whether it is real
    Given a declared control whose file exists and whose module scope would write a marker if imported
    When both legs of the resolution are evaluated
    Then the control is reported as resolved
    And no marker exists, because existence was established by a stat and the runner leg by a text read

  Scenario Outline: every frozen code is reachable, and the horizon sets its severity
    Given a fixture stream containing <fixture>
    When `aof work doctor` runs over it
    Then a <code> finding is produced, anchored at <anchor>
    And it is <open> while the owning item is open, and <done> once that item is `done`

    Examples: the eight frozen codes
      | code                          | fixture                                                                  | anchor                | open  | done |
      | register-duplicate-id         | one register block declaring `FF-01` in two rows' first cells             | the register file     | error | warn |
      | register-dangling-citation    | a register citing `52/FF-99`, which m52's register does not declare       | the citing file       | error | warn |
      | verification-register-missing | `FF-01` declared in `ARCHITECTURE.md`, no fitness register in `VERIFICATION.md` | `VERIFICATION.md` | error | warn |
      | verification-missing-red-probe | a fitness row for `FF-01` whose red-probe cell is empty                  | `VERIFICATION.md`     | error | warn |
      | control-unresolved            | `FF-01` citing a path with no file, and no pending token in its entry      | `ARCHITECTURE.md`     | error | warn |
      | control-unresolved            | the same declaration, carrying the pending token                          | `ARCHITECTURE.md`     | warn  | warn |
      | control-unregistered          | `FF-01` whose file exists and which no configured runner names             | `ARCHITECTURE.md`     | error | warn |
      | control-runner-unchecked      | an item declaring controls in a project with no configured runner list     | `ARCHITECTURE.md`     | warn  | warn |
      | staged-control               | a file named `thing.test.mjs` under the work directory                     | the staged file       | error | warn |

  Scenario: no code outside the frozen eight ever reaches a reader
    Given a fixture stream engineered to fire all eight codes at once
    When `aof work doctor` runs over it
    Then the set of codes this lane emitted is exactly the eight above, with nothing added
    And extending the set is an ADR-level act, not an edit to a call site

  Scenario: a finding from this lane carries doctor's envelope and nothing else
    Given any finding this lane produces
    Then its keys are exactly code, severity, path and message
    And the path is absolute in OS-native form, because relativising is the face's job
    And the message names the id or the path that must change, so the finding is actionable unopened

  Scenario: an error gates and a warn does not, on the exit code doctor already publishes
    Given a stream whose only controls findings are warns
    When `aof work doctor` runs
    Then it exits zero, and exits non-zero under `--strict`
    And a single error from this lane exits non-zero with or without `--strict`

  Scenario: the snapshot carries the text doctor already reads, and names its only new reads
    Given doctor reads `VERIFICATION.md` and `ARCHITECTURE.md` in full today and discards the text
    When the lane needs that text
    Then no document is opened a second time
    And the only new reads are one existence probe per cited control path and one read per declared runner file
