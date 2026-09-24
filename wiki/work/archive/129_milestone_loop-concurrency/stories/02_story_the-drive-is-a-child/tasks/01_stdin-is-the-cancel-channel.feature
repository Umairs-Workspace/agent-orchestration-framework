@executable @cli @work @work-stream
Feature: under --run a closed stdin stops the session through the driver's own bracket

  ADR-005 §2 and §4. Windows delivers no POSIX signal to a child, so the parent's cancel channel
  is the child's STDIN: the loop spawns the drive with `stdin: "pipe"` and ENDS it to say stop.
  Under `--run` the drive command listens for `process.stdin`'s `end` and requests the driver's
  graceful stop — the SAME bracket every other stop takes (`stop-requested` → on win32 the tree
  terminate → `pty-released` → exit confirmed; every step reported through `onSessionStop`) —
  with the terminal result `{ outcome: "failed", failureReason: "cancelled" }`, which the child
  prints as its one document. The driver gains one additive option to reach that bracket from a
  caller (`signal`, an `AbortSignal`, beside `onPtyLive`); a caller passing none is byte-identical.
  Without `--run` the command never touches stdin: a bare `aof work drive` in a terminal keeps
  its stdin exactly as today, and an already-ended stdin at launch (a caller that spawned with
  `stdio: "ignore"`) stops nothing — the listener is armed only under `--run` and only for an
  `end` that arrives AFTER the session is live.

  RULINGS (Three Amigos, 2026-09-13). THE SEAM IS `ctx.stdin ?? process.stdin` — a ctx key, never
  the closed input schema (the `serveStdio(ctx, { input })` precedent). ARMING ORDER: under `--run`
  the `end` listener is attached at command start (so a `/dev/null` stdin's immediate `end` is
  observed) and the cancel is GATED on liveness — an `end` seen before `onPtyLive` fired is
  recorded and ignored, one seen after it requests the stop; a stream that is flowing is paused
  once the session settles so the child process can exit. A DRIVER `signal` ALREADY ABORTED AT
  ENTRY never spawns: the driver resolves `{ outcome: "failed", failureReason: "cancelled",
  processStarted: false }` and reports no `stop-requested` breadcrumb.

  Background:
    Given a fixture workspace with story `03/01` and a fake PTY spawn injected through `ctx.agentSessionDriverOptions`
    And an `onSessionStop` recorder on the same options, and the transcript watch answering `"sess-1"`
    And a stdin double — a `Readable` stream — injected in place of `process.stdin` through the command's ctx
    And the fake session is live once the PTY spawn resolves, and stays open until told to exit
    And `COLD` names the cold `settlementContext` of task 00

  Scenario Outline: ending stdin under --run stops the live session gracefully, whatever the phase
    Given a record minted `running` under the story's `runs/` with id `P`
    And `work:drive-<phase>` is running with `{ ref: "03/01", run: P }` and the fake session is live
    When the stdin double is ended
    Then `onSessionStop` records, in order, `stop-requested` with `{ outcome: "failed", failureReason: "cancelled" }`, `pty-released`, then `exit-confirmed` with `outcome` `"failed"`
    And the PTY double reports `killed` true
    And the command's result deep-equals `{ ref: "03/01", phase: "<phase>", command: "/aof:<phase> 03/01", outcome: "failed", failureReason: "cancelled", sessionId: "sess-1", settlementContext: COLD }`
    And record `P` still reads `state` `"running"` with `sessionId` `"sess-1"`, and `runs/` holds no other record

    Examples:
      | phase    |
      | continue |
      | refine   |
      | verify   |

  Scenario Outline: the end's timing, and the flag, decide whether it is a stop
    Given `work:drive-continue` starts with `{ ref: "03/01"<input> }` and the stdin double <state>
    When <then>
    Then the result's `outcome` is <outcome>
    And `onSessionStop` records <stops> `stop-requested` breadcrumb
    And the stdin double has <listeners> `end` listener and its `readableFlowing` is <flowing>

    Examples:
      | input                        | state                                  | then                                              | outcome  | stops                          | listeners | flowing  |
      | `, run: "r1"`                | was ended before the command started   | the fake session goes live and exits 0            | "done"   | no                             | —         | —        |
      | `, run: "r1"`                | is open                                | the session goes live, then the double is ended   | "failed" | exactly one, `"cancelled"`     | one       | —        |
      | `, run: "r1"`                | is open                                | the session exits 0, then the double is ended     | "done"   | no                             | —         | —        |
      | ``                           | is open                                | the session goes live, then the double is ended   | "done"   | no                             | no        | null     |
      | `, run: "r1", dryRun: true`  | is open                                | the command returns                               | absent   | no                             | no        | null     |

  Scenario Outline: a caller-supplied abort signal reaches the bracket at the driver
    Given `driveInteractiveClaudeSession` is called with a fake live session and <signal>
    When <event>
    Then the driver resolves <result>
    And `onSessionStop` records <breadcrumbs>

    Examples:
      | signal                          | event                                                        | result                                                                   | breadcrumbs                                                                  |
      | an `AbortSignal` in its options | the signal aborts while the session is live                  | `{ outcome: "failed", failureReason: "cancelled", sessionId: "sess-1" }` | `stop-requested` (`failureReason` `"cancelled"`), `pty-released`, `exit-confirmed` |
      | an `AbortSignal` in its options | the session exits 0, then the signal aborts                  | `{ outcome: "done", sessionId: "sess-1" }`                               | `exit-confirmed` only                                                        |
      | an `AbortSignal` in its options | a sentinel stop is requested and unconfirmed, then the signal aborts | `{ outcome: "needs-input", sessionId: "sess-1" }`                 | exactly one `stop-requested`, with `outcome` `"needs-input"`                 |
      | no `signal` option              | the session exits 0                                          | `{ outcome: "done", sessionId: "sess-1" }`                               | `exit-confirmed` only                                                        |
      | no `signal` option              | the session exits 1                                          | `{ outcome: "failed", failureReason: "agent_error", sessionId: "sess-1" }` | `exit-confirmed` only                                                      |

  Scenario: a signal already aborted at entry never spawns
    Given an `AbortSignal` that is already aborted
    When `driveInteractiveClaudeSession` is called with it in its options
    Then the PTY spawn double was never called
    And the driver resolves `{ outcome: "failed", failureReason: "cancelled", processStarted: false }`
    And `onSessionStop` records no `stop-requested` breadcrumb
