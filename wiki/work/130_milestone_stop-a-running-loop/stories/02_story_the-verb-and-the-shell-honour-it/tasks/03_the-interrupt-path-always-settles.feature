@executable @cli @work @work-stream
Feature: the interrupt path always settles — a drive that returns after a stop settles as it ended, a cancelled session settles cancelled, and no running row is left behind

  ADR-003 §3-§4, §7. Measured 2026-09-13: the post-drive interrupt branch returned BEFORE
  `settleDriven`, so 129/04's run is `running` to this hour with the driver's `failed/timeout`
  observation discarded — the leaked non-terminal row 20/ADR-006's dedup guard walls the next
  mint on. The order after a drive is now settle → interrupt → needs-input → retry: `phaseRun =
  await settleDriven(...)`, `driven.push(drivenRow(phaseRun))`, `await source.poll()`, and only then
  `if (source.level() >= 1) halt`. A drive that ended on its own settles as it ended (`done`,
  `failed/timeout`); a drive the source cancelled — the driver's `{ outcome: "failed",
  failureReason: "cancelled" }` — settles `cancelled` with `failureReason: null` through
  `transitionRunComplete(item, { outcome: "cancelled" })` (`running>cancelled`, the store untouched);
  its `driven` row reads `outcome: "cancelled"` — the row 129/04 task 06 defines for lanes. A
  `needs-input` drive is NOT settled (the session waits for the operator); an interrupt over it halts
  with `sessionId` in `Details`. The retry loop never sees a cancel — the halt returns first, and a
  `cancelled` record is `not-retryable` in any case. DEFAULT DECISION: the spend settle's
  `exitReason` for a cancel is `"error"`.

  RULINGS (QA, 2026-09-13). (1) §7's order — settle → interrupt → needs-input → retry — holds at
  ALL THREE drive sites (§1 composes the signal onto every drive), so a cancel during retry
  attempt 2 or during a verify drive halts `operator-interrupt` at that site, naming that run;
  it never falls through to the retry ladder as `run-not-retryable`, and no further attempt is
  minted. (2) The interrupt halt precedes the retry ladder outright: a `session_limit` failure
  under a level-1 source halts `operator-interrupt`, not `retry-parked`. (3) A cancel that lands
  after the tick-head poll and BEFORE the spawn is the driver's pre-spawn answer (`sessionId:
  null`, `processStarted: false`, `agent-session-driver.mjs:944`) and settles `cancelled` on the
  run `drivePhase` already minted. (4) `loop-command-stops.test.mjs`'s s12/s13 rows assert the
  interrupted run "stays `running`" — that assertion IS the measured defect; the accepting suite
  reads `done` there, and the row's meaning ("the loop halts on the signal after the drive")
  is unchanged.

  Background:
    Given a loop fixture over stream `03` with story `03/01` ready, an isolated aof home, and `report` collecting the lines
    And a fake `ctx.stopSource` whose level the test flips at a chosen moment, with `signal` from its own `AbortController`
    And a driver double that resolves as the test scripts and honours `options.signal` the way the real driver does — an abort while live resolves `{ outcome: "failed", failureReason: "cancelled", sessionId: "sess-1" }`, an abort before the spawn resolves the same with `sessionId: null`

  Scenario Outline: a drive that ended on its own settles as it ended before the halt
    Given the source's level flips to 1 with producer `"stop-request"` while the drive is in flight
    And the driver double resolves <driver>
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then the run record on disk reads `state` <state>, `failureReason` <reason>, `resumeAfter` <resumeAfter> — never `running`
    And the answer's `act.stop` is `"operator-interrupt"` and its `driven` deep-equals `[<row>]`
    And the printed lines carry `Driven 03/01 — continue (<outcome>).` before the halt line
    And no retry was minted and `spawnCalls` is 1

    Examples:
      | driver                                                   | state      | reason           | resumeAfter | row                                                                          | outcome |
      | `{ outcome: "done", sessionId: "sess-1" }`               | `"done"`   | `null`           | `null`      | `{ ref: "03/01", phase: "continue", outcome: "done", cycle: 1, attempt: 1 }`  | done    |
      | `{ outcome: "failed", failureReason: "timeout", … }`     | `"failed"` | `"timeout"`      | `null`      | `{ …, outcome: "failed" }`                                                    | failed  |
      | `{ outcome: "failed", failureReason: "agent_error", … }` | `"failed"` | `"agent_error"`  | `null`      | `{ …, outcome: "failed" }`                                                    | failed  |
      | `{ outcome: "failed", failureReason: "session_limit", … }` | `"failed"` | `"session_limit"` | set       | `{ …, outcome: "failed" }`                                                    | failed  |

  Scenario Outline: a drive the source cancelled settles cancelled, and the halt names the run
    Given the source's level flips to 2 with producer `"stop-request"` <when>, aborting `signal`
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then the driver double observed `options.signal.aborted` true and resolved `{ outcome: "failed", failureReason: "cancelled", sessionId: <sessionId> }` and `spawnCalls` is <spawns>
    And the run record on disk reads `state` `"cancelled"`, `failureReason` `null`, `sessionId` <sessionId>, and `updatedAt` set
    And the answer's `driven` deep-equals `[{ ref: "03/01", phase: "continue", outcome: "cancelled", cycle: 1, attempt: 1 }]`
    And the halt line ends `Details: signal=stop-request; level=2; request=<path>; by=umamis-msi:4242; cancelled=<that runId>.`
    And `readRuns(item)` holds no `running` row, and a fresh `transitionRunStart` on the item is admitted (the dedup guard is clear)

    Examples:
      | when                                            | sessionId  | spawns |
      | while the session is live                       | `"sess-1"` | 1      |
      | after the tick-head poll and before the spawn   | `null`     | 0      |

  Scenario Outline: the order holds at every drive site
    Given a scripted driver whose attempts resolve <script>, the cancel being the source's own abort
    And the source's level flips to <level> with producer `"stop-request"` while <site> is in flight
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then `act` is a halt on `operator-interrupt` at `03/01` with producer `"stop-request"`
    And `driven` maps over `(phase, attempt, outcome)` to <rows> and `spawnCalls` is <spawns>
    And the record of <site> reads `state` <state> and no attempt beyond it was minted
    And the halt line's `Details` <cancelled>

    Examples:
      | site                    | level | script                                     | rows                                                   | spawns | state         | cancelled                                  |
      | continue attempt 1      | 2     | cancel                                     | `[(continue, 1, cancelled)]`                           | 1      | `"cancelled"` | carry `cancelled=<attempt 1's runId>`      |
      | retry attempt 2         | 2     | `failed/timeout`, cancel                   | `[(continue, 1, failed), (continue, 2, cancelled)]`    | 2      | `"cancelled"` | carry `cancelled=<attempt 2's runId>`      |
      | retry attempt 2         | 1     | `failed/timeout`, `done`                   | `[(continue, 1, failed), (continue, 2, done)]`         | 2      | `"done"`      | carry no `cancelled=`                      |
      | the verify drive        | 2     | `done`, cancel                             | `[(continue, 1, done), (verify, 1, cancelled)]`        | 2      | `"cancelled"` | carry `cancelled=<the verify runId>`       |
      | the verify drive        | 1     | `done`, `done`                             | `[(continue, 1, done), (verify, 1, done)]`             | 2      | `"done"`      | carry no `cancelled=`                      |

  Scenario: the record's shape is the sixteen keys and the store is untouched
    Given the live-session cancel row above has run
    Then the cancelled record's keys deep-equal the sixteen keys FF-5307 pins, in order
    And the SHA-256 of `src/run-store.mjs` equals the digest `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs` pins

  Scenario Outline: needs-input is not settled, and an interrupt over it names the session
    Given the driver double resolves `{ outcome: "needs-input", sessionId: "sess-1" }`
    And the source's level flips to <level> after the drive returns
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then the run record still reads `state` `"running"` with `sessionId` `"sess-1"` — the store's design for a parked session
    And the answer's `act.stop` is `"operator-interrupt"` and the halt line's `Details` carry `sessionId=sess-1` and <cancelled>

    Examples:
      | level | cancelled                 |
      | 1     | no `cancelled=`           |
      | 2     | no `cancelled=`           |

  Scenario: a cancel is never retried
    Given `work.autonomous.maxAttempts` is 3 and the live-session cancel row's record exists
    When `runLoopBody({ scope: "03", resume: true }, ctx)` is awaited with the source at level 0
    Then no `Resumed 03/01 — attempt 2` line is printed and `retryReadiness(record, 3, now)` reads `state: "not-retryable"`

  Scenario: the settle conflict narration still covers a record settled from under the shell
    Given the driver double resolves `done` and, before the shell settles, the record is settled `done` by another writer
    When `runLoopBody({ scope: "03" }, ctx)` is awaited with the source at level 1 after the drive
    Then a `Settle conflict on 03/01 — …` line is printed and the loop still halts `operator-interrupt` with the record as it stands

  Scenario: the early return is gone
    When the comment-stripped source of `src/commands/loop.mjs` is read
    Then for every `await drivePhase(` site, the binding it assigns reaches a `settleDriven(` call before any `return` in the enclosing block
    And `settleDriven`'s terminal word is computed from `outcome.failureReason === "cancelled"` as `"cancelled"` with `failureReason` `null`
