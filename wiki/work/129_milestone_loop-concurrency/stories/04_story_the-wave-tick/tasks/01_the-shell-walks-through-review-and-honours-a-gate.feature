@executable @cli @work @work-stream
Feature: the shell walks through-review in BUILD, honours a fresh gate act, and commits its own writes

  ADR-001 §3-§4 as the SHELL sees them. Under `refine_first`, `runLoopBody` runs three phases in
  order. REFINE: while the engine answers `drive refine` for an `unrefined` member (the shell
  hands `decideLoop` the resolved `concurrency` and the in-scope stories lacking tasks, in stream
  order), it drives refine in the primary as today; when the engine stops answering refine, the
  loop commits its OWN writes — `git add -- <milestone dir>` + `commit --no-verify` under the mesh
  identity, `aof(loop): refine <scope>` — so lanes cut from HEAD see the contracts. BUILD: every
  `work:next` ask carries `throughReview: true`; a `done` answer is the phase boundary (every
  in-scope story is in review), narrated as such and never reported as an accepted milestone.
  VERIFY: `work:next` without through-review; an `in-review` story's FRESH `gate` act (no
  `lastPhase`, ADR-001 §4) is HONOURED — today it halts `unmapped-item-type` — by running
  validate + doctor and reading the RECORDED grade (`work:grade` without `--run`): clean → the
  `verify` drive; findings → the existing review-gate decision and a `continue` re-drive.
  Under `sequential` only the fresh-gate handling is new, and it is reached only when a story is
  already `in-review` at the walk — 127's restart defect, closed.

  RULINGS (Three Amigos, 2026-09-13). THE RECORDED GRADE'S HOME: no store write exists after a
  mint (`run-store.mjs` is byte-pinned), so a grade reaches `brief.grade` only on a SUCCESSOR run;
  a lane's final clean delta has no successor in the lane. What IS persisted — on the lane's continue
  run, committed with it — is the progress ledger's last sample (`recordBuildProgress`,
  `failingScenarios` = the delta count). The fresh gate therefore reads, in order: `brief.grade` on
  the story's latest run when a successor carries one (the sequential shape); else the last progress
  sample of the story's latest `continue` run, `0` being the clean verdict and `> 0` a `fail` whose
  findings are the fix's; else — a story moved to `in-review` outside any loop — validate + doctor
  alone, narrated `Gate work:grade <ref> — no recorded grade; verify's ceremony grades the tree.`
  A recorded `indeterminate` that is not `rubric-unconfigured` halts `grade-indeterminate` as rung 3
  does today. THE CYCLE: a fresh gate on a story this loop never drove is asked with `cycle` 1, so
  its re-drive is cycle 2. A REFINE-END COMMIT THAT GIT REFUSES halts `lane-merge-refused` with
  producer `dispatch:commit-own-writes:<code>` naming git's message — the primary is never left
  half-staged.

  Background:
    Given a fixture milestone `07` with stories `07/01` (tasks authored), `07/02` (no tasks) and `07/03` (tasks authored), all `not-started`
    And `work.loop.concurrency: "refine_first"` in the fixture config
    And injected `spawnLaneDrive`, git and driver seams that complete every act `done`

  Scenario: REFINE drives every unrefined story first, in stream order, then commits
    When `runLoopBody` runs over scope `07`
    Then the first drive is `refine` on `07/02`, in the primary, through the driver seam and never through `spawnLaneDrive`
    And after the last refine the primary gained a commit `aof(loop): refine 07` containing only paths under `wiki/work/07_…/`
    And the narration says `Refine phase complete — 1 story refined; committed <sha>.`
    And the refine run's `driven` row is `{ ref: "07/02", phase: "refine", cycle: 1 }` with no `lane`, `baseCommit`, `merge` or `wave` key

  Scenario Outline: the three phases run in order from any starting state
    Given the stories of `07` start as <start>
    When `runLoopBody` runs over scope `07`
    Then the phases observed, in order, are <phases>
    And every `work:next` ask before the `Build phase complete` line and after the refine commit carries `throughReview: true`, and none after it does

    Examples:
      | start                                          | phases                                                                                            |
      | `07/02` unrefined, `07/01` and `07/03` refined  | REFINE (`refine 07/02`, one commit), BUILD (one wave of `07/01, 07/02, 07/03`), VERIFY (gate + verify each, then `verify 07`) |
      | every story refined                            | REFINE (nothing driven, no commit), BUILD (one wave of three), VERIFY (gate + verify each, then `verify 07`) |
      | the milestone has zero stories                 | REFINE (`refine 07` in the primary first), then the commit, then BUILD                            |
      | every story already `in-review`                | REFINE (nothing), BUILD (`Build phase complete` on the first ask, no lane opened), VERIFY (gate + verify each, then `verify 07`) |
      | every story `done`                             | REFINE (nothing), BUILD (`Build phase complete` on the first ask), VERIFY (`verify 07` only)      |

  Scenario: the refine commit is skipped when REFINE drove nothing
    Given every story of `07` has tasks
    When `runLoopBody` runs over scope `07`
    Then no `aof(loop): refine 07` commit exists and the narration says `Refine phase complete — 0 stories refined.`

  Scenario: the refine commit leaves the operator's dirt alone
    Given the primary has an uncommitted edit to `README.md` and REFINE writes `wiki/work/07_…/stories/02_…/tasks/00_x.feature`
    When the refine commit is made
    Then the commit contains the task feature and the story's `STORY.md` and `runs/` records
    And `README.md` is still modified and uncommitted afterwards

  Scenario: BUILD asks work:next with throughReview and reads done as the boundary
    Given every story of `07` has tasks
    When `runLoopBody` runs over scope `07`
    Then every `work:next` invocation during BUILD carries `{ scope: "07", throughReview: true }`
    And when that walk answers `{ state: "done" }` the narration says `Build phase complete — every story in review.`
    And no `Accepted milestone 07.` line is reported at that point
    And the `state.driven` rows so far carry no row with `phase: "verify"`

  Scenario: VERIFY honours a fresh gate on an in-review story
    Given `07/01` is `in-review` with a recorded grade of `pass` (a successor run's `brief.grade`) and a clean validate and doctor
    When `runLoopBody` runs over scope `07` under `sequential`
    Then the first act on `07/01` is `gate`, narrated `Gate work:validate 07/01 — 0 finding(s).` then `Gate work:doctor 07/01 — 0 admitted finding(s).`
    And `work:grade` is invoked WITHOUT `run: true` and the narration says `Gate work:grade 07/01 — pass, 0 of <n> case(s) failing.` — the shipped line, with no re-run behind it
    And the next drive on `07/01` is `verify`, never `continue`
    And the verify run's `brief.grade` is the recorded grade

  Scenario Outline: the fresh gate routes on what validate, doctor and the recorded grade say
    Given `07/01` is `in-review` and validate answers <validate>, doctor answers <doctor> and `work:grade` answers `recorded` <recorded>
    When `runLoopBody` runs over scope `07`
    Then the next act on `07/01` is <next>
    And the fix handed to a re-drive carries <findings>

    Examples:
      | validate   | doctor                    | recorded                       | next                        | findings                                                   |
      | 0 findings | 0 admitted                | `pass`                         | `verify`, cycle 1           | nothing                                                    |
      | 2 findings | not asked                 | `pass`                         | `continue`, cycle 2         | the two validate findings                                  |
      | 0 findings | 1 `error` admitted        | `pass`                         | `continue`, cycle 2         | the doctor finding                                         |
      | 0 findings | 0 admitted                | `fail` on `own-red`            | `continue`, cycle 2         | `[{ gate: "work:grade", code: "case-failed", case: "own-red" }]` |
      | 1 finding  | not asked                 | `fail` on `own-red`            | `continue`, cycle 2         | the validate finding then the `work:grade` entry           |
      | 0 findings | 0 admitted                | `indeterminate` `rubric-unconfigured` | `verify`, cycle 1    | nothing                                                    |

  Scenario: the fresh gate's re-drive is a continue in the primary under sequential
    Given `07/01` is `in-review` and validate answers two findings
    When `runLoopBody` runs over scope `07` under `sequential`
    Then the next drive on `07/01` is `continue` at cycle 2 carrying the two findings as its fix, minted in the primary
    And `spawnLaneDrive` is never called

  Scenario: the fresh gate is honoured, not halted
    Given `07/01` is `in-review`
    When `runLoopBody` runs over scope `07`
    Then no halt with stop `unmapped-item-type` is reported
    And a `gate` act arriving with `next.status` other than `in-review` still halts `unmapped-item-type` with producer `unexpected-engine-act`

  Scenario: sequential keeps refine and build interleaved as today
    Given `work.loop.concurrency` is unset
    When `runLoopBody` runs over scope `07`
    Then the drives interleave per story in ready order — `continue 07/01`, `verify 07/01`, then `refine 07/02` — exactly as `test/loop/loop-command-sequencing.test.mjs` asserts today
    And no `work:next` invocation carries `throughReview`
    And no lane is opened and `spawnLaneDrive` is never called
    And no `aof(loop):` commit is made

  Scenario Outline: the recorded grade is read from the run, then the ledger, then not at all
    Given `07/01` is `in-review`, validate and doctor are clean, and its runs carry <records>
    When `runLoopBody` runs over scope `07`
    Then `work:grade` is never invoked with `run: true`
    And the narration says <line>
    And the next act on `07/01` is <next>

    Examples:
      | records                                                                          | line                                                                         | next                 |
      | a successor run whose `brief.grade` is `pass`                                    | `Gate work:grade 07/01 — pass, 0 of 12 case(s) failing.`                     | `verify`, cycle 1    |
      | one `continue` run whose last progress sample has `failingScenarios` 0           | `Gate work:grade 07/01 — pass (recorded delta 0 on run <runId>).`            | `verify`, cycle 1    |
      | one `continue` run whose last progress sample has `failingScenarios` 2           | `Gate work:grade 07/01 — fail (recorded delta 2 on run <runId>).`            | `continue`, cycle 2  |
      | no run at all                                                                    | `Gate work:grade 07/01 — no recorded grade; verify's ceremony grades the tree.` | `verify`, cycle 1  |
      | a successor run whose `brief.grade` is `indeterminate` with code `runner-timeout` | `Gate work:grade 07/01 — indeterminate (runner-timeout).`                    | halt `grade-indeterminate` |

  Scenario: a refine-end commit git refuses is a named halt
    Given the primary's git refuses the REFINE-end commit with `index.lock exists`
    When `runLoopBody` runs over scope `07` under `refine_first`
    Then the loop halts with stop `lane-merge-refused` and producer `dispatch:commit-own-writes:commit-failed`
    And the halt's detail carries git's message and `git status --porcelain` in the primary is byte-identical to before the commit
