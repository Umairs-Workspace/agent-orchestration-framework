@executable @cli @work @work-stream
Feature: interrupts drain then cancel, the parent deadline is belt-and-braces, and a resume reconciles live lanes first

  ADR-005 §4 and ADR-007 §3-§4. INTERRUPT: the first SIGINT/SIGTERM on the loop process stops
  dispatching, lets every in-flight lane finish, merges what finished, and halts
  `operator-interrupt` — today's rule at the wave grain; a second signal aborts every child
  (stdin end → `graceMs` → kill), settles each lane run `cancelled`, and halts the same way. The
  wave run settles `failed` either way. DEADLINE: each child is bounded on the parent side at
  `startToCloseMs + startupGraceMs` (the child's own driver deadline is the first line of
  defence); expiry settles that lane run `failed / timeout`, retryable through the existing
  ladder. RECONCILE: `aof work loop <scope> --resume` under `refine_first` walks nothing until
  every lane under the dispatch root (`inspectDispatchLanes`) is classified and handled: a lane
  whose run is still `running` with a stale heartbeat → `transitionStaleRunsReclaimed([laneItem])`
  (`runtime_offline`, retryable) and the lane is re-driven from its OWN tree; a lane committed
  and not an ancestor of HEAD → merged (ADR-002); a lane whose tip IS an ancestor → cleaned up; a
  dirty lane with no running run → committed, then classified again; a lane the loop cannot
  classify is narrated and left. Only then does the walk resume, and the wave run is re-minted.

  Background:
    Given a fixture milestone `07` with a two-member wave open in lanes and injected git, child, clock and signal seams

  Scenario: the first signal drains and halts operator-interrupt
    Given both lanes are in flight
    When SIGINT is raised on the loop process
    Then no further `work:dispatch` ask is made
    And both children are allowed to finish and both lanes are graded, committed and merged
    And the loop halts with stop `operator-interrupt`, producer `SIGINT`, detail `signal=SIGINT`, and the wave run is `failed`

  Scenario Outline: a signal's effect depends on how many lanes are open and whether it is the first
    Given <open> lane(s) in flight and <prior> signal(s) already raised
    When <signal> is raised
    Then <children>
    And <lanes>
    And the loop halts with stop `operator-interrupt` and producer <signal>

    Examples:
      | open | prior | signal  | children                                   | lanes                                                      |
      | 0    | 0     | SIGINT  | no child is touched                        | no lane is opened; the halt is reported at the next tick as today |
      | 1    | 0     | SIGTERM | the one child finishes on its own          | that lane is merged                                        |
      | 2    | 0     | SIGINT  | both children finish on their own          | both lanes are merged, in completion order                 |
      | 2    | 1     | SIGINT  | both children's stdin is ended, then killed after `graceMs` if still alive | neither lane is merged; both are kept with their records |
      | 1    | 1     | SIGTERM | the one child is aborted                   | its lane is kept                                           |
      | 2, one already merged | 1 | SIGINT | only the open child is aborted        | the merged lane stays merged and cleaned up; the open one is kept |

  Scenario: the second signal cancels every child
    Given both lanes are in flight and one SIGINT was already raised
    When a second SIGINT is raised
    Then every child's stdin was ended and each was killed after `graceMs` if still alive, and `spawnLaneDrive` answered `aborted` for each
    And each lane run is settled `cancelled` with `failureReason` `null` and no retry is attempted
    And the loop halts with stop `operator-interrupt` naming the cancelled lanes in a `cancelled` detail
    And each cancelled lane's `driven` row has `outcome` `"cancelled"` and `merge` absent

  Scenario: a child past the parent deadline is settled timeout and retried in its lane
    Given `startToCloseMs` 1000 and `startupGraceMs` 100 and a child that never returns
    When the clock passes 1100ms
    Then `spawnLaneDrive`'s `deadlineMs` was 1100 and it answered `timeout`
    And the lane run is settled `failed / timeout`
    And the retry ladder re-spawns in the SAME lane worktree with a fresh `deadlineMs` 1100, narrated `Retrying 07/01 — continue, attempt 2 of 3 (timeout).`

  Scenario: the lineage budget still bounds the retries of a timed-out lane
    Given `startToCloseMs` 1000, `startupGraceMs` 100, `scheduleToCloseMs` 1500 and a child that never returns
    When the first attempt times out at 1100ms and the retry times out again
    Then the second retry is refused by `decideScheduleToClose` and the loop halts `deadline-exhausted` with `elapsedMs` 2200 and `ceilingMs` 1500
    And the lane is kept with both `failed / timeout` records

  Scenario Outline: a resume reconciles each live lane before walking
    Given the loop process was killed with a lane for `07/01` in state <lane state>
    When `runLoopBody` runs with `--resume`
    Then the lane is handled as <handling> before any `work:next` ask
    And the narration begins with `Reconciling 1 live lane(s).` and names `07/01` with its classification

    Examples:
      | lane state                                                    | handling                                                                                     |
      | run `running`, heartbeat older than `heartbeatMs`             | reclaimed `runtime_offline`, then retried in the lane as attempt 2, narrated `Resumed 07/01 — attempt 2 of 3 on run <runId>.` |
      | run `running`, heartbeat older than `heartbeatMs`, dirty tree | reclaimed, re-driven from the lane's tree with the dirt in place, never committed first     |
      | run `running`, heartbeat within `heartbeatMs`                 | narrated as live and left: not reclaimed, not merged, not re-driven                          |
      | committed, tip not an ancestor of HEAD, no running run        | merged through `mergeDispatchLaneHome`, then cleaned up                                      |
      | committed, tip not an ancestor, `mergeDispatchLaneHome` answers `conflict` | halt `lane-merge-conflict` again, before any walk; the lane kept               |
      | committed, tip not an ancestor, `mergeDispatchLaneHome` answers `refused` with `files` | halt `lane-merge-refused` naming the files, before any walk           |
      | tip already an ancestor of HEAD                               | cleaned up through `work:dispatch --cleanup`                                                 |
      | dirty tree, no running run                                    | committed (`aof(loop): 07/01 reconciled`), then merged, then cleaned up                       |
      | `prunable` (directory gone)                                   | narrated and left for `aof work dispatch --sweep`                                            |

  Scenario: reconciliation walks every lane, in dispatch-root order, before the first ask
    Given lanes for `07/01` (stale running run) and `07/03` (committed, unmerged)
    When `runLoopBody` runs with `--resume`
    Then `07/03` was merged and `07/01` reclaimed before `work:next` was asked
    And the narration says `Reconciling 2 live lane(s).`
    And the `work:next --through-review` ask that follows offers `07/01` and no longer offers `07/03`

  Scenario: a lane the loop cannot classify is narrated and left
    Given a directory under the dispatch root that matches no known ref
    When `runLoopBody` runs with `--resume`
    Then the narration names the path as unclassified
    And it is neither removed nor merged and the walk continues

  Scenario: a lane outside this loop's scope is not this loop's to reconcile
    Given a lane for `53/01` under the dispatch root beside `07/01`'s
    When `runLoopBody` runs with `--resume` over scope `07`
    Then `53/01`'s lane is neither merged, cleaned up, reclaimed nor counted in `Reconciling 1 live lane(s).`

  Scenario: a hand-merged conflict lane is recognised on resume
    Given the previous run halted `lane-merge-conflict` on `07/03` and the operator merged its branch into `main` by hand
    When `runLoopBody` runs with `--resume`
    Then `07/03`'s lane is classified as already an ancestor and cleaned up
    And the walk continues with `07/03` `in-review`

  Scenario: the resumed wave re-mints its wave run
    Given a resume after a mid-wave death
    When the walk resumes into BUILD
    Then a new milestone-level wave run is minted carrying `brief.wave` for the members still open
    And the dead wave run was settled `failed / runtime_offline` by the reclaim, narrated `Reclaimed 07 — run <runId> (runtime_offline).`
    And `--resume` under `sequential` runs no reconciliation and touches no lane

  Scenario: a reclaimed wave run is never retried as the milestone's act
    Given a resume after a mid-wave death whose wave run was reclaimed `runtime_offline`
    When the walk resumes
    Then that run is absent from the resume retry set and no `Resumed 07 — attempt 2` line is narrated
    And the BUILD phase mints a NEW wave run (attempt 1, `retryOf` absent) before its first dispatch
