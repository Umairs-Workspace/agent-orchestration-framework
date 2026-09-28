@executable @cli @work @work-stream
Feature: every stop but done leaves the screen — one evidence event per stop, taken before the kill, keyed per session, and bounded to what was visible

  ADR-004. The door's `evidence()` is the one producer. The driver takes it at the moment of
  decision, before the tree is killed: in `stopForOutcome` for every outcome but `done`, and in the
  settle for a death or a non-zero exit nobody requested. It writes one event to `degrade.log`
  through `reportDegrade`, which gains an optional `extra.key` and throttles per (code, key), so one
  daemon hosting several sessions cannot drop the second session's evidence behind the first's.

  RULINGS (PO, 2026-09-27). (1) With a model, `evidence()` answers `{ source: "screen", buffer,
  cursor, rows }`, `rows` being the viewport's rows with trailing blank rows dropped. With no model
  it answers `{ source: "bytes", tail }`, `tail` being today's 600-character escape-stripped tail.
  (2) `reportDegrade(code, error, extra)` throttles per code when `extra.key` is absent, exactly as
  today, and per (code, key) when it is a non-empty string. The event gains a `screen` field when
  `extra.screen` is a plain object; `key` is not written. Callers that pass no key and no screen
  write the same event as today. (3) The code is the stop's own where one exists:
  `screen-not-ready`, `directive-not-accepted`, and, on the byte path only, the cap warning
  `tui-ready-marker-absent`. Every other stop is `session-screen`. (4) The message names the item
  ref, the outcome and the reason (`53/00: failed/timeout`), and no longer embeds the byte tail; the
  screen rides in `screen`. (5) The driver's key is unique to the invocation, drawn once at spawn.
  (6) Exactly one screen event per stop. The byte path's `tui-ready-marker-absent` is a warning
  before a typed directive, not a stop, so a byte-path session can carry it and later its stop's
  event. A `done` settle writes none; a pre-spawn answer (`processStarted: false`) writes none.
  (7) The stop breadcrumbs that carried the tail (`directive-not-accepted`) carry the same evidence
  object as the event.

  RULINGS (QA, 2026-09-27). (1) Every case resets the sink with `setDegradeSinkForTest` and reads
  the events it wrote. (2) "Before the kill" is proved by the rows: the case draws a known last
  frame, and the event's rows are that frame, not a blank screen. (3) The driver suite's
  `directive-not-accepted` case reads the screen text from the evidence object (`rows` on the
  screen path, `tail` on the byte path) instead of a string; its other assertions are unchanged.
  (4) `src/degrade.mjs` has no suite of its own, so the throttle cases live in
  `test/terminal/session-screen-evidence.test.mjs`, beside the evidence the key exists for.

  Background:
    Given a scripted PTY the case drives, a real door over a real 80×24 model, and the injected test sink
    And before each stop the case draws `LAST-FRAME` on row 3 of the alternate buffer

  Scenario Outline: each stop writes one event under its code, carrying the screen as drawn
    When the session is stopped by <stop>
    Then the drive resolves `<outcome>`
    And the sink holds exactly one screen event: code `<code>`, a message naming `53/00` and `<outcome>`, and `screen` of `source` `screen` whose rows include `LAST-FRAME`

    Examples:
      | stop                                                                     | outcome                    | code                     |
      | heartbeat silence past the startup grace                                 | failed/timeout             | session-screen           |
      | start-to-close                                                           | failed/timeout             | session-screen           |
      | the cap with no ready frame (a real launch)                              | failed/timeout             | screen-not-ready         |
      | no session id `acceptTimeoutMs` after the submit (a real launch)         | failed/timeout             | directive-not-accepted   |
      | a `NEEDS_INPUT` line in the output                                       | needs-input                | session-screen           |
      | the completion watch answering `needs-input`                             | needs-input                | session-screen           |
      | an injected `fail` entry's frame                                         | failed/blocked_screen      | session-screen           |
      | the caller's signal aborting                                             | failed/cancelled           | session-screen           |
      | the liveness probe finding the pid gone                                  | failed/agent_died          | session-screen           |
      | the PTY exiting 1 unasked                                                | failed/agent_error         | session-screen           |

  Scenario Outline: a done settle and a session that never started leave nothing
    When <ending>
    Then the drive resolves `<outcome>`, and the sink holds no screen event

    Examples:
      | ending                                                  | outcome                        |
      | the PTY exits 0                                         | done                           |
      | the completion watch answers `done`                     | done                           |
      | the provider binary is absent                           | failed/agent_error             |
      | the caller's signal is already aborted before the spawn | failed/cancelled               |

  Scenario Outline: a stop that goes wrong after it was asked for writes no second event
    Given the session was stopped `failed/timeout` by start-to-close
    When the release <goes wrong>
    Then the drive resolves `<outcome>`, and the sink still holds exactly one screen event, coded `session-screen`

    Examples:
      | goes wrong                            | outcome                         |
      | throws from `term.kill()`             | failed/pty_kill_failed          |
      | never sees an exit within the bound   | failed/pty_kill_unconfirmed     |

  Scenario: evidence holds the visible screen and nothing above it
    Given 1,000 lines `line 1` to `line 1000` are drawn on the normal buffer
    When the session is stopped by start-to-close
    Then the event's `screen.rows` has at most 24 entries, the last non-blank of them is `line 1000`, and no row is `line 976`

  Scenario: trailing blank rows are dropped, blank rows between are kept
    Given the alternate buffer shows `top` on row 0, `middle` on row 5, and nothing below
    When `evidence()` is asked of the door
    Then `rows` has 6 entries: `top`, four empty strings, and `middle`, with `buffer` `"alternate"` and the cursor where it was left

  Scenario: with no model, the evidence is the byte tail, marked as such
    Given the real door with a `load` that throws
    When the session is stopped by start-to-close after `LAST-FRAME` was emitted
    Then the event's `screen` is `{ source: "bytes", tail }`, `tail` contains `LAST-FRAME` and is at most 600 characters

  Scenario: two sessions in one process both leave their screens
    Given two drives in the same process, each stopped by start-to-close within the same second
    When the sink is read
    Then it holds two `session-screen` events, one per drive, each with its own rows

  Scenario Outline: the throttle is per code without a key, and per code and key with one
    Given the injected test sink
    When `reportDegrade` is called twice within 5 s with code `c`, the first with <first> and the second with <second>
    Then the sink holds <events>

    Examples:
      | first                     | second                    | events                                       |
      | no extra                  | no extra                  | one event                                    |
      | `{ key: "a" }`            | `{ key: "b" }`            | two events                                   |
      | `{ key: "a" }`            | `{ key: "a" }`            | one event                                    |
      | `{ path: "p" }`           | `{ path: "p" }`           | one event, carrying `path` `p`, no `key`     |
      | `{ key: "a", screen: S }` | no extra                  | two events, the first carrying `screen` `S`  |
