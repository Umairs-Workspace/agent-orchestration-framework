@executable @cli @work @work-stream
Feature: a loop that halts says so once on the channel, and the next invocation reports the death of one that never did

  ADR-005 §4. This story owns three of the six firing points. `loop-halted` is fired by the
  `work:loop` launch body, once, after the final account, for every halt except
  `session-needs-input`. `loop-died` and `loop-relaunched` are fired by the `--resume` branch of
  `src/commands/loop.mjs` when the declaration's latest run is `running` and stale:
  `loop-relaunched` when the declaration is `supervised`, else `loop-died`. Their `cause` is the
  last line of the scope's newest diag log, read by `readLastLoopDiagEvent` in `src/loop-diag.mjs`,
  or `null`. Every envelope comes from `buildNotifyEnvelope` (131/02 task 03), and each call is a
  literal `notify(` at its site, so FF-13107 (131/06) can count the six.

  RULINGS (PO, 2026-09-23).
  (1) `loop-halted` carries `stop: { id: act.stop, producer: act.producer, remedy, ref: act.ref }`,
  per 02's amendment. `remedy` is the act's own `remedy` when it has one, and `null` otherwise. The
  envelope's `ref` is the loop's SCOPE, `elapsedMs` is `now − startedAt` of this invocation, and
  `phase` is `null`.
  (2) It fires after `reportLine` has printed the whole account, and before the body returns. It
  fires at most once per invocation, whichever return path produced the halt. It fires for
  `operator-interrupt` too: a stop may come from another machine. It never fires for `done`, a
  `handoff`, `--dry-run`, `--stop` or an `L1` report. It is awaited, and it never changes the
  returned state or the exit code.
  (3) `readLastLoopDiagEvent({ dir, scopeTag, exclude })` reads the newest `loop-diag.<scopeTag>.*.log`
  by name, skipping `exclude` (this invocation's own log, when diag is installed). It answers the
  last non-blank line parsed as `{ at, event, detail }` after `formatLoopDiagLine`'s shape, with
  `detail` `null` when absent. It answers `null` for no log, an empty log, or a last line that does
  not parse. An unreadable file answers `null` after one `reportDegrade("loop-diag-read")`. It never
  throws. `cause` is `<event>`, or `<event> <detail>` when there is a detail.
  (4) The death test: `resolved.resume.lastDeclaration` is non-null, and the run it was read from is
  in `resolved.resume.stranded`. A run whose last ask is standing is a WAIT and never a death, so
  it fires nothing (131/01's reclaim skip already keeps it out of `stranded`; this is asserted, not
  assumed). The event fires once, before the walk, after the stop request is cleared.
  (5) The death envelopes carry `elapsedMs` = `now − declaration.startedAt`, `outcome: { cause }`,
  and the envelope `ref` = the scope.
  (6) An unconfigured `work.notify` makes every one of these a zero-call no-op (131/02 task 05), so
  every existing loop suite passes unchanged.

  RULINGS (QA, 2026-09-23). (1) `loop-halted` fires only when the body RETURNS a halt. A body that
  throws fires nothing, since its death is the next `--resume`'s to report. `Nothing to resume` fires
  nothing, whatever act it carries, because that loop never ran. (2) A failing `notify` changes
  nothing: the state, the render and the exit code equal those of the same run with `work.notify`
  absent. (3) A line parses when, after `trimEnd()`, it reads `<at> <event>` or
  `<at> <event> <detail>`. `<at>` must satisfy `new Date(at).toISOString() === at`. `<event>` is
  non-empty and holds no space. `<detail>` is the rest after that single space, verbatim. A stack
  frame, a bare instant or a doubled space does not parse, and the reader answers `null` without
  walking back. (4) Only `loop-diag.<scopeTag>.<stamp>.log` names count, the tag matched as the
  whole second dot-segment. The NEWEST name decides, so an empty or unreadable newest log answers
  `null` with no fall-back. `exclude` is compared by base name, and an absent directory answers
  `null` with no degrade. (5) Relaunched or died is decided by the PRIOR declaration's `supervised`,
  never by this invocation's flag. (6) Only the latest declared run is read. A stale older run
  behind a newer settled one fires nothing. (7) These cases drive the launch body with the seams the
  stops fixture gives `runLoopBody` (the fake PTY, `ctx.askWait` and `notify`'s `fetch`). How the
  launch body receives them is the builder's choice.

  RULINGS (PO, answering QA, 2026-09-23).
  (7) THE LAUNCH SEAM, answering QA ruling (7). The `cli.launch` closure keeps only the diag
  install and the printer. Everything after that goes through a new export,
  `runLoopLaunch(input, ctx)` in `src/commands/loop.mjs`. It awaits `runLoopBody` and then
  fires `loop-halted`. The closure passes it `diagLogPath`, the log it just installed (or
  `null`), and that path is `readLastLoopDiagEvent`'s `exclude`. The suites drive
  `runLoopLaunch` with the stops fixture's seams, and nothing installs the diag recorder.
  (8) AMENDS PO ruling (1), answering QA's question. `elapsedMs` on `loop-halted` is
  `now − startedAt`, where `startedAt` is the LOOP's, as ADR-005 §3 says: `runLoopBody`'s own,
  which a `--resume` inherits from the declaration. It is not this invocation's start.
  (9) THE CAUSE IS THE LAST LINE, as the ADR says, and it will often be plain. A real crash ends
  `exit code=1`, and a host that slept ends on an `alive` line. The fixture uses a real
  recorder event, not an invented one. A richer cause belongs to the death forensics, not this story.
  (10) QA rulings (1) to (6) are RATIFIED.

  RULINGS (PO, answering the developer, 2026-09-23).
  (11) THE SINK. `loopState` carries no `startedAt`, `actShape` drops `remedy`, and the loop
  document's keys are frozen. So `runLoopBody` calls `ctx.onLoopEnd?.({ act, startedAt, level,
  nothingToResume })` once, just before it returns a state. `runLoopLaunch` passes that sink and
  fires `loop-halted` from what it received. A body that throws calls no sink and fires nothing.
  (12) THE LATEST DECLARED RUN is answered by `readLoopDeclarationRun(runs)` in
  `src/work/loop.mjs`, beside `readLoopDeclaration`, on the same ordering. It is one reader and
  never a copy of `compareRuns` in the shell. `src/work/loop.mjs` joins this story's `files:`. 01
  writes it first (`attemptElapsedMs`), and 03 depends on 01.
  (13) `ask.mjs` exports `isParkedHalt(act)`, and `runLoopLaunch` skips `loop-halted` through it.
  The shell never spells the stop.
  (14) `readLastLoopDiagEvent`'s `dir` is `loopDiagLogDir(env)`, its `scopeTag` is
  `loopDiagScopeTag(["loop", scope])`, and its `exclude` is the installed handle's log path.

  Background:
    Given the loop-command-stops fixture under an isolated `AOF_GLOBAL_HOME`, a `work.notify` with one `discord` channel, and `notify` through an injected `fetch` spy

  Scenario: a halt is announced once, after the account
    Given `03/01`'s build fails `agent_error` on every attempt, so the loop halts `run-not-retryable`
    When the launch body runs `aof work loop 03`
    Then `fetch` was called once, with a body whose `content` begins `**03 — loop halted on run-not-retryable` and names `03/01`
    And that call happened after the last `report` line was collected

  Scenario: a halt on a question is not announced again
    Given `ctx.askWait` parks at the first check, and `03/01`'s drive answers `needs-input`
    When the launch body runs `aof work loop 03`
    Then `fetch` was called for `session-needs-input` and `session-parked-unanswered`, and never for `loop-halted`

  Scenario: a finished loop announces nothing of its own
    When the launch body runs `aof work loop 03` and the loop ends `done`
    Then `fetch` was never called for `loop-halted`

  Scenario: the next invocation reports a loop that died without a word
    Given a declared run of loop `03` left `running` and stale, unsupervised, and a diag log `loop-diag.03.<older stamp>.log` whose last line is `2026-09-23T15:00:00.000Z signal SIGHUP`
    When the launch body runs `aof work loop 03 --resume`
    Then `fetch` was called once for `loop-died`, whose envelope's `outcome.cause` is `signal SIGHUP`
    And it was called before the first drive of the walk

  Scenario: a supervised loop is reported relaunched
    Given the same stranded run, its declaration `supervised: true`
    When the launch body runs `aof work loop 03 --resume`
    Then `fetch` was called once for `loop-relaunched`, and never for `loop-died`

  Scenario: a run waiting on a human is not a death
    Given the loop's latest declared run is `running`, stale, and carries a standing ask
    When the launch body runs `aof work loop 03 --resume`
    Then `fetch` was never called for `loop-died` or `loop-relaunched`

  Scenario: the last diag event is read from the newest earlier log
    Given two logs for scope `03`, the newer one this invocation's own
    When `readLastLoopDiagEvent({ dir, scopeTag: "03", exclude: <the newer> })` is called
    Then it answers the older log's last line as `{ at, event, detail }`

  Scenario Outline: loop-halted fires once for every halt the body returns, and for nothing else
    Given <setup>
    When the launch body runs `aof work loop 03 <flags>`
    Then `fetch` was called <calls> for `loop-halted`, whose `stop.id` is <stop>

    Examples:
      | setup                                                        | flags        | calls | stop                   |
      | `03/01`'s build fails `agent_error` on every attempt         |              | once  | `run-not-retryable`    |
      | a stop request is written while `03/01` drives               |              | once  | `operator-interrupt`   |
      | `03/01`'s grade cannot be taken after a clean build          |              | once  | `grade-indeterminate`  |
      | every story of `03` ends `done`                              |              | never | none                   |
      | `ctx.askWait` parks at the first check                       |              | never | none                   |
      | no run of `03` carries a loop declaration                    | `--resume`   | never | none                   |
      | `03/01` is ready                                             | `--dry-run`  | never | none                   |
      | a loop over `03` is running                                  | `--stop`     | never | none                   |
      | `03/01` is ready                                             | `--level L1` | never | none                   |
      | the body throws a `TypeError` mid-walk, which reaches the launcher unchanged |  | never | none               |
      | `03/01`'s build fails on every attempt, and `fetch` throws   |              | once  | `run-not-retryable`, with the state and exit code of a run with no `work.notify` |

  Scenario Outline: the halt envelope names the scope, the stop, its producer and the halting ref
    Given the loop starts at `2026-09-23T17:00:00.000Z` and halts at `2026-09-23T18:30:00.000Z` on <halt>
    When the launch body announces it
    Then the envelope's `ref` is `03`, `phase` is `null`, `elapsedMs` is 5400000, `answerPath` is `aof work loop 03 --resume`, and `stop` is <stop>

    Examples:
      | halt                                                                 | stop                                                                                            |
      | `run-not-retryable` at `03/01`, producer `run-store:not-retryable`   | `{ id: "run-not-retryable", producer: "run-store:not-retryable", remedy: null, ref: "03/01" }` |
      | `operator-interrupt` at `03/01`, producer `SIGINT`                   | `{ id: "operator-interrupt", producer: "SIGINT", remedy: null, ref: "03/01" }`                  |

  Scenario Outline: the next invocation reports a death only where the latest declared run says one happened
    Given loop `03`'s latest declared run is <latest>, its declaration is <supervised>, and the newest diag log for `03` ends `2026-09-23T15:00:00.000Z exit code=1`
    When the launch body runs `aof work loop 03 --resume <flags>`
    Then `fetch` was called <fired>

    Examples:
      | latest                                                              | supervised         | flags          | fired                                                                     |
      | `running` and stale, with no ask                                    | unsupervised       |                | once, for `loop-died`, whose `outcome.cause` is `exit code=1`             |
      | `running` and stale, with no ask                                    | `supervised: true` |                | once, for `loop-relaunched`, and never for `loop-died`                    |
      | `running` and stale, with no ask                                    | unsupervised       | `--supervised` | once, for `loop-died`, and never for `loop-relaunched`                    |
      | the milestone's wave run, `running` and stale                       | unsupervised       |                | once, for `loop-died`                                                     |
      | `running` and stale, its last ask open                              | unsupervised       |                | never for `loop-died` or `loop-relaunched`                                |
      | `running` and stale, its last ask parked and unanswered             | `supervised: true` |                | never for `loop-died` or `loop-relaunched`                                |
      | `running` and stale, its last ask answered                          | unsupervised       |                | once, for `loop-died`                                                     |
      | `running` and fresh                                                 | unsupervised       |                | never for `loop-died` or `loop-relaunched`                                |
      | settled `done`                                                      | unsupervised       |                | never for `loop-died` or `loop-relaunched`                                |
      | settled `failed`                                                    | unsupervised       |                | never for `loop-died` or `loop-relaunched`                                |
      | settled `done`, with an older declared run `running` and stale      | unsupervised       |                | never for `loop-died` or `loop-relaunched`                                |
      | `running` and stale, with no ask, and `work.notify` absent          | unsupervised       |                | never at all                                                              |

  Scenario Outline: a death envelope counts from the declaration's own start
    Given the stale declaration started at `2026-09-23T12:00:00.000Z` and is <supervised>, and the resume runs at `2026-09-23T15:30:00.000Z`
    When the launch body runs `aof work loop 03 --resume`
    Then the `<event>` envelope has `ref` `03`, `phase` `null`, `elapsedMs` 12600000 and `answerPath` <answerPath>

    Examples:
      | supervised         | event           | answerPath                  |
      | unsupervised       | loop-died       | `aof work loop 03 --resume` |
      | `supervised: true` | loop-relaunched | `null`                      |

  Scenario Outline: the last line of the log is read in the recorder's own shape, or not at all
    Given the only log for scope `03` ends with <line>
    When `readLastLoopDiagEvent({ dir, scopeTag: "03" })` is called
    Then it answers <answer>, and a death's `outcome.cause` would read <cause>

    Examples:
      | line                                                                         | answer                                                                                    | cause                                          |
      | `2026-09-23T15:00:00.000Z exit code=1`                                       | `{ at: "2026-09-23T15:00:00.000Z", event: "exit", detail: "code=1" }`                     | `"exit code=1"`                                |
      | `2026-09-23T15:00:00.000Z beforeExit`                                        | `{ at: "2026-09-23T15:00:00.000Z", event: "beforeExit", detail: null }`                   | `"beforeExit"`                                 |
      | `2026-09-23T15:00:00.000Z uncaught TypeError: x is not a function`           | `{ at: "2026-09-23T15:00:00.000Z", event: "uncaught", detail: "TypeError: x is not a function" }` | `"uncaught TypeError: x is not a function"` |
      | `2026-09-23T15:00:00.000Z stdout 03 — halted on x (producer y).`             | `{ at: "2026-09-23T15:00:00.000Z", event: "stdout", detail: "03 — halted on x (producer y)." }` | `"stdout 03 — halted on x (producer y)."` |
      | `2026-09-23T15:00:00.000Z exit code=1`, then two blank lines                 | `{ at: "2026-09-23T15:00:00.000Z", event: "exit", detail: "code=1" }`                     | `"exit code=1"`                                |
      | `2026-09-23T15:00:00.000Z exit code=1`, every line ending CRLF               | `{ at: "2026-09-23T15:00:00.000Z", event: "exit", detail: "code=1" }`                     | `"exit code=1"`                                |
      | `    at run (file:///x.mjs:1:2)`, closing a multi-line detail                | `null`                                                                                    | `null`                                         |
      | `2026-09-23T15:00:00.000Z` alone                                             | `null`                                                                                    | `null`                                         |
      | `2026-09-23T15:00:00.000Z  exit code=1`, with two spaces                     | `null`                                                                                    | `null`                                         |
      | `2026-09-23 15:00:00 exit code=1`                                            | `null`                                                                                    | `null`                                         |
      | `2026-02-30T15:00:00.000Z exit code=1`                                       | `null`                                                                                    | `null`                                         |
      | nothing: the log is zero bytes                                               | `null`                                                                                    | `null`                                         |

  Scenario Outline: the newest earlier log of the scope is the one read
    Given the log directory <files>
    When `readLastLoopDiagEvent({ dir, scopeTag: "<tag>", exclude: <exclude> })` is called
    Then it reads <read>, and the degrade sink received <degrade>

    Examples:
      | files                                                                                                           | tag | exclude              | read                          | degrade                  |
      | holds `loop-diag.03.2026-09-23T15-00-00-000Z.log` and `loop-diag.03.2026-09-23T16-00-00-000Z.log`              | 03  | the `16-00` log      | the `15-00` log's last line   | nothing                  |
      | holds `loop-diag.03.2026-09-23T15-00-00-000Z.log` and `loop-diag.03.2026-09-23T16-00-00-000Z.log`              | 03  | absent               | the `16-00` log's last line   | nothing                  |
      | holds `loop-diag.03.2026-09-23T15-00-00-000Z.log` and `loop-diag.03-05.2026-09-23T16-00-00-000Z.log`           | 03  | absent               | the `03` log's last line      | nothing                  |
      | holds `loop-diag.12.2026-09-23T15-00-00-000Z.log` and `loop-diag.127.2026-09-23T16-00-00-000Z.log`             | 12  | absent               | the `12` log's last line      | nothing                  |
      | holds only `loop-diag.03.2026-09-23T16-00-00-000Z.log`                                                          | 03  | that log             | `null`                        | nothing                  |
      | holds both `03` logs, the `16-00` one zero bytes                                                                | 03  | absent               | `null`, not the `15-00` log   | nothing                  |
      | holds the `15-00` `03` log, and a directory named `loop-diag.03.2026-09-23T16-00-00-000Z.log`                   | 03  | absent               | `null`                        | one `loop-diag-read`     |
      | holds the `15-00` `03` log and `loop-diag.03.2026-09-23T16-00-00-000Z.log.bak`                                  | 03  | absent               | the `15-00` log's last line   | nothing                  |
      | holds only `loop-diag.04.2026-09-23T16-00-00-000Z.log`                                                          | 03  | absent               | `null`                        | nothing                  |
      | does not exist                                                                                                  | 03  | absent               | `null`                        | nothing                  |
