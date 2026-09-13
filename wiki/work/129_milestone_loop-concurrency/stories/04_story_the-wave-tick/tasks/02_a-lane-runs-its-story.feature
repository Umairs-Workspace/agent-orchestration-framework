@executable @cli @work @work-stream
Feature: a lane runs its story — minted, driven, settled, graded, gated, committed, merged and closed in its own tree

  ADR-004 §1-§6, ADR-005 §1, ADR-002 §6, ADR-006 §1. For every member `work:dispatch` admits, the
  BUILD phase in `src/loop/wave.mjs` runs, in this order and with every step narrated:

    1. OPEN — `work:dispatch { refs }` → the member's `worktree` and `branch` (created at HEAD, or
       reused and advanced to HEAD); the lane's `baseCommit` is `dispatchLaneBase`'s answer.
    2. RESOLVE — `resolveRefInWorktree(primaryRoot, workDir, lane, ref)` → the item AS IT LIVES IN
       THE LANE; `resolveItemExact(ctx, ref)` is never used for a lane's item.
    3. MINT — `transitionRunStart(laneItem, { brief, node, now }, opts)` with `brief.loop` equal to
       the wave run's (same `loopRunId`, `scope`, `level`, `cap`, `id`, `supervised`, `startedAt`;
       `phase: "continue"`; its own `cycle`) and the additive `brief.lane: { worktree, branch,
       baseCommit }`; `opts.workspace` is the LANE workspace, `opts.lock` the primary's lock context.
       The `run.started` reactor moves the LANE's STORY.md to `in-progress`; the primary's copy is
       not written.
    4. DRIVE — `spawnLaneDrive` with the lent id, `cwd` the lane (story 02); a pending fix rides a
       file under the aof home (`<home>/mesh/loop-fixes/<runId>.json`), written by the loop and
       removed after the child exits.
    5. SETTLE — `settleDriven` against the LANE item with the child's `settlementContext`; a
       `died` child is `failed / runtime_offline` (retryable, re-spawned in the SAME lane through
       the existing retry ladder), `timeout` is `failed / timeout`, `aborted` is `cancelled`.
    6. LADDER — `settleStoryCycle` with `ctx.workspace = loadWorkspace(lane)` and `crossToVerify:
       false`: grade, sampler (`worktreePath` the lane, `baseCommit` the lane's), validate, doctor.
    7. COMMIT — `commitDispatchLane` (record docs and run records ride the branch).
    8. MERGE — `mergeDispatchLaneHome`; `already-current` / `fast-forwarded` / `merged` continue,
       `refused` halts `lane-merge-refused`, `conflict` halts `lane-merge-conflict` (the lane kept).
    9. CLEANUP — `work:dispatch --cleanup <ref>` with `--remove`; a refusal there is narrated and
       the lane is left for the sweep, never a halt.

  Each lane's `driven` row carries the existing keys plus `lane: { worktree, branch }`,
  `baseCommit` and `merge: { outcome, commit }`. `LoopState` keeps its ten keys.

  RULINGS (Three Amigos, 2026-09-13). A HALT IN ONE LANE DRAINS THE OTHERS: no new dispatch, every
  in-flight child finishes, its lane is settled, committed and merged where it merges, and only then
  does the loop halt — naming the first halting lane as the act's `ref` and the drained lanes in the
  detail (ADR-005 §4's interrupt rule, applied to every stop). A LANE IS COMMITTED BEFORE ANY HALT
  RETURNS once its run is settled — a halt inside the ladder leaves a committed, unmerged lane that
  the reconcile reads as such. PRODUCERS: `lane-open-failed` → `work:dispatch:<code>` (`at-capacity`,
  `dispatch-lane-open-error`, `lane-open-failed` from a refused advance) or `run-store:duplicate-run`;
  `lane-merge-refused` → `dispatch:merge-home:refused` (`dispatch:commit-own-writes:<code>` for the
  scoped commit); `lane-merge-conflict` → `dispatch:merge-home:conflict`; a `decideWave`-derived
  `dependency-blocked` → `engine:wave-empty-held`. EVERY OPEN RECLAIMS FIRST: before the mint,
  `transitionStaleRunsReclaimed([laneItem])` runs over the lane; a still-fresh `running` record there
  halts `lane-open-failed` / `run-store:duplicate-run`. The cancel grace is the family's one named
  constant, `LANE_CANCEL_GRACE_MS` = 10000 in `wave.mjs` — no config key. A `refused` child document
  settles `failed / agent_error`, non-retryable, and halts `run-not-retryable`.

  Background:
    Given a fixture milestone `07` whose stories `07/01` and `07/03` form a two-member wave, refined, and a git seam that materialises real worktrees under `.aof/mesh/dispatch-worktrees/`
    And an injected `spawnLaneDrive` that answers `{ outcome: "document", document: { outcome: "done", sessionId: "s-<ref>", settlementContext: {} } }` after recording its arguments
    And fake `work:grade`, `work:validate` and `work:doctor` that record `ctx.workspace.projectRoot` and answer clean

  Scenario: the lane's item is resolved and minted in the lane, never in the primary
    When the wave runs
    Then each lane's story dir under the lane holds one run record whose `brief.lane` is `{ worktree: <lane>, branch: "aof/mesh/07-01", baseCommit: <B0> }` and whose `brief.loop.loopRunId` is the loop's
    And `Object.keys(record.brief.loop)` is `["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id", "supervised"]` with `phase` `"continue"` and `cycle` 1
    And the primary's `07/01` and `07/03` story dirs hold NO run record until the merge
    And after the merge `readRuns(primary 07/01)` returns the same `runId` the lane minted, in state `done`

  Scenario: the primary's story docs are untouched while the lane is open
    When the wave runs and is paused after step 4 of each lane
    Then the primary's `07/01/STORY.md` still says `status: not-started`
    And the lane's `07/01/STORY.md` says `status: in-progress`
    And `git status --porcelain` in the primary names nothing under `wiki/work/07_…/stories/`

  Scenario: the child is spawned in the lane with the lent id
    When the wave runs
    Then `spawnLaneDrive` was called once per member with `{ ref, phase: "continue", runId: <the lane's record>, lane: <that member's worktree> }` and no `fixFile`
    And its `deadlineMs` equals `startToCloseMs + startupGraceMs` from the fixture config
    And its `env.AOF_GLOBAL_HOME` equals the test's isolated home

  Scenario: the ladder runs in the lane workspace
    When the wave runs
    Then every recorded `ctx.workspace.projectRoot` of the grade, validate and doctor fakes is a lane path
    And no recorded path is the primary's
    And the sampler received `worktreePath` the lane and `baseCommit` the lane's `baseCommit`

  Scenario: the lane is committed and merged, and the row names it
    When the wave runs
    Then each lane's branch gained a commit containing the story's run record and STORY.md before its merge
    And `main` contains both lanes' commits afterwards and the lane worktrees and branches are gone
    And each lane's `driven` row has `Object.keys` ending `[…, "lane", "baseCommit", "merge"]` with `lane: { worktree, branch }`, `baseCommit` <B0> and `merge: { outcome, commit }`
    And the first lane merged has `merge.outcome` `"fast-forwarded"`, the second `"merged"` (the primary moved) or `"fast-forwarded"` (it did not)
    And `Object.keys(state)` is the same ten keys as a sequential run's

  Scenario Outline: a child's non-document outcome settles the lane run as the vocabulary says
    Given `spawnLaneDrive` answers <spawn> for `07/01`
    When the wave runs
    Then `07/01`'s lane run is settled <state> with `failureReason` <reason>
    And when <retryable> is true the retry ladder re-spawns in the SAME lane worktree, narrated `Retrying 07/01 — continue, attempt 2 of 3 (<reason>).`
    And the narration carries <tail>

    Examples:
      | spawn                                                    | reason              | state       | retryable | tail                               |
      | `{ outcome: "died", stderrTail: ["boom", "stack"] }`     | `"runtime_offline"` | `failed`    | true      | the two stderr lines               |
      | `{ outcome: "timeout" }`                                 | `"timeout"`         | `failed`    | true      | nothing                            |
      | `{ outcome: "aborted" }`                                 | `null`              | `cancelled` | false     | nothing                            |
      | `{ outcome: "document", document: { outcome: "failed", failureReason: "session_limit" } }` | `"session_limit"` | `failed` | false — the retry mint refuses `retry-parked` and the loop halts `retry-parked` with `readyAt` | nothing |
      | `{ outcome: "refused", document: { ok: false, code: "ref-not-found" } }` | `"agent_error"` | `failed` | false — the loop halts `run-not-retryable` / `run-store:not-retryable` | the refusal's `code` |

  Scenario Outline: the lane sequence stops at the step that fails and names it
    Given the lane for `07/01` fails at <step> because <how>
    When the wave runs
    Then no step after <step> is taken for `07/01`
    And the lane run is <run>
    And the loop's act is <act>
    And the lane worktree and branch are <lane>

    Examples:
      | step    | how                                                                        | run                | act                                                                          | lane                                   |
      | OPEN    | `work:dispatch` answers `dispatched[i].ok === false` with an `error`         | not minted         | halt `lane-open-failed`, detail naming `error.message`                        | absent                                 |
      | OPEN    | the reused lane answers `advanced: { outcome: "refused", code: "lane-open-failed" }` | not minted | halt `lane-open-failed`, detail naming the branch and HEAD                    | kept at its old tip, no `MERGE_HEAD`   |
      | DRIVE   | the child's document is `{ outcome: "needs-input", sessionId: "s-1" }`     | left `running`     | halt `session-needs-input` / `driver:needs-input`, detail `sessionId=s-1`     | kept                                   |
      | DRIVE   | `died` on every attempt up to cap 3                                        | three `failed / runtime_offline` | halt `cap-exhausted` / `run-store:attempts-exhausted`           | kept                                   |
      | LADDER  | `work:grade` answers `indeterminate` `report-missing`                       | `done`             | halt `grade-indeterminate` / `work:grade:report-missing`                      | kept                                   |
      | COMMIT  | the lane tree is clean (`committed: false`)                                | `done`             | continues; `merge.outcome` `"already-current"`; cleanup runs                  | removed                                |
      | MERGE   | `{ outcome: "refused", code: "lane-merge-refused", files: ["src/cli.mjs"] }` | `done`           | halt `lane-merge-refused`, detail `files=["src/cli.mjs"]`                     | kept, committed                        |
      | MERGE   | `{ outcome: "refused", reason: "detached-head" }`                           | `done`             | halt `lane-merge-refused`, detail `reason=detached-head`                      | kept, committed                        |
      | MERGE   | `{ outcome: "conflict", code: "lane-merge-conflict" }`                      | `done`             | halt `lane-merge-conflict`, details `lane`, `branch`, `base`, `tip`           | kept, committed; the primary has no `MERGE_HEAD` |
      | CLEANUP | `{ outcome: "refused", code: "dispatch-lane-uncommitted-work" }`           | `done`             | continues to the next act; the row's `merge.outcome` is the merge's           | kept                                   |

  Scenario: a failing grade re-drives in the same lane before any merge
    Given `work:grade` answers `fail` on `own-red` after the first drive of `07/01` and `pass` after the second
    When the wave runs
    Then `07/01`'s lane holds two run records, `brief.loop.cycle` 1 and 2, the second carrying `brief.grade` the first's grade and the same `brief.gradeBaseline`
    And the second `spawnLaneDrive` call carried `fixFile` and the same `lane` and the lane's `baseCommit` is unchanged
    And `mergeDispatchLaneHome` ran once for `07/01`, after the second drive, and `state.driven` has two rows for `07/01` with the same `lane`

  Scenario: a pending fix rides a file under the aof home and is removed after the child
    Given `07/01`'s previous drive left a pending fix
    When the wave re-drives `07/01`
    Then `spawnLaneDrive` received `fixFile` `<AOF_GLOBAL_HOME>/mesh/loop-fixes/<runId>.json` holding the fix transport, `JSON.parse`-equal to `pendingFixes.get("07/01")`
    And the file no longer exists after the child returned, on `done` and on `died` alike
    And nothing under either checkout was written for it

  Scenario: a cleanup refusal is narrated, never a halt
    Given `work:dispatch --cleanup` answers `{ outcome: "refused", code: "dispatch-lane-projection-unpublished" }` for `07/03`
    When the wave runs
    Then the narration says `Lane 07/03 — cleanup refused (dispatch-lane-projection-unpublished): <lane path> left for aof work dispatch --sweep.`
    And the loop continues to its next act with no halt

  Scenario: the lane sequence is narrated step by step
    When the wave runs
    Then the narrate seam received, for `07/01`, lines beginning `Lane 07/01 —` for open, mint, drive, settle, grade, commit, merge and cleanup, in that order
    And the open line names the worktree path and `baseCommit`, the mint line the `runId`, the drive line the `sessionId`, the settle line the state, the commit line the tip, the merge line the outcome and commit, the cleanup line the outcome
    And no `Lane` line is printed through `report`

  Scenario Outline: a halt in one lane drains the others before the loop returns
    Given both lanes are in flight and `07/01`'s lane <fails>
    When the wave runs
    Then `07/03`'s child finishes, its lane is settled, committed and merged
    And no further `work:dispatch` ask is made
    And the loop halts with stop <stop>, `ref` `07/01`, and a `drained` detail naming `07/03` with its `merge.outcome`

    Examples:
      | fails                                                     | stop                  |
      | merges with a conflict                                    | `lane-merge-conflict` |
      | merges refused on `src/x.mjs`                             | `lane-merge-refused`  |
      | grades `indeterminate` (`runner-timeout`)                 | `grade-indeterminate` |
      | returns `needs-input`                                     | `session-needs-input` |

  Scenario: a lane is committed before a ladder halt returns
    Given `07/01`'s grade is `indeterminate`
    When the wave runs
    Then `07/01`'s lane branch carries a commit holding its settled run record before the halt is reported
    And a following `--resume` classifies that lane as committed and unmerged

  Scenario: a stale running record in a reopened lane is reclaimed before the mint
    Given `07/01`'s lane branch carries a `running` record whose heartbeat is older than `heartbeatMs`
    When the wave opens `07/01`'s lane
    Then that record is settled `failed / runtime_offline` before the new run is minted
    And the narration says `Reclaimed 07/01 — run <runId> (runtime_offline).`

  Scenario: a fresh running record in a reopened lane refuses the open by name
    Given `07/01`'s lane branch carries a `running` record whose heartbeat is within `heartbeatMs`
    When the wave opens `07/01`'s lane
    Then the loop halts with stop `lane-open-failed` and producer `run-store:duplicate-run`
    And no run is minted and the lane is untouched
