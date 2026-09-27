@executable @cli @work @work-stream
Feature: the grade baseline is a property of the base commit, measured once per wave in a lane

  ADR-003. Today the baseline is per STORY on the primary tree (`brief.gradeBaseline`,
  `readGradeBaseline(runs, ref)`, `applyGradeBaseline`). Under `refine_first` it is per BASE
  COMMIT: the first lane admitted on a base — a clean checkout of HEAD after prepare, never the
  primary — measures `work:grade --run` in that lane BEFORE its child is spawned; the answer is
  keyed by sha in the wave's `gradeBaselines` map and persisted on EVERY lane run of that wave as
  `brief.gradeBaseline` with the additive `baseCommit` (its `failures` are the case names red at
  that base, its `priorDrives` 0). `readGradeBaseline` gains a `{ baseCommit }` selector beside
  `ref`, so a resumed loop reads the shared baseline back by sha from ANY lane run of the wave. The
  FIRST lane's child WAITS for the baseline (a rubric measured over a tree its child is mutating is
  the deadlock class in a new coat); every LATER lane's child starts at once and only its post-drive
  grade awaits the same promise. On a `--resume` the baseline is read back over the scope's runs
  UNION the live lanes' runs (the reconcile reads them), since a lane's run is invisible to the
  primary until it merges. Each lane's post-drive grade is its own delta — the lane's reds
  minus the base's — which is what closes 127's deadlock class by construction. VERIFY does not
  re-grade: its gate reads the RECORDED grade. `sequential` keeps the per-story baseline on the
  primary, byte-identical.

  Background:
    Given a fixture milestone `07` with a two-member wave `07/01`, `07/03` at base commit B0 and a rubric declared
    And a fake `work:grade` that records `ctx.workspace.projectRoot` and `run`, answering a baseline of two failing cases `base-red-1`, `base-red-2` and, after a drive, those two plus `own-red`

  Scenario: one baseline per wave, measured in the first lane
    When the wave runs
    Then `work:grade` was invoked with `run: true` and no `claimRun` exactly once before any child was spawned
    And its recorded `projectRoot` is the FIRST lane's path, never the primary's
    And the narration says `Baseline work:grade at <B0 short sha> — 2 failing case(s) inherited, <n> case(s) measured, measured in lane 07/01.`
    And every later `work:grade` invocation with `run: true` carries a `claimRun`

  Scenario: the baseline rides every lane run of the wave, keyed by the base
    When the wave runs
    Then both lanes' run records carry `brief.gradeBaseline` deep-equal to `{ measuredAt, priorDrives: 0, failures: ["base-red-1", "base-red-2"], baseCommit: B0 }`
    And `Object.keys(record.brief.gradeBaseline)` is `["measuredAt", "priorDrives", "failures", "baseCommit"]`

  Scenario: each lane's post-drive grade is its own delta
    When the wave runs
    Then each lane's `driven` row carries `verdict` `fail` with `cases.failed` 1 and `codes` naming `case-failed`
    And the narration says `Gate work:grade 07/01 — fail (case-failed), 1 of <n> case(s) failing (2 inherited, excluded by the baseline).`
    And the fix handed to the re-drive names `own-red` and neither base red
    And the sampler received `failingScenarios` 1

  Scenario Outline: the delta is applied per lane against the one baseline
    Given after its drive `07/03`'s grade answers <graded>
    When the wave runs
    Then `07/03`'s row carries `verdict` <verdict> and `cases.failed` <failed>
    And `07/03`'s next act is <next>

    Examples:
      | graded                                      | verdict | failed | next                                 |
      | `base-red-1`, `base-red-2`, `own-red`       | `fail`  | 1      | re-drive `continue` naming `own-red` |
      | `base-red-1`, `base-red-2`                  | `pass`  | 0      | commit, merge, cleanup               |
      | `base-red-1` only                           | `pass`  | 0      | commit, merge, cleanup               |
      | no failing case                             | `pass`  | 0      | commit, merge, cleanup               |
      | `own-red` only                              | `fail`  | 1      | re-drive `continue` naming `own-red` |

  Scenario: the first lane's child waits for the baseline and the second lane's does not
    Given the fake baseline grade resolves only after `07/03`'s child has been spawned
    When the wave runs
    Then `spawnLaneDrive` was called for `07/03` before the baseline resolved
    And `spawnLaneDrive` was called for `07/01` only after the baseline resolved
    And `07/03`'s post-drive grade was applied against the same baseline object as `07/01`'s
    And `work:grade` with `run: true` and no `claimRun` ran exactly once

  Scenario: a baseline that cannot be taken degrades once and grades raw
    Given the fake baseline grade throws `EPERM` in the first lane
    When the wave runs
    Then `reportDegrade` received `loop-grade-baseline` exactly once
    And neither lane run carries `brief.gradeBaseline`
    And each lane's post-drive grade is applied with no baseline, so `07/01`'s row carries `cases.failed` 3

  Scenario Outline: readGradeBaseline answers by sha or by ref, never across the two
    Given `runs` holds <runs>
    When `readGradeBaseline(runs, <selector>)` is asked
    Then it answers <answer>

    Examples:
      | runs                                                                          | selector             | answer                                                         |
      | lane runs of `07/01` (createdAt t1) and `07/03` (t2), both `baseCommit` B0     | `{ baseCommit: B0 }` | the baseline with `runId` `07/03`'s and `baseCommit` B0        |
      | lane runs at B0 only                                                          | `{ baseCommit: B1 }` | `null`                                                         |
      | a sequential run of `07/01` carrying a baseline with no `baseCommit`          | `{ baseCommit: B0 }` | `null`                                                         |
      | a sequential run of `07/01` carrying a baseline with no `baseCommit`          | `"07/01"`            | that baseline, `baseCommit` `null`, as today                   |
      | a lane run of `07/01` at B0                                                   | `"07/01"`            | that baseline with `baseCommit` B0                             |
      | a lane run whose `gradeBaseline.failures` is not an array                     | `{ baseCommit: B0 }` | `null`                                                         |

  Scenario: a resumed loop reads the baseline back by base commit
    Given the wave's lane runs carry `brief.gradeBaseline.baseCommit` B0 and the loop process is restarted with `--resume`
    When the resumed wave re-drives `07/03` on base B0
    Then `work:grade` with `run: true` and no `claimRun` is NOT invoked again for a baseline
    And `readGradeBaseline(runs, { baseCommit: B0 })` answered the persisted baseline and no `Baseline work:grade` line is narrated

  Scenario: a new base commit measures a new baseline
    Given the first wave merged and moved HEAD to B1, and a held member is dispatched on B1
    When that lane runs
    Then exactly one more baseline grade runs, in that lane, keyed by B1
    And that lane's run carries `brief.gradeBaseline.baseCommit` B1

  Scenario: two bases in flight keep two baselines
    Given `07/01` merged to B1 and a held `07/02` was dispatched on B1 while `07/03` is still open on B0
    When both lanes grade
    Then `07/03`'s grade is reduced by the B0 baseline and `07/02`'s by the B1 baseline
    And `gradeBaselines` holds exactly the keys B0 and B1

  Scenario: VERIFY never re-grades
    Given the wave completed and every story is `in-review`
    When the VERIFY phase runs over `07`
    Then no `work:grade` invocation carries `run: true`
    And the gate reads each story's recorded verdict from the last progress sample of its merged lane run (`failingScenarios` 0), never from a rubric run

  Scenario: sequential keeps the per-story baseline on the primary
    Given `work.loop.concurrency` is unset
    When `runLoopBody` drives `07/01`
    Then the baseline grade runs in the primary's workspace once for `07/01`, keyed by ref as today
    And `brief.gradeBaseline` carries no `baseCommit` key and the narration is the shipped `Baseline work:grade 07/01 — …` line

  Scenario: a resumed loop reads a baseline that only a live lane holds
    Given the loop died mid-wave with `07/03`'s lane open and unmerged, its run carrying `brief.gradeBaseline.baseCommit` B0, and nothing in the primary carrying it
    When `runLoopBody` runs with `--resume` and re-drives `07/03` on base B0
    Then no baseline rubric runs
    And the re-drive's `brief.gradeBaseline` deep-equals the one the lane held
