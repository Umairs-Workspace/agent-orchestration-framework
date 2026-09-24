@executable @cli @work @work-stream
Feature: one composer records the ask, tells the operator, waits without charging anyone, and re-drives the same session with the answer

  ADR-001 §1, §3-§5, and ADR-004 §1 and §6. `src/loop/ask.mjs` is the ONE owner-side composer.
  `awaitAnswer(phaseRun, { drive, ref, phase, item, scope, loopRunId, workspaceId, transitionOptions },
  deps)` is called with an UNSETTLED phase run whose outcome is `needs-input`. It runs in this
  order. It reads the question through `readAskQuestion` (131/01), writes `openRunAsk` on the record,
  writes `openAsk` to the ask file, notifies `session-needs-input` through `notify` with an
  envelope from `buildNotifyEnvelope` (131/02), and narrates the waiting row. Then it waits. At each
  check it reads the ask file, beats the run, and re-narrates the row once every `heartbeatMs`. On
  `answered` it writes `answerRunAsk`, narrates `answered by <who>`, and calls `drive(answer)`, the
  site's own closure. It calls `clearAsk` when that drive returns, unless the resumed session asked
  again. It answers `{ phaseRun }`, still unsettled, or `{ parked }`. `parkedHalt(parked,
  haltDecision)` is the one place `"session-needs-input"` is spelled as a halt. `PHASE_WORDS` maps
  the drive phase onto DESIGN's three words.

  RULINGS (PO, 2026-09-23).
  (1) The wait's seam is `deps.askWait`, shaped like the stop source. It has four members:
  `read(runId)` answers the ask record or `null`, `now()` answers a `Date`, `expired(elapsedMs)`
  answers a boolean, and `next()` resolves at the next check. `defaultAskWait({ dir, bounds, timers })`
  builds the production seam. `read` is `createAskPoll`'s `ask()`, and the poll interval is 2000 ms.
  `expired` is `decideScheduleToClose({ elapsedMs, ceilingMs: bounds.scheduleToCloseMs }).act === "halt"`.
  One check runs in this order: `read`, then `deps.stopping()`, then `expired`. An answer already
  in the file wins over both. An injected `askWait` whose `expired` answers `true` parks an
  unanswered ask at the first check. This is the immediate park the needs-input suites use.
  (2) `elapsedMs` for the bound is `now − max(askedAt, deps.invokedAt)`, per ADR-001 §4.
  `deps.invokedAt` is the invocation's start. The `elapsedMs` on the ask envelopes and the rows is
  `now − record.createdAt`, the attempt's wall time (ADR-005 §3).
  (3) The beat is `heartbeatLine(runId, at)` appended to the run's item `runs/.heartbeats.ndjson`,
  then `consumeHeartbeatQueue(item)`: the hook's own queue, the wave run's beat. It fires at most
  once per `floor(heartbeatMs / 3)` of `now()`, and it is best-effort (`reportDegrade("loop-ask-heartbeat")`).
  (4) `deps.stopping()` is read at every check. When it answers `true` the ask is parked with no
  notification: the operator is present, or the loop is already ending on another halt and says so
  itself. A stop parks a waiting run and never cancels it. A primary site passes
  `() => source.level() >= 1`, after polling the source. The wave passes its own `stopping()`, or
  a halt it already holds (task 02, ruling 4).
  (5) Parking stamps `parkAsk` and `parkRunAsk`, narrates the parked row and answers `{ parked: {
  ref, runId, sessionId, askedAt, question } }`. It notifies `session-parked-unanswered` only when
  the bound parked it. The record stays `running`, and nothing settles it.
  (6) The answer is typed VERBATIM. `drive` receives `{ runId, sessionId, text }`, with `text`
  equal to the file's `answer`, byte for byte. `by` on the record is the file's `by.actor`.
  (7) A re-drive that answers `needs-input` again goes round the same loop. Its `openRunAsk`
  appends a second entry, and its `openAsk` overwrites the file, so `clearAsk` is skipped.
  (8) `PHASE_WORDS` is frozen: `refine` → `refine`; `continue` and `fix` → `build`; `verify` →
  `verify`. An unmapped phase reads `null`, and `cost` then omits itself (131/02 task 01).
  (9) Nothing in `ask.mjs` writes a PTY, imports the session driver or imports a terminal-input
  module (ADR-001's invariant).
  (10) `notify` is awaited and never throws (131/02 task 05). Its answer changes nothing here.

  RULINGS (QA, 2026-09-23). (1) A `null` read (the file absent or not a record), a `waiting` read
  and a `parked` read are not answers, and the check goes on to `stopping()` and `expired`. Nothing
  in the wait re-opens a file. At the bound over an absent file, `parkAsk` answers `null`, and the
  record is still stamped, the row narrated and the notice sent. (2) An `answered` read whose
  `answer` is not a non-empty string is not an answer (task 03 would refuse it). (3) NARROWS PO
  ruling (1), for the PO to ratify: once the stop has reached its signal (level 2), the check never
  re-drives. It parks silently, an `answered` file stays `answered` (`parkAsk` leaves it), and
  `--resume` re-enters it answered (task 04). A re-drive under an aborted signal settles `cancelled`
  at once and spends the answer on a session that never saw it. (4) The beat fires at the first
  check, then whenever `now()` has moved at least `max(1, floor(heartbeatMs / 3))` since the last
  beat, the wave's own interval. The waiting row is re-narrated at the first check where `now()` has
  moved at least `heartbeatMs` since the last one, inclusive. (5) The bound's `elapsedMs` is clamped
  at 0, and an absent `deps.invokedAt` reads as `askedAt`. `defaultAskWait`'s `expired` is
  `decideScheduleToClose`'s literal answer, so an elapsed it refuses reads `false`. (6) A refusal from
  `openRunAsk` is thrown unchanged, with no file, no notice and no row: the record is the first
  write. (7) `PHASE_WORDS` answers only its own keys. (8) `parkedHalt` orders by `askedAt`, then by
  `runId`, and throws a `TypeError` for an empty or non-array list, so a halt never names a null ref.
  (9) The answered row's `<who>` is `by.actor`, and a `null` `by` reads `answered` (131/02 task 01,
  QA ruling 3). (10) The parked entry's `askedAt` is the record entry's, which a re-entry never
  re-stamps. (11) A re-ask takes the re-drive's own `sessionId`.

  RULINGS (PO, answering QA, 2026-09-23). (11) QA ruling (3) is RATIFIED. At level 2 the check
  never re-drives. An `answered` file stays `answered` for `--resume` to re-enter, because a
  re-drive under an aborted signal would spend the answer on a session that never saw it.
  (12) AMENDS PO ruling (3). `69/FF-6903` (extended) pins the hook's heartbeat bytes inside
  `wave.mjs`, so the composer may not copy `heartbeatLine`. The enqueue (the hook's exact bytes,
  the append to `runs/.heartbeats.ndjson` and `consumeHeartbeatQueue`) moves to ONE export,
  `enqueueHeartbeat(item, runId, at)` in `src/run-heartbeat-consumption.mjs`, beside the queue's
  name. The wave's `beatWaveRun` and this composer both call it. The wave keeps its one armed
  interval, and `ask.mjs` arms no timer of its own: it beats at its checks. FF-6903's wave leg is
  re-aimed at the export, and the composer's beat is admitted by name (ADR-001 §3), in the same
  change.

  RULINGS (PO, answering the developer, 2026-09-23).
  (13) AMENDS PO rulings (1) and (12): THE WAIT HOLDS THE PROCESS OPEN. At needs-input the PTY is
  released, and every interval live during a wait is `unref`'d. A wait that rode `createAskPoll`
  would leave nothing holding the event loop, and the loop would exit on `beforeExit`, which is
  129's silent-death class. `defaultAskWait`'s `next()` is therefore a REF'D
  `timers.setTimeout(pollMs)`, one per check and cleared when the wait ends. Its `read(runId)` is
  `readAsk(dir, runId)` at each check. `createAskPoll` is not on this path. `ask.mjs` holds no
  `setInterval`. A case asserts that a production wait keeps `beforeExit` from firing while the
  ask stands.
  (14) THE STATE WORDS. `ask.mjs` and `drive.mjs` spell no ask-state literal. Each one
  destructures the imported `ASK_STATES` once, in 01's order (`waiting | parked | answered`), and
  compares against those names. FF-13101 (131/06) counts both files as importers.
  (15) THE SEAMS, NAMED. `awaitAnswer`'s first bag gains `cwd`, the tree the session ran in: the
  lane worktree, or `ctx.workspace.projectRoot`. `deps` names `env` (the transcript's env,
  `ctx.agentSessionDriverOptions?.env ?? process.env`, so `CLAUDE_CONFIG_DIR` isolates the
  suites), `notifyOptions` (`ctx.notifyOptions`, the `{ env, fetch }` 02's accept site
  passes), `aborted()` (level 2, for QA ruling 3), `stopping()`, `invokedAt`, `narrate`,
  `askWait` and `enqueueHeartbeat`. `enqueueHeartbeat` defaults to the export and is injectable.
  It THROWS, and the caller degrades under its own code.
  (16) The QA fault row "appending … throws `EACCES`" is reworded to an injected
  `enqueueHeartbeat` that throws, because an `EACCES` cannot be produced on Windows without a seam.
  (17) A re-drive that asks again while `stopping()` answers `true` still records the new ask
  (`openRunAsk` and `openAsk`: the question is kept). It sends no notice, and it parks at once
  and silently.
  (18) The cases of this task live in `test/loop/loop-command-stops.test.mjs`. `test/loop` is at
  its ceiling, and this is the needs-input stop's own suite.

  Background:
    Given a fixture item `03/01` in a temporary repo under an isolated `AOF_GLOBAL_HOME`, and a run `R` minted on it at `2026-09-23T17:00:00.000Z`
    And the driven outcome is `{ outcome: "needs-input", sessionId: "S1" }`, and the transcript of `S1` ends with a `Decision needed:` turn
    And `notify` is reached through an injected `fetch` spy, with one `discord` channel configured
    And `narrate` is a collector, and `askWait` is an injected fake whose clock the case advances

  Scenario: the ask is recorded, announced and narrated before the wait begins
    When `awaitAnswer` is called and the fake's first `next()` is still pending
    Then the record for `R` carries one ask whose `question` is the transcript's words minus the sentinel, and whose `phase` is `build`
    And the ask file for `R` reads `waiting` with `sessionId` `S1`
    And `fetch` was called once, with a body whose `content` begins `**03/01 — waiting on you (build, `
    And the collector's last line is `accountLine` of that envelope

  Scenario: an answer re-drives the same session with the answer typed, and then clears the file
    Given the ask file for `R` is answered `"take option B"` by actor `umami`
    When the next check reads it
    Then the record's last ask carries `answer` `"take option B"`, `by` `"umami"` and an `answeredAt`
    And `drive` was called once with `{ runId: "R", sessionId: "S1", text: "take option B" }`
    And when that drive answers `done`, `awaitAnswer` answers `{ phaseRun }` with the drive's run, unsettled, and the ask file is gone
    And the collector holds `03/01 — answered by umami (build, <elapsed>)`

  Scenario: the bound parks the run, says so once, and leaves it running
    Given `askWait.expired` answers `true` from the third check
    When the third check runs
    Then the ask file reads `parked`, and the record's last ask carries a `parkedAt`
    And `fetch` was called a second time, for `session-parked-unanswered`
    And `awaitAnswer` answers `{ parked: { ref: "03/01", runId: "R", sessionId: "S1", askedAt, question } }`
    And the record for `R` is still `running`

  Scenario: a stop parks the wait and tells nobody
    Given `deps.stopping()` answers `true` from the second check
    When the second check runs
    Then the ask file reads `parked`, `awaitAnswer` answers `{ parked }`, and `fetch` was called only for `session-needs-input`

  Scenario: the waiting run is beaten while it waits, and the wait is charged to nobody
    Given `heartbeatMs` is 300000 and the fake clock advances 100000 ms per check
    When ten checks pass unanswered
    Then the run's consumed `heartbeatAt` is no older than the last check
    And the waiting row was narrated at the ask and then once per 300000 ms of the fake clock
    And `attemptElapsedMs` over the record equals the attempt's time with the ask interval removed

  Scenario: a session that asks again goes round the loop, and the file keeps the new question
    Given the re-drive answers `needs-input` again with a new question
    When the second ask's answer arrives and its drive answers `done`
    Then `drive` was called twice, the record carries two asks, and the first carries the first answer
    And `clearAsk` ran once, after the second drive

  Scenario: the halt is minted in one place
    When `parkedHalt([p1, p2], haltDecision)` is called with two parked entries
    Then it answers `{ act: haltDecision("session-needs-input", p1.ref, "driver:needs-input"), details: { parked: [p1, p2] } }`, with the entries ordered by `askedAt`
    And `LOOP_STOPS` is unchanged

  Scenario Outline: one check reads the file, then the stop, then the bound, and the first that decides wins
    Given at the first check the ask file <file>, `deps.stopping()` answers <stopping>, the stop's signal <signal>, and `askWait.expired` answers <expired>
    And a re-drive answers `done`
    When the first check runs
    Then `awaitAnswer` <result>
    And `fetch` was called <calls>, and the ask file then <after>

    Examples:
      | file                                  | stopping | signal      | expired | result                                                   | calls                                   | after             |
      | reads `waiting`                       | `false`  | is live     | `false` | awaits the next check, and `drive` is not called         | once, for `session-needs-input`         | reads `waiting`   |
      | reads `answered` `"b"`                | `false`  | is live     | `false` | calls `drive` with `text` `"b"`                          | once, for `session-needs-input`         | is gone           |
      | reads `answered` `"b"`                | `true`   | is live     | `true`  | calls `drive` with `text` `"b"`                          | once, for `session-needs-input`         | is gone           |
      | reads `answered` `"b"`                | `true`   | has aborted | `false` | answers `{ parked }`, and `drive` is not called          | once, for `session-needs-input`         | reads `answered`  |
      | reads `waiting`                       | `true`   | is live     | `true`  | answers `{ parked }`                                     | once, for `session-needs-input`         | reads `parked`    |
      | reads `waiting`                       | `true`   | is live     | `false` | answers `{ parked }`                                     | once, for `session-needs-input`         | reads `parked`    |
      | reads `waiting`                       | `false`  | is live     | `true`  | answers `{ parked }`                                     | twice, then `session-parked-unanswered` | reads `parked`    |
      | reads `parked`                        | `false`  | is live     | `false` | awaits the next check                                    | once, for `session-needs-input`         | reads `parked`    |
      | does not exist                        | `false`  | is live     | `false` | awaits the next check                                    | once, for `session-needs-input`         | does not exist    |
      | does not exist                        | `false`  | is live     | `true`  | answers `{ parked }`, the record's last ask carrying a `parkedAt` | twice, then `session-parked-unanswered` | does not exist |
      | holds `{ not json`                    | `false`  | is live     | `false` | awaits the next check                                    | once, for `session-needs-input`         | is byte-unchanged |
      | reads `answered` with `answer` `""`   | `false`  | is live     | `false` | awaits the next check                                    | once, for `session-needs-input`         | is byte-unchanged |
      | reads `answered` with `answer` `null` | `false`  | is live     | `true`  | answers `{ parked }`, and `drive` is not called          | twice, then `session-parked-unanswered` | is byte-unchanged |

  Scenario Outline: the beat and the re-narrated row keep their own cadences
    Given `heartbeatMs` is <heartbeatMs>, and the fake clock advances <step> ms per check from the ask
    When <checks> checks pass unanswered
    Then the item's `runs/.heartbeats.ndjson` gained <beats> lines for `R`, and the collector holds the waiting row <rows> times

    Examples:
      | heartbeatMs | step   | checks | beats | rows |
      | 300000      | 100000 | 10     | 10    | 4    |
      | 300000      | 2000   | 149    | 3     | 1    |
      | 300000      | 2000   | 150    | 3     | 2    |
      | 300000      | 99999  | 3      | 2     | 1    |
      | 2           | 1      | 3      | 3     | 2    |
      | 300000      | 0      | 5      | 1     | 1    |

  Scenario Outline: nothing the wait leans on can end it
    Given the ask is made at `2026-09-23T17:12:00.000Z` over a transcript asking `Decision needed: pick a store?`, and <fault>
    When `awaitAnswer` is called and the third check reads `answered` `"b"`
    Then `drive` was called once with `text` `"b"`, and the degrade sink received <degrade>
    And the record's first ask carries `question` <question>, and the first waiting row is `<row>`

    Examples:
      | fault                                                                   | degrade                        | question                           | row                                                                 |
      | `fetch` answers `204`                                                   | nothing                        | `"Decision needed: pick a store?"` | 03/01 — waiting on you (build, 12m): Decision needed: pick a store? |
      | `fetch` answers `500`                                                   | one `notify-delivery-failed`   | `"Decision needed: pick a store?"` | 03/01 — waiting on you (build, 12m): Decision needed: pick a store? |
      | `fetch` throws a `TypeError`                                            | one `notify-delivery-failed`   | `"Decision needed: pick a store?"` | 03/01 — waiting on you (build, 12m): Decision needed: pick a store? |
      | the workspace has no `work.notify`, so `fetch` is never called          | nothing                        | `"Decision needed: pick a store?"` | 03/01 — waiting on you (build, 12m): Decision needed: pick a store? |
      | the injected `enqueueHeartbeat` throws at every check                    | one `loop-ask-heartbeat`       | `"Decision needed: pick a store?"` | 03/01 — waiting on you (build, 12m): Decision needed: pick a store? |
      | the transcript of `S1` does not exist                                   | one `ask-question-unreadable`  | `null`                             | 03/01 — waiting on you (build, 12m)                                 |
      | the transcript instead ends in an unanswered `AskUserQuestion` for `Which store?` with options `sqlite` and `json` | nothing | `"Which store?\n- sqlite\n- json"` | 03/01 — waiting on you (build, 12m): Which store? - sqlite - json |

  Scenario Outline: a record that refuses the ask stops everything after it
    Given the record for `R` <state>
    When `awaitAnswer` is called
    Then it throws the store's `<code>` refusal, no ask file exists for `R`, `fetch` was never called and nothing was narrated

    Examples:
      | state                                     | code           |
      | is settled `failed`                       | no-running-run |
      | already carries a last ask with no answer | run-ask-open   |

  Scenario Outline: the bound counts from the later of the ask and the invocation, and parks at the ceiling
    Given `askWait` is `defaultAskWait({ dir, bounds: { scheduleToCloseMs: 3600000 }, timers })` over the fake clock
    And the ask is made at <askedAt>, and `deps.invokedAt` is <invokedAt>
    When a check runs unanswered at <now>
    Then its `expired` was asked of <elapsedMs>, and the ask <parks>

    Examples:
      | askedAt                    | invokedAt                  | now                        | elapsedMs | parks                                            |
      | `2026-09-23T17:12:00.000Z` | `2026-09-23T16:00:00.000Z` | `2026-09-23T18:12:00.000Z` | 3600000   | parks, and `session-parked-unanswered` is sent   |
      | `2026-09-23T17:12:00.000Z` | `2026-09-23T16:00:00.000Z` | `2026-09-23T18:11:59.999Z` | 3599999   | still waits                                      |
      | `2026-09-23T17:12:00.000Z` | `2026-09-23T17:42:00.000Z` | `2026-09-23T18:12:00.000Z` | 1800000   | still waits                                      |
      | `2026-09-23T17:12:00.000Z` | absent                     | `2026-09-23T17:12:30.000Z` | 30000     | still waits                                      |
      | `2026-09-23T17:12:00.000Z` | absent                     | `2026-09-23T17:11:00.000Z` | 0         | still waits                                      |

  Scenario Outline: every re-drive ends the loop except a fresh question
    Given the ask file is answered `"b"` at the first check, and the re-drive answers <redrive>
    When `awaitAnswer` runs to its end
    Then it answered <answer>, and `drive` was called <drives>
    And the record carries <asks>, `fetch` was called <notices> for `session-needs-input`, and the ask file <file>

    Examples:
      | redrive                                                                                 | answer                                                | drives                              | asks                               | notices | file                                     |
      | `done`                                                                                  | `{ phaseRun }` whose outcome is `done`, unsettled     | once                                | one answered ask                   | once    | is gone                                  |
      | `failed` / `agent_error`                                                                | `{ phaseRun }` whose outcome is `failed`, unsettled   | once                                | one answered ask                   | once    | is gone                                  |
      | `cancelled`                                                                             | `{ phaseRun }` whose outcome is `cancelled`           | once                                | one answered ask                   | once    | is gone                                  |
      | `needs-input` asking `Decision needed: Y`, whose ask is answered `"c"`, and then `done` | `{ phaseRun }` whose outcome is `done`                | twice, the second with `text` `"c"` | two answered asks                  | twice   | is gone                                  |
      | `needs-input` asking `Decision needed: Y`, and the bound then parks it                  | `{ parked }` whose `question` is `Decision needed: Y` | once                                | an answered ask, then a parked one | twice   | reads `parked` with `Decision needed: Y` |
      | `needs-input` under session `S2`, and the bound then parks it                           | `{ parked }` whose `sessionId` is `S2`                | once                                | an answered ask, then a parked one | twice   | reads `parked` with `sessionId` `S2`     |

  Scenario Outline: the drive phase maps onto the design's three words, and nothing else does
    When the ask is made at `2026-09-23T17:12:00.000Z` for drive phase <phase>, the transcript asking `Decision needed: pick a store?`
    Then `PHASE_WORDS` is frozen and answers <word> for it, and the first waiting row is `<row>`

    Examples:
      | phase         | word       | row                                                                  |
      | `"refine"`    | `"refine"` | 03/01 — waiting on you (refine, 12m): Decision needed: pick a store? |
      | `"continue"`  | `"build"`  | 03/01 — waiting on you (build, 12m): Decision needed: pick a store?  |
      | `"fix"`       | `"build"`  | 03/01 — waiting on you (build, 12m): Decision needed: pick a store?  |
      | `"verify"`    | `"verify"` | 03/01 — waiting on you (verify, 12m): Decision needed: pick a store? |
      | `"gate"`      | `null`     | 03/01 — waiting on you: Decision needed: pick a store?               |
      | `"__proto__"` | `null`     | 03/01 — waiting on you: Decision needed: pick a store?               |
      | `undefined`   | `null`     | 03/01 — waiting on you: Decision needed: pick a store?               |

  Scenario Outline: the answered row names the actor, or nobody
    Given the ask file is answered `"b"` at `2026-09-23T20:10:00.000Z` with `by` <by>
    When the check reads it
    Then the collector holds `<row>`, and the record's last ask carries `by` <recorded>

    Examples:
      | by                                                  | recorded  | row                                       |
      | `{ actor: "umami", via: "cli", node: "node-7297" }` | `"umami"` | 03/01 — answered by umami (build, 3h 10m) |
      | `null`                                              | `null`    | 03/01 — answered (build, 3h 10m)          |

  Scenario Outline: the halt is minted over any number of parked entries, in the order they asked
    When `parkedHalt(<parked>, haltDecision)` is called
    Then it <answer>

    Examples:
      | parked                                             | answer                                                        |
      | `[p1]`                                             | answers the halt at `p1.ref` with `details.parked` `[p1]`     |
      | `[p2, p1]`, `p1` asked first                       | answers the halt at `p1.ref` with `details.parked` `[p1, p2]` |
      | `[pb, pa]`, equal `askedAt`, run ids `Rb` and `Ra` | answers the halt at `pa.ref` with `details.parked` `[pa, pb]` |
      | `[]`                                               | throws a `TypeError`, and `haltDecision` was never called     |

  Scenario: the beat has one home
    When the composer beats the waiting run and the wave beats its wave run
    Then both lines were appended through `enqueueHeartbeat`, each is byte-equal to the hook's `${JSON.stringify({ runId, at })}\n`
    And `test/arch/mesh/acd-heartbeat-by-consumption.test.mjs` finds the bytes only in `src/run-heartbeat-consumption.mjs` and the hook, one armed `setInterval` in `wave.mjs`, and none in `src/loop/ask.mjs`
