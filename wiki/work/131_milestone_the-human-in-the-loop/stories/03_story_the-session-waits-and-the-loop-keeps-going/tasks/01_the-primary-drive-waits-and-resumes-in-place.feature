@executable @cli @work @work-stream
Feature: a primary drive that needs input waits in the loop's own process, resumes the same run with the answer, and halts only when it parks

  ADR-001 §1(b), ADR-004 §1 and §3. There are three primary needs-input sites: the shell's drive in
  `src/commands/loop.mjs` (REFINE, VERIFY and the sequential build), the retry ladder's drive
  (`retryUntilTerminal`, `src/loop/cycle.mjs`), and the cross to verify (`settleStoryCycle`,
  `src/loop/cycle.mjs`). Each one calls `awaitAnswer` where it minted `session-needs-input` before.
  The closure it hands in re-drives through the site's own drive with the answer: `drivePhase({ …,
  retryRecord: <the waiting record>, answer })` for the shell and the verify site, and the ladder's
  `drive(retryRecord, answer)` for the retry site. The re-drive's result is settled through the
  site's existing `settleDriven`, one settle per drive (`130/ADR-003` §3). A `{ parked }` answer is
  returned as the halt `parkedHalt([parked], haltDecision)` mints. The order after a drive stays
  settle → interrupt → needs-input → retry at every site.

  RULINGS (PO, 2026-09-23).
  (1) `drivePhase` gains `answer`. With it, `ctx.loopDrive` carries `answer: { runId, sessionId,
  text }` beside `runId`, and no `fix`. The `retryRecord` is the waiting run's own record, so the
  re-drive mints nothing and re-uses the same `runId` at the same `attempt` (ADR-001 §1).
  (2) The sites add no textual `await drivePhase({` call. The closure reaches `drivePhase` through
  the binding the site already has, so `126/FF-12602`'s three shell drive sites and `130/FF-13002`'s
  settle rule hold.
  (3) The interrupt read happens before `awaitAnswer` is called. A level already standing when the
  drive settles halts `operator-interrupt`, naming the session as it does today, and opens no ask.
  A level that arrives DURING the wait parks the ask (task 00, ruling 4). The site then returns
  `haltOnStop`'s answer, not the parked halt, and the stop is marked honoured as today.
  (4) A resumed drive that ends `done` continues the walk exactly as a first drive ending `done`
  would. One that ends `failed` enters the retry ladder as usual. One that asks again is looped by
  `awaitAnswer`.
  (5) `loopState`, `renderLoopState` and the loop document's keys do not change. The parked halt is
  an ordinary `session-needs-input` halt whose `Details` carry `parked`.
  (6) The existing needs-input cases in `test/loop/loop-command-stops.test.mjs` inject
  `ctx.askWait` with an immediate park. They keep their stop id, producer and resume command, and
  their `sessionId=` assertion is re-aimed at the `parked` entry's `sessionId`. Their assertions do
  not weaken.

  RULINGS (QA, 2026-09-23). (1) `drivePhase` with `answer` and no `retryRecord` throws a `TypeError`
  before any mint or driver call: an answer never rides a new run. (2) At the retry site the waiting
  record is the retried attempt's own, with its own `runId` and `attempt`. (3) A stop during the wait
  halts through `haltOnStop` with today's `sessionId`, and its `Details` also carry `parked` with the
  one entry, so the account prints the ask block (task 05, QA ruling 1). (4) A level that rises
  while the RE-drive runs is today's interrupt over a drive. At level 1 the re-drive finishes and
  settles, then the loop halts. At level 2 it is aborted, settles `cancelled` and is named on the
  mark. Either way the record's ask is answered and the file is cleared. (5) The ladder's budget
  after an answered ask excludes the ask's interval (ADR-001 §4, 131/01 task 05), so a long wait
  never exhausts `scheduleToCloseMs` by itself.

  RULINGS (PO, answering QA, 2026-09-23). (7) QA rulings (1) to (5) are RATIFIED. In particular
  (3): a stop during the wait halts `operator-interrupt`, and its `Details` carry `parked`, so the
  account prints the ask block (task 05, PO ruling 8).

  RULINGS (PO, answering the developer, 2026-09-23).
  (8) AMENDS the task's description: THE RETRY SITE HANDS A PARK BACK, IT DOES NOT HALT.
  `retryUntilTerminal` serves the shell and the wave, so a park there answers `{ phaseRun, parked }`
  and the CALLER decides what it means. The shell returns `haltOnStop(…)` with `parked` in its
  `Details` when the source stands at level ≥ 1, and `parkedHalt([parked])` otherwise. The wave
  closes the lane `parked` (task 02). The shell site and the verify site keep their own decision,
  because each has one caller.
  (9) The verify site polls `ladderOptions.stopSource` inside `settleStoryCycle` before it calls
  `awaitAnswer`, so a stop that already stands opens no ask there either.
  (10) The ladder-budget rows ("the wait is charged to no attempt") drive `retryUntilTerminal`
  directly, with a clock `now`. Through `runLoopBody` the fixed `input.now` prices every attempt
  at 0.
  (11) Each re-drive is a closure `(answer) => drivePhase({ … })`, and `awaitAnswer` calls it. No
  new `= await drivePhase(` binding appears, so `130/FF-13002` and `126/FF-12602` leg 3 count
  three sites as before. The returned run is settled through the site's `settleDriven`.
  (12) THE SPEND OF AN ANSWERED RUN. The first turn's bytes are charged along with the second's.
  `awaitAnswer` carries the WAITING drive's `settlementContext` onto the phase run it returns, so
  the one settle charges the whole run from its first baseline. The resumed drive's own snapshot is
  not used for that settle. After a `--resume` re-entry the first baseline has gone with the dead
  process. The resume snapshot is used then, and the pre-ask turn goes uncharged. That is said
  here rather than discovered.

  Background:
    Given the loop-command-stops fixture: scope `03`, level `L2`, cap 3, a fake PTY driver, and an isolated `AOF_GLOBAL_HOME`
    And `notify` is reached through an injected `fetch` spy

  Scenario: a primary drive's question is answered and the loop carries on from the same session
    Given the refine drive of `03/01` answers `needs-input` with session `S1`, and its re-drive answers `done`
    And the ask file for its run is answered `"yes, split it"` before the first check
    When `runLoopBody` walks scope `03`
    Then the driver was launched a second time with `resumeSessionId` `S1` and the typed body `"yes, split it"`
    And that run was settled `done` exactly once, and no second run was minted for `03/01`
    And the walk went on to the next act after `03/01`

  Scenario: an unanswered primary ask parks at the bound and the loop halts on it
    Given `ctx.askWait` parks at the first check
    When `runLoopBody` walks scope `03` and the refine drive of `03/01` answers `needs-input`
    Then the state halts on `session-needs-input` at `03/01`, producer `driver:needs-input`
    And the halt's `Details` carry `parked` with one entry whose `runId` is that run and whose `sessionId` is `S1`
    And the run for `03/01` is still `running`, with one parked ask

  Scenario: the retry ladder's drive waits the same way
    Given `03/01`'s first build attempt fails `agent_error`, and the retried attempt answers `needs-input`
    When the retry's ask is answered and its re-drive answers `done`
    Then the retried run was re-driven under its own `runId` and attempt, and settled `done` once

  Scenario: the cross to verify waits the same way
    Given the story's grade is clean, and its verify drive answers `needs-input`
    When the verify's ask is answered and its re-drive answers `done`
    Then the verify run was re-driven with the answer and settled `done` once, and `settleStoryCycle` answered `next: "verify"`

  Scenario: an interrupt standing when the drive settles opens no ask
    Given a stop request stands when `03/01`'s drive settles `needs-input`
    When the site reads the source
    Then the loop halts `operator-interrupt` and names session `S1`, and no ask file exists for that run

  Scenario: an interrupt during the wait parks and halts on the stop, not on the question
    Given the stop request is written during the wait
    When the next check runs
    Then the ask file reads `parked`, the loop halts `operator-interrupt`, the request is marked honoured, and `fetch` was called only for `session-needs-input`

  Scenario Outline: every primary site resumes the waiting run and carries on as a first drive would
    Given <site> answers `needs-input` with session `S1`, its ask is answered `"go"` before the first check, and the re-drive answers <redrive>
    When `runLoopBody` walks scope `03`
    Then the re-drive reused the waiting run's `runId` and `attempt`, with `ctx.loopDrive.answer` `{ runId, sessionId: "S1", text: "go" }` and no `ctx.loopDrive.fix`
    And <then>

    Examples:
      | site                                                                  | redrive                                                   | then                                                                                                  |
      | the refine drive of `03/01`                                           | `done`                                                    | that run settled `done` once, and the walk drove the act after `03/01`                               |
      | the refine drive of `03/01`                                           | `failed` / `agent_error`                                  | that run settled `failed` once, and the narration holds `Retrying 03/01 — refine, attempt 2 of 3 (agent_error).` |
      | the refine drive of `03/01`                                           | `needs-input`, whose ask is answered `"and B"`, then `done` | the driver was launched three times, the third typing `"and B"`, and that run settled `done` once with two answered asks |
      | the sequential build of `03/01`, carrying a pending review fix        | `done`                                                    | the typed body is exactly `"go"`, with no `## REVIEW FINDINGS`, and `settleStoryCycle` graded that run |
      | attempt 2 of `03/01`'s build, after attempt 1 failed `agent_error`    | `done`                                                    | attempt 2 settled `done` once, and no attempt 3 was minted                                            |
      | attempt 2 of `03/01`'s build, after attempt 1 failed `agent_error`    | `failed` / `agent_error`                                  | attempt 2 settled `failed` once, and attempt 3 was minted                                             |
      | the verify drive of `03/01` after a clean grade                       | `done`                                                    | the verify run settled `done` once, and `settleStoryCycle` answered `next: "verify"`                 |
      | the verify drive of `03/01` after a clean grade, with a `@uat` task   | `done`                                                    | the loop halted `uat-gate` at `03/01`                                                                 |

  Scenario Outline: a park at any primary site halts on the question, and keeps the resume command
    Given `ctx.askWait` parks at the first check, and <site> answers `needs-input` with session `S1`
    When `runLoopBody` walks scope `03`
    Then the halt line reads `03 — halted on session-needs-input at 03/01 (producer driver:needs-input). Resume with: aof work loop 03 --resume` before its `Details`
    And `Details` carry `parked` with one entry whose `sessionId` is `S1` and whose `runId` is <run>, and that run is still `running` with one parked ask

    Examples:
      | site                                                               | run                   |
      | the refine drive of `03/01`                                        | the refine run        |
      | attempt 2 of `03/01`'s build, after attempt 1 failed `agent_error` | attempt 2's run       |
      | the verify drive of `03/01` after a clean grade                    | the verify run        |

  Scenario Outline: a stop before the ask opens nothing, and a stop during the wait parks the ask and halts on the stop
    Given <site> answers `needs-input` with session `S1`, and <stop>
    When `runLoopBody` walks scope `03`
    Then the loop halts `operator-interrupt`, producer <producer>, at `03/01`, and its `Details` name `sessionId=S1` and <parked>
    And the ask file for that run <file>, `fetch` was called <calls>, and the request is <marked>

    Examples:
      | site                                    | stop                                              | producer       | parked                  | file           | calls                            | marked                   |
      | the refine drive of `03/01`             | a stop request stands when the drive settles      | `stop-request` | no `parked`             | does not exist | never                            | marked honoured          |
      | attempt 2 of `03/01`'s build            | a stop request stands when the attempt settles    | `stop-request` | no `parked`             | does not exist | never                            | marked honoured          |
      | the verify drive of `03/01`             | a stop request stands when the verify settles     | `stop-request` | no `parked`             | does not exist | never                            | marked honoured          |
      | the refine drive of `03/01`             | a stop request is written before the second check | `stop-request` | `parked` naming `S1`    | reads `parked` | once, for `session-needs-input`  | marked honoured          |
      | attempt 2 of `03/01`'s build            | a stop request is written before the second check | `stop-request` | `parked` naming `S1`    | reads `parked` | once, for `session-needs-input`  | marked honoured          |
      | the verify drive of `03/01`             | a stop request is written before the second check | `stop-request` | `parked` naming `S1`    | reads `parked` | once, for `session-needs-input`  | marked honoured          |
      | the refine drive of `03/01`             | one `SIGINT` arrives before the second check      | `SIGINT`       | `parked` naming `S1`    | reads `parked` | once, for `session-needs-input`  | absent, as none was made |

  Scenario Outline: a stop that rises while the answered re-drive runs is an interrupt over that drive
    Given the refine drive of `03/01` answers `needs-input` with session `S1`, its ask is answered `"go"`, and <stop> while the re-drive runs
    When `runLoopBody` walks scope `03`
    Then the re-drive's run settled <state>, the loop halted `operator-interrupt` at `03/01` with <named>
    And the record's last ask carries `answer` `"go"`, and the ask file is gone

    Examples:
      | stop                                  | state       | named                                         |
      | a stop request is written             | `done`      | no `cancelled` in its `Details`               |
      | two `SIGINT`s arrive                  | `cancelled` | `cancelled=<that run>` in its `Details`       |

  Scenario Outline: the wait is charged to no attempt of the ladder
    Given `scheduleToCloseMs` is 3600000, attempt 1 of `03/01`'s build asks 10 min after it starts, its answer lands <wait> later, and the re-drive fails `agent_error` <after> after the answer
    When the retry ladder reads its budget for attempt 2
    Then it <ladder>

    Examples:
      | wait   | after  | ladder                                                    |
      | 3 h    | 10 min | mints attempt 2, having charged 20 min                    |
      | 3 h    | 55 min | halts `deadline-exhausted`, having charged 65 min         |
      | 1 s    | 10 min | mints attempt 2, having charged 20 min                    |

  Scenario Outline: an answer rides only the run that waited for it
    When `drivePhase` is called with <call>
    Then <outcome>

    Examples:
      | call                                                              | outcome                                                                                   |
      | `answer` and `retryRecord` = the waiting record                   | no run was minted, and `ctx.loopDrive` is `{ runId: <that runId>, answer, recordSettlementContext }` |
      | `answer`, `retryRecord` = the waiting record, and a `fix`         | no run was minted, and `ctx.loopDrive` carries `answer` and no `fix`                     |
      | `answer` and no `retryRecord`                                     | it throws a `TypeError`, no run was minted, and the driver was never called              |
