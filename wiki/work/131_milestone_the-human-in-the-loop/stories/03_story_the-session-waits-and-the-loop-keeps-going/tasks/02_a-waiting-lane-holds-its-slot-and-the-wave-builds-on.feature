@executable @cli @work @work-stream
Feature: a lane waiting on a human holds its slot while the other lanes build, resumes its own child with the answer, and parks unmerged at the bound

  ADR-001 §1(a), ADR-004 §2-§3. Under `refine_first` the wave owns a lane's wait. The lane's
  needs-input branch in `src/loop/wave.mjs` and the ladder's retry site call `awaitAnswer` with the
  LANE's item, record and transition options. The closure re-spawns the lane child through
  `spawnLaneDrive({ …, answerFile })` (task 03), and the answer file is the ask file's own path. A
  waiting lane stays in the wave's `lanes`. It keeps its slot and its worktree, and the other lanes
  run on. An answered lane settles and walks its ladder as any lane does. A lane that parks is
  committed on its branch (the lane commit) and closes `parked`. It is not merged and not cleaned
  up, and it is set aside for this invocation. When the wave has no open lane, nothing it can
  dispatch, and at least one parked lane, it halts through `parkedHalt`.

  RULINGS (PO, 2026-09-23).
  (1) `closeLane` gains the `parked` outcome. It appends the entry to the wave's parked list, adds
  the ref to `setAside`, and merges and cleans nothing. The lane's `runIds` stay on its `driven`
  rows, and those rows carry no `merge`.
  (2) THE PARKED HALT COMES FIRST. With no open lane and a parked list that is not empty, every
  nothing-to-dispatch branch of the tick answers `parkedHalt(parked, haltDecision)` instead of its
  own halt: `blocked`, `held`, a wave that holds every member, and `decideReadySetExhausted`. A
  parked lane is the reason its dependents cannot run, so the halt names the question and not the
  symptom. A tick that can dispatch something dispatches it.
  (3) A wave that ends `done` or `handoff` with a parked lane still halts on the parked lane. The
  phase is not complete while a story waits on a human.
  (4) A halt raised by ANOTHER lane still drains the wave as today (129's rule). A waiting lane
  under that drain parks at its next check, with no notification: the loop is ending, and its
  `loop-halted` notice says why. Holding the drain open for the rest of the bound would hide that
  halt for hours. An answer already in the file at that check wins, and the lane is re-driven
  before the wave returns. The parked entry rides the drained list beside the first halt, and
  the first halt stays the one the loop reports. The question stays answerable, and `--resume`
  re-enters it (task 04).
  (5) The wave run's heartbeat stays armed while any lane is open, a waiting lane included.
  (6) The operator's stop at level ≥ 1 parks every waiting lane with no notification, as task 00
  rules. The wave then halts `operator-interrupt` as today, and the parked entries ride its
  `Details` as `parked`.
  (7) The five `loop-command-wave` cases that use needs-input to leave a lane open inject
  `ctx.askWait` with an immediate park. They keep their stop and their guards. A guard that read
  "a lane was left with a running record" now reads a parked lane with a running record.

  RULINGS (QA, 2026-09-23). (1) EXTENDS PO ruling (2), for the PO to ratify: the parked halt also
  comes first over the tick's other nothing-to-dispatch halts, `lane-open-failed` for a wave live
  elsewhere and for `work:dispatch:at-capacity`, since a parked lane keeps its worktree and can hold
  the pool's slot. A malformed wave (`unmapped-item-type`) is not a nothing-to-dispatch branch and
  keeps its own halt. (2) A lane parked under another lane's drain rides `drained` as
  `{ ref, parked: true }`, and its entry rides the halt's `Details.parked`, so the account prints its
  block (task 05, QA ruling 1). (3) The `answerFile` is `askRequestPath(loopAsksDir(env), runId)`
  under the env the child is given, so an isolated `AOF_GLOBAL_HOME` reaches both. (4) A waiting lane
  counts against the lane bound as a running one does. (5) A parked lane's `driven` rows read
  outcome `needs-input` and carry no `merge`. (6) Task 00's QA ruling (3) holds here: an answer read
  once the stop's signal has aborted is not re-driven, and the lane parks with its file `answered`.

  RULINGS (PO, answering QA, 2026-09-23). (8) QA ruling (1) is RATIFIED. A parked lane keeps
  its worktree and may hold the pool's slot, so the live-elsewhere and at-capacity `lane-open-failed`
  halts yield to the parked halt as well. A malformed wave keeps `unmapped-item-type`: that is a
  defect, not a symptom of the question. (9) QA rulings (2) to (6) are RATIFIED.

  RULINGS (PO, answering the developer, 2026-09-23).
  (10) The lane takes `{ phaseRun, parked }` from the retry ladder (task 01, ruling 8) and closes
  `parked`, exactly as a park at its own site does.
  (11) EXTENDS ruling (7). Any `loop-command-wave` case that later runs `--resume` over the lane it
  left open, and whose subject is the RECLAIM, seeds that lane with a running record that carries NO
  ask (task 04, ruling 7). Otherwise it would silently test re-entry and wait on the real bound.
  (12) The re-drive spawns the child with `answerFile` and WITHOUT `fixFile`. The fix was delivered
  in the session's first turn (task 03, ruling 7).
  (13) CLOSES A GAP. A needs-input run that reaches the wave from the ladder under a standing stop
  (`{ phaseRun }` from `retryUntilTerminal`'s stop read) is handed to `awaitAnswer`, which parks it
  silently. The lane closes `parked` and never `run-not-retryable`.

  Background:
    Given the lane fixture (`test/support/loop/lane-fixture.mjs`): milestone `07` with two independent ready stories `07/01` and `07/02`, a lane bound of 2, and an isolated `AOF_GLOBAL_HOME`
    And a fake lane child, and `notify` reached through an injected `fetch` spy

  Scenario: one lane asks, the other merges, and the answer finishes the first
    Given `07/01`'s child answers `needs-input` with session `s-1`, and `07/02`'s child answers `done`
    And `07/01`'s ask is answered `"use the existing seam"` once `07/02` has merged
    When the wave runs
    Then `07/02` merged home while `07/01` waited
    And `07/01`'s child was spawned a second time with `--answer <its ask file>` and the same `--run`
    And `07/01` settled `done`, merged, and was cleaned up, and its ask file is gone
    And the wave answered `complete`

  Scenario: a waiting lane is visibly alive
    Given `07/01` is waiting
    When the fake clock passes one `heartbeatMs`
    Then `07/01`'s run in its lane carries a consumed `heartbeatAt` newer than its ask's `askedAt`
    And the collector holds `07/01 — waiting on you (build, ` at least twice
    And the milestone's wave run is still `running`

  Scenario: an unanswered lane parks unmerged, and the loop halts only after the other lane merged
    Given `ctx.askWait` parks at the first check, `07/01`'s child answers `needs-input`, and `07/02`'s child answers `done` after 30 ms
    When the wave runs
    Then `07/02` merged before the halt
    And `07/01`'s lane branch carries a lane commit and is not an ancestor of the primary's `HEAD`, and its worktree still exists
    And `fetch` was called once for `session-parked-unanswered` naming `07/01`
    And the wave halted `session-needs-input` at `07/01`, with `parked` in its `Details`

  Scenario: a lane that is waiting does not stop the next wave from being dispatched
    Given `07/03` depends on `07/02` only, and `07/01` is waiting
    When `07/02` merges
    Then `07/03` is dispatched into the freed slot while `07/01` still waits

  Scenario: a halt in another lane drains the wave, and the waiting lane parks without a notice
    Given `07/01` is waiting unanswered, and `07/02` halts `grade-indeterminate`
    When the wave runs
    Then `07/01`'s ask file reads `parked`, and its lane is committed and not merged
    And `fetch` was never called for `session-parked-unanswered`
    And the wave halted `grade-indeterminate` at `07/02`, with `07/01` on the drained list as parked

  Scenario: an answer that is already waiting in the file wins over the drain
    Given `07/01`'s ask file is answered, and `07/02` halts before `07/01`'s next check
    When the wave runs
    Then `07/01` was re-driven with its answer before the wave returned, and was not parked

  Scenario Outline: with no open lane and a parked one, the question is the halt whatever else stopped the tick
    Given <parked>, no lane is open, and `work:next` then answers <answer>
    When the tick runs
    Then the wave <halt>

    Examples:
      | parked                               | answer                                                                      | halt                                                                                      |
      | `07/01` parked earlier this invocation | `state: "blocked"`, waiting on `07/01`                                    | halts `session-needs-input` at `07/01`, with `Details.parked` naming `07/01`              |
      | `07/01` parked earlier this invocation | `state: "held"`                                                           | halts `session-needs-input` at `07/01`, with `Details.parked` naming `07/01`              |
      | `07/01` parked earlier this invocation | a wave whose only member `07/03` is held behind `07/01`                   | halts `session-needs-input` at `07/01`, with `Details.parked` naming `07/01`              |
      | `07/01` parked earlier this invocation | a wave whose only member `07/01` is set aside                             | halts `session-needs-input` at `07/01`, and never `ready-set-exhausted`                   |
      | `07/01` parked earlier this invocation | `state: "done"`                                                           | halts `session-needs-input` at `07/01`, and never answers `complete`                      |
      | `07/01` parked earlier this invocation | a wave whose only member `07/04` is live in a lane another process beats  | halts `session-needs-input` at `07/01`, and never `lane-open-failed`                      |
      | `07/01` parked earlier this invocation | a wave whose member `07/03` `work:dispatch` refuses at capacity           | halts `session-needs-input` at `07/01`, and never `lane-open-failed`                      |
      | `07/01` parked earlier this invocation | a malformed `wave`                                                        | halts `unmapped-item-type`, producer `work:next:wave-malformed`, as today                  |
      | `07/01` parked earlier this invocation | a wave whose member `07/03` is ready                                      | dispatches `07/03`, and does not halt on that tick                                        |
      | no lane parked                       | `state: "blocked"`, waiting on `07/01`                                      | halts `dependency-blocked`, as today                                                      |

  Scenario Outline: a halt in another lane drains the wave, and the waiting lane ends as its file says
    Given `07/01` is waiting, and `07/02` halts `grade-indeterminate` before `07/01`'s next check, at which the ask file <file>
    When the wave runs
    Then `07/01` <fate>, and `fetch` was never called for `session-parked-unanswered`
    And the wave halts `grade-indeterminate` at `07/02`, with `07/01` in `drained` as <drained>

    Examples:
      | file                                                   | fate                                                                                   | drained                                                        |
      | reads `waiting`                                        | parks, its lane committed and not merged, its file `parked`                            | `{ ref: "07/01", parked: true }`, and `Details.parked` names it |
      | does not exist                                         | parks, its record's last ask carrying a `parkedAt`, its lane committed and not merged  | `{ ref: "07/01", parked: true }`, and `Details.parked` names it |
      | reads `answered` `"go"`, and the re-drive ends `done`  | is re-driven with `--answer`, settles `done`, commits and merges home                   | a merge entry, and `Details` carry no `parked`                  |
      | reads `answered` `"go"`, and the re-drive asks again   | is re-driven, then parks at its next check with the second question                    | `{ ref: "07/01", parked: true }`, and `Details.parked` names it |

  Scenario Outline: the operator's stop parks every waiting lane without a notice, and the halt carries them
    Given `07/01` is waiting unanswered and `07/02`'s child is running, and <stop> before `07/01`'s next check
    When the wave runs
    Then `07/01`'s ask file reads `parked`, its lane is committed and not merged, and `fetch` was never called for `session-parked-unanswered`
    And `07/02` <other>, and the wave halts `operator-interrupt` with `Details.parked` naming `07/01`

    Examples:
      | stop                              | other                                                                  |
      | a stop request is written         | finishes, settles `done` and merges home                               |
      | two `SIGINT`s arrive              | is aborted, settles `cancelled` and is named in `Details.cancelled`    |

  Scenario Outline: an answer already in the file wins over the stop's first level, and never over its signal
    Given `07/01`'s ask file is answered `"go"`, and <stop> before its next check
    When the wave runs
    Then `07/01` <fate>

    Examples:
      | stop                          | fate                                                                                                             |
      | a stop request is written     | is re-driven with `--answer`, and its ask file is gone                                                           |
      | two `SIGINT`s arrive          | is not re-spawned, its ask file still reads `answered`, and its record's last ask carries a `parkedAt` and no `answeredAt` |

  Scenario Outline: a waiting lane keeps its slot, and the bound decides what else runs
    Given a lane bound of <bound>, `07/03` ready and independent, and `07/01` waiting while `07/02` <other>
    When the wave ticks
    Then `07/03` <dispatched>

    Examples:
      | bound | other            | dispatched                                                                                   |
      | 2     | has merged       | is dispatched while `07/01` still waits                                                      |
      | 2     | is still running | is not dispatched, and `07/03 — at capacity (2/2), waiting for a lane to close.` is narrated |
      | 3     | is still running | is dispatched while `07/01` still waits                                                      |

  Scenario Outline: the wave run beats while any lane is open, a waiting one included
    Given <lanes>
    When the fake clock passes one `heartbeatMs`
    Then the wave's heartbeat is <armed>

    Examples:
      | lanes                                                   | armed                                                        |
      | `07/01` waiting alone                                   | armed, and the milestone's wave run gains a consumed beat    |
      | `07/01` waiting, and `07/02` parked and closed          | armed                                                        |
      | `07/01` parked and closed, and no other lane open       | disarmed, and the wave run settled `failed` with the halt    |

  Scenario Outline: a parked lane leaves its work where --resume can find it
    Given `ctx.askWait` parks at the first check, and `07/01`'s child answers `needs-input` with session `s-1`
    When the wave runs to its halt
    Then <fact>

    Examples:
      | fact                                                                                                         |
      | `07/01`'s lane branch carries the lane commit, whose tip is not an ancestor of the primary's `HEAD`          |
      | `07/01`'s worktree still exists, and `work:dispatch` was never invoked with `cleanup` for `07/01`            |
      | `07/01`'s `driven` rows carry its run id, outcome `needs-input`, and no `merge` key                          |
      | the run in `07/01`'s lane is `running`, with one ask carrying a `parkedAt` and no `answeredAt`               |
      | `07/01`'s ask file reads `parked` with `sessionId` `s-1`, and no later tick dispatched `07/01`               |

  Scenario Outline: the re-spawn names the ask file in the child's own home
    Given the loop runs with <home>, and `07/01`'s ask for run `R1` is answered
    When the wave re-drives `07/01`
    Then the child was spawned with `--run R1 --answer <file>`, and its env carries `AOF_GLOBAL_HOME` <env>

    Examples:
      | home                                                       | file                          | env  |
      | `AOF_GLOBAL_HOME=H` in the process env                     | `H/mesh/loop-asks/R1.json`    | `H`  |
      | `ctx.globalWorkStoreOptions.env` = `{ AOF_GLOBAL_HOME: H2 }` | `H2/mesh/loop-asks/R1.json` | `H2` |
