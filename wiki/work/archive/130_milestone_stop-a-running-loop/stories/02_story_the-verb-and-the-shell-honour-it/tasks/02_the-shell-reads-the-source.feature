@executable @cli @work @work-stream
Feature: the shell reads the source, not a flag — level 1 at the tick head halts with the producer as data, and every drive carries the source's signal

  ADR-003 §1-§2, §5. `runLoopBody` composes ONE source after `loopRunId` is resolved —
  `ctx.stopSource ?? createStopSource({ loopRunId, dir: loopStopsDir(), process, pollMs })` —
  starts it after the resume handling and stops it in the `finally` that today removes the
  listeners; the `process.once("SIGINT"|"SIGTERM")` pair and their `removeListener` pair are
  DELETED. Every drive's ctx is `{ ...ctx, agentSessionDriverOptions: { ...(ctx.agentSessionDriverOptions
  ?? {}), signal: source.signal } }` — composed in the body, not the launch seam, so a foreground
  loop, a loop under `AOF_LOOP_DIAG=0` and a test-driven `runLoopBody` all carry it and the diag
  seam's `onSessionStop` survives the spread. At the tick head: `await source.poll(); if
  (source.level() >= 1) act = haltOnStop(source, inFlightRef ?? next?.ref ?? resolved.scope)` —
  `haltDecision("operator-interrupt", ref, source.producer())`, the stop id unchanged (`LOOP_STOPS`
  stays twelve), the producer a VALUE. Its `Details` (through `reportLine`, never `actShape`) are
  `{ signal: <producer>, level, request: <path> | null, by: "<node>:<pid>" | null, cancelled:
  <runId> | null }`. `LoopState` keeps ten keys.

  RULINGS (QA, 2026-09-13). (1) "`LOOP_STOPS` stays twelve" is measured as "no member added or
  removed": FF-5304's literal is FIFTEEN at this HEAD (129/01 appended three lane stops), and
  `operator-interrupt` is its twelfth member; the assertion is against that literal, not a count.
  (2) An L1 invocation drives nothing and reaches no tick head, so it reads no level: its output
  at level 1 is byte-identical to its output at level 0, and it writes and marks nothing. (3)
  `start()` and `stop()` are balanced on EVERY exit of `runLoopBody` — done, halt, L1 and a throw
  — one call each; an interval left armed after an L1 return is a leak. (4) A level that rises
  AFTER a post-drive poll is caught at the next tick head, whose `ref` is the last driven ref
  (§2's `inFlightRef` fallback), not the item `work:next` was about to offer. (5) `Details` drop
  null members: a level-2 halt with nothing cancelled carries no `cancelled=`. (6) The recorder
  PRECEDES the source (01/task 02 ruling 8, measured: source-first exits on the SECOND signal).
  `cli.launch` installs `installLoopDiagnostics` before it calls `runLoopBody`, and `runLoopBody`
  composes the source inside its body, never at import — so the second signal cancels and
  settles, and only the third reaches `proc.exit(128 + signo)`. `producer()` is 01's: the raiser
  of the CURRENT level (`SIGINT` then `SIGTERM` is `"SIGTERM"`).

  Background:
    Given a loop fixture over stream `03` with story `03/01` ready and a fake driver (`completingDriver`) injected through `ctx.agentSessionDriverOptions`
    And a fake `ctx.stopSource` carrying the seven members, its `level` set by the test (also flippable on the Nth `poll()`), its `signal` from its own `AbortController`, and recording every `poll()`, `start()` and `stop()` call
    And `report` collects the printed lines

  Scenario: the shell registers no signal listener of its own any more
    When `runLoopBody({ scope: "03" }, ctx)` runs to completion with the source at level 0
    Then `process.listenerCount("SIGINT")` and `process.listenerCount("SIGTERM")` are unchanged from before the call at every point
    And the source's `start()` was called once and its `stop()` was called once, after the last drive

  Scenario Outline: start and stop are balanced on every exit
    Given the invocation <invocation>
    When `runLoopBody` <ends>
    Then the source's `start()` was called <starts> and its `stop()` exactly as many times

    Examples:
      | invocation                                                          | ends                                        | starts        |
      | `{ scope: "03" }` at level 0                                        | resolves `done`                             | once          |
      | `{ scope: "03" }` at level 1                                        | resolves a halt                             | once          |
      | `{ scope: "03", level: "L1" }` at level 1                           | resolves the L1 rows                        | at most once  |
      | `{ scope: "03" }` with `ctx.readChangeBaseline` throwing `EPERM`   | rejects with that error                     | once          |

  Scenario: an L1 invocation reads no level
    Given two fixtures, one with the source at level 0 and one at level 1 with producer `"stop-request"` and a request in `dir`
    When `runLoopBody({ scope: "03", level: "L1" }, ctx)` is awaited on each
    Then the printed lines are byte-identical and neither `act` is a halt on `operator-interrupt`
    And `spawnCalls` is empty on both and the request file is unchanged

  Scenario: a real source is composed when none is injected
    Given no `ctx.stopSource`
    When `runLoopBody({ scope: "03" }, ctx)` runs against a spy on `createStopSource`
    Then `createStopSource` was called once with `{ loopRunId: <the resolved loopRunId>, dir: loopStopsDir(), process, pollMs: 2000 }`

  Scenario: every drive receives the source's signal beside the caller's options
    Given `ctx.agentSessionDriverOptions` carries `onSessionStop` and `env` and a scripted driver resolving `failed/timeout`, `done`, `done`
    When `runLoopBody({ scope: "03" }, ctx)` drives `03/01` through continue attempt 1, retry attempt 2 and verify
    Then every one of the three spawns received `options.signal` identical (`===`) to `ctx.stopSource.signal`
    And each received the caller's `onSessionStop` and `env` unchanged

  Scenario Outline: a level at the tick head halts before any drive, with the producer as data
    Given the source's level is <level> with producer <producer> and request <request>
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then the driver double's `spawnCalls` is empty
    And the answer has ten keys and `act` deep-equals `{ act: "halt", stop: "operator-interrupt", ref: "03/01", producer: <producer> }`
    And the last printed line is `03 — halted on operator-interrupt at 03/01 (producer <producer>). Resume with: aof work loop 03 --resume Details: signal=<producer>; level=<level><details>.`
    And `source.poll()` was awaited before the halt was decided

    Examples:
      | level | producer         | request                                              | details                                                        |
      | 1     | `"stop-request"` | the ten-key record at `<path>` with `by` `{ node: "win-host-a", pid: 4242 }` | `; request=<path>; by=win-host-a:4242` |
      | 2     | `"stop-request"` | the ten-key record at `<path>`, level 2, `by` `{ node: "win-host-a", pid: 4242 }` | `; request=<path>; by=win-host-a:4242` |
      | 1     | `"SIGINT"`       | `null`                                               | ``                                                             |
      | 1     | `"SIGTERM"`      | `null`                                               | ``                                                             |
      | 2     | `"SIGINT"`       | `null`                                               | ``                                                             |

  Scenario: a level rising after a post-drive poll is caught at the next tick head
    Given the source's level flips to 1 with producer `"stop-request"` on the poll that FOLLOWS the settle of `03/01`'s verify drive
    And the driver closes `03/01` on its verify, so `work:next` would offer `03` next
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then `spawnCalls` has exactly two entries (continue, verify) and `driven` two `done` rows
    And `act` deep-equals `{ act: "halt", stop: "operator-interrupt", ref: "03/01", producer: "stop-request" }`

  Scenario Outline: with the recorder installed first, the second signal cancels and settles and only the third reaches node
    Given `proc` is an `EventEmitter` double with `pid` 4242 and an `exit` that records its calls, on which `installLoopDiagnostics({ proc, fs: a fake fs, env: {}, aliveIntervalMs: 0 })` is installed FIRST
    And `ctx.stopSource` is a REAL `createStopSource({ loopRunId, dir, process: proc, pollMs: 2000, timers })` created after it, and the driver double honours `options.signal`
    When `runLoopBody({ scope: "03" }, ctx)` is awaited and <first> then <second> are emitted on `proc` while the drive is live
    Then the driver resolved `{ outcome: "failed", failureReason: "cancelled" }`, the record reads `cancelled`, and `proc.exit` was never called
    And `act` deep-equals `{ act: "halt", stop: "operator-interrupt", ref: "03/01", producer: <producer> }` and the halt line ends `Details: signal=<producer>; level=2; cancelled=<that runId>.`
    And when <third> is emitted on `proc` after the halt, `proc.exit` is called exactly once with <exit>

    Examples:
      | first     | second    | third     | producer    | exit |
      | `SIGINT`  | `SIGINT`  | `SIGINT`  | `"SIGINT"`  | 130  |
      | `SIGINT`  | `SIGTERM` | `SIGTERM` | `"SIGTERM"` | 143  |

  Scenario: the halt's producer is never a message match, and the recorder precedes the source
    When the comment-stripped source of `src/commands/loop.mjs` is read
    Then every `haltDecision("operator-interrupt"` call passes a value bound from `source.producer()` (or `stopSource.producer()`) as its third argument
    And the file contains no `process.once(` and no `interrupted` binding
    And the spread `signal: source.signal` appears in `runLoopBody`'s body and the `launch` body names no `signal`
    And in the `launch` body `installLoopDiagnostics(` precedes `runLoopBody(`, and `createStopSource(` is called only inside `runLoopBody`

  Scenario: LoopState and the stop vocabulary are unchanged
    Then `LOOP_STOPS` deep-equals FF-5304's `STOPS` literal, unchanged, and `"operator-interrupt"` is its twelfth member
    And `actShape`'s whitelist is unchanged — a halt's `act` carries exactly `act`, `stop`, `ref`, `producer`
