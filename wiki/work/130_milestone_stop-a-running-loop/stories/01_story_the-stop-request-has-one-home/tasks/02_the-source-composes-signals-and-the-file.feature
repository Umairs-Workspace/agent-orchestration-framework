@executable @cli @work @work-stream
Feature: createStopSource composes the process's signals and the file into one level, one producer and one AbortSignal

  ADR-001 §5. The shell reads ONE source — the seam 129/04's task 06 injects — and this is its
  producer. `createStopSource({ loopRunId, dir, process, pollMs, now })` answers `{ level,
  producer, request, signal, poll, start, stop }`: `level()` is `max(signalsSeen, request?.level
  ?? 0)` clamped to 2, where `signalsSeen` counts `SIGINT`/`SIGTERM` through PERSISTENT
  `process.on` listeners the source owns — the first signal raises the level to 1, the second to 2,
  and AT 2 the source removes its own listeners so a THIRD signal reaches node's default through
  `loop-diag.mjs`'s last-listener repair (exit `128 + signo`): first drains, second cancels, third
  kills, in that order and no other. `request()` is the file's record or `null`; the source reads
  the file's LEVEL and never its state (an `honoured` request at level ≥ 1 still halts the loop
  that reads it — the between-drives gap). `signal` is one `AbortController`'s signal, aborted the
  moment the level reaches 2 and never re-armed. `producer()` is `"SIGINT"`, `"SIGTERM"` or
  `"stop-request"` — whichever FIRST raised the level to its current value — a datum, never a
  message. `poll()` reads the file once; `start()` arms ONE `setInterval(poll, pollMs)`,
  `unref()`'d; `stop()` clears it. DEFAULT `pollMs` is 2000.

  RULINGS (QA, 2026-09-13). (1) `timers` (`{ setInterval, clearInterval }`, default node's) is
  an additive injected member beside §5's five, for the suite. (2) An interval is armed only for
  a finite `pollMs` > 0; absent is 2000; `0`, negative or non-number arms none (the recorder's
  `aliveIntervalMs` idiom). (3) `stop()` is terminal and idempotent: clears any interval, removes
  only the source's OWN listeners, and a later `start()` arms nothing. (4) The listeners go when
  `level()` reaches 2 by EITHER route — a signal after a file-borne cancel is the third ask.
  (5) `level()`/`producer()` are monotonic; a file that vanishes or turns corrupt afterwards
  changes `request()` only. (6) `producer()` names what raised the level to its CURRENT value
  (`SIGINT` then `SIGTERM` is `"SIGTERM"`); an equal raise never renames it. (7) Construction
  reads no file, registers one `SIGINT` and one `SIGTERM` listener only, never calls `proc.exit`.
  (8) The recorder is installed BEFORE the source (launch seam precedes `runLoopBody`); ONLY in
  that order does its last-listener repair fire at the third signal — measured 2026-09-13,
  source-first exits on the SECOND. Story 02's shell keeps the order.

  Background:
    Given an isolated aof home and `dir` = `loopStopsDir()`
    And `proc` is an `EventEmitter` standing in for `process` (never the real one), with `pid` 4242 and an `exit` that records its calls
    And `timers` is an injected `setInterval`/`clearInterval` pair whose handles record `unref()` calls, and `NOW` is a `Date`-answering clock
    And `source` = `createStopSource({ loopRunId: "L1", dir, process: proc, pollMs: 2000, now: NOW, timers })`

  Scenario: a fresh source is level 0 with no producer and an unaborted signal, and has read nothing
    Given a level-2 `requested` file was already at `stopRequestPath(dir, "L1")` when `source` was created
    Then `source.level()` is 0, `source.producer()` is `null`, `source.request()` is `null` — construction reads nothing
    And `source.signal.aborted` is false
    And `proc.listenerCount("SIGINT")` is 1 and `proc.listenerCount("SIGTERM")` is 1 — the source's own persistent listeners — and `SIGHUP`/`SIGBREAK` have 0

  Scenario Outline: process signals climb the ladder, and after the second the source is deaf
    When <signals> are emitted on `proc` in order
    Then `source.level()` is <level> and `source.producer()` is <producer>
    And `source.signal.aborted` is <aborted>
    And `proc.listenerCount("SIGINT")` is <listeners> and `proc.listenerCount("SIGTERM")` is <listeners>
    And `proc.exit` was never called

    Examples:
      | signals                       | level | producer    | aborted | listeners |
      | `SIGINT`                      | 1     | `"SIGINT"`  | false   | 1         |
      | `SIGTERM`                     | 1     | `"SIGTERM"` | false   | 1         |
      | `SIGHUP`                      | 0     | `null`      | false   | 1         |
      | `SIGINT`, `SIGINT`            | 2     | `"SIGINT"`  | true    | 0         |
      | `SIGTERM`, `SIGTERM`          | 2     | `"SIGTERM"` | true    | 0         |
      | `SIGINT`, `SIGTERM`           | 2     | `"SIGTERM"` | true    | 0         |
      | `SIGTERM`, `SIGINT`           | 2     | `"SIGINT"`  | true    | 0         |
      | `SIGINT`, `SIGINT`, `SIGINT`  | 2     | `"SIGINT"`  | true    | 0         |
      | `SIGINT`, `SIGINT`, `SIGTERM` | 2     | `"SIGINT"`  | true    | 0         |

  Scenario Outline: with the recorder installed first, the third signal is nobody's but node's
    Given a fresh `proc` on which `installLoopDiagnostics({ proc, fs: a fake fs, env: {}, aliveIntervalMs: 0 })` is installed and THEN a source is created — the launch seam's order
    When <signals> are emitted on `proc` in order
    Then `proc.exit` was called exactly once, with <exit>, and only on the THIRD signal
    And the recorder's log holds three `signal` lines

    Examples:
      | signals                        | exit |
      | `SIGINT`, `SIGINT`, `SIGINT`   | 130  |
      | `SIGINT`, `SIGTERM`, `SIGTERM` | 143  |
      | `SIGTERM`, `SIGINT`, `SIGINT`  | 130  |

  Scenario Outline: the file's level raises the source's level on a poll, and names the request as the producer
    Given the request file for `"L1"` <file>
    When `await source.poll()` is called
    Then `source.level()` is <level> and `source.producer()` is <producer>
    And `source.request()` <request>
    And `source.signal.aborted` is <aborted> and `proc.listenerCount("SIGINT")` is <listeners>

    Examples:
      | file                                       | level | producer         | request               | aborted | listeners |
      | does not exist                             | 0     | `null`           | is `null`             | false   | 1         |
      | is level 1 `requested`                     | 1     | `"stop-request"` | is the ten-key record | false   | 1         |
      | is level 2 `requested`                     | 2     | `"stop-request"` | is the ten-key record | true    | 0         |
      | is level 1 `honoured`                      | 1     | `"stop-request"` | is the ten-key record | false   | 1         |
      | is level 2 `honoured`                      | 2     | `"stop-request"` | is the ten-key record | true    | 0         |
      | holds `{ not json`                         | 0     | `null`           | is `null`             | false   | 1         |
      | holds `{ "loopRunId": "L1" }` — no `level` | 0     | `null`           | is `null`             | false   | 1         |

  Scenario: the producer is whoever raised the level to its current value, and an equal raise does not rename it
    Given `SIGINT` has been emitted once on `proc`
    And the request file for `"L1"` is level 1 `requested`
    When `await source.poll()` is called
    Then `source.level()` is 1 and `source.producer()` is `"SIGINT"`
    When the file is escalated to level 2 and `await source.poll()` is called
    Then `source.level()` is 2 and `source.producer()` is `"stop-request"` — the file raised it to 2
    When `SIGINT` is emitted again
    Then `source.level()` is still 2 and `source.producer()` is still `"stop-request"` — the listeners went at 2

  Scenario: the mirror — the file first, then the signals
    Given the request file for `"L1"` is level 1 `requested` and `await source.poll()` has been called
    When `SIGINT` is emitted on `proc`
    Then `source.level()` is 1 and `source.producer()` is `"stop-request"`
    When `SIGINT` is emitted again
    Then `source.level()` is 2, `source.producer()` is `"SIGINT"` and `source.signal.aborted` is true

  Scenario Outline: the level and the producer never fall — a file that vanishes or turns corrupt after raising them changes request() only
    Given the request file for `"L1"` is level <level> `requested` and `await source.poll()` has been called
    When the file <then> and `await source.poll()` is called again
    Then `source.level()` is still <level>, `source.producer()` is still `"stop-request"` and `source.signal.aborted` is <aborted>
    And `source.request()` is `null`

    Examples:
      | level | then                        | aborted |
      | 1     | is deleted                  | false   |
      | 2     | is deleted                  | true    |
      | 2     | is overwritten with `{ bad` | true    |

  Scenario: the signal aborts exactly once and is never re-armed
    Given an `abort` listener counting its calls is attached to `source.signal`
    When `SIGINT` is emitted twice on `proc`
    Then the listener was called once and `source.signal.aborted` is true
    When the request file is escalated to level 2, `await source.poll()` is called and `SIGINT` is emitted a third time
    Then the listener was still called exactly once and `source.signal` is the same object

  Scenario: a process that already has signal listeners keeps them — the source removes only its own
    Given a fresh `proc` with one persistent `SIGINT` listener and one persistent `SIGTERM` listener already registered, each counting its calls
    And a source created over it
    When `SIGINT` is emitted twice on `proc`
    Then the prior `SIGINT` listener was called twice, `proc.listenerCount("SIGINT")` is 1 and `proc.listenerCount("SIGTERM")` is 1
    When `source.stop()` is called and `SIGINT` is emitted once more
    Then `proc.listenerCount("SIGINT")` is still 1, the prior listener was called three times, and `source.level()` is still 2

  Scenario: start arms one unref'd interval at pollMs; stop clears it, removes the listeners, and is terminal
    When `source.start()` is called twice
    Then `timers.setInterval` was called once with `pollMs` 2000 and the handle's `unref()` was called
    When `source.stop()` is called twice
    Then `timers.clearInterval` was called once with that handle
    And `proc.listenerCount("SIGINT")` is 0 and `proc.listenerCount("SIGTERM")` is 0
    When `source.start()` is called again and `SIGINT` is emitted twice on `proc`
    Then `timers.setInterval` was still called once, `source.level()` is 0 and `source.signal.aborted` is false

  Scenario: stop before start removes the listeners and clears nothing
    When `source.stop()` is called on a source that was never started
    Then `timers.clearInterval` was never called
    And `proc.listenerCount("SIGINT")` is 0 and `proc.listenerCount("SIGTERM")` is 0
    And no error was thrown

  Scenario Outline: the interval is armed only for a finite positive pollMs, and the default is 2000
    Given `source` = `createStopSource({ loopRunId: "L1", dir, process: proc, <pollMs>, timers })`
    When `source.start()` is called
    Then `timers.setInterval` was called <armed>
    And `await source.poll()` still reads the file

    Examples:
      | pollMs           | armed           |
      | no `pollMs` key  | once, with 2000 |
      | `pollMs: 2000`   | once, with 2000 |
      | `pollMs: 250`    | once, with 250  |
      | `pollMs: 0`      | never           |
      | `pollMs: -1`     | never           |
      | `pollMs: NaN`    | never           |
      | `pollMs: "2000"` | never           |

  Scenario: a real interval never holds a finished process open
    Given a child `node` process that creates a source against `dir` with the REAL `process` and the default `pollMs`, calls `start()` and nothing else
    When the child's script reaches its end
    Then the child exits on its own within 3 seconds with code 0
