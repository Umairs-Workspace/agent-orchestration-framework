@executable @cli @work @work-stream
Feature: the directive is typed on the input box — on the first ready frame, never at the cap, and the parked paste read from the box itself

  ADR-002. The door, `src/terminal/session-screen.mjs`, answers `openSessionScreen({ cols, rows,
  registry, load, onVerdict })`: it owns one model (ADR-001), feeds it every chunk through
  `feed(chunk)`, runs the registry over each settled frame, and hands the driver verdicts through
  `onVerdict`. The registry's entry zero is `ready` (`src/terminal/claude-screens.mjs`). With no
  model, the door answers today's byte gate, moved out of the driver verbatim. The driver opens the
  door through `options.openSessionScreen`, whose default is the real one.

  RULINGS (PO, 2026-09-27). (1) A frame is ready when all three hold, on either buffer: the
  cursor's row R begins with `❯` (U+276F) at column 0; row R−1 and row R+1 are each `─` (U+2500)
  across all `cols`; and R−1 and R+1 are inside the viewport. (As refined, the alternate buffer was
  a fourth clause. The operator struck it at 138's verify: claude's classic renderer draws the same
  box on the normal buffer, recorded as `ready.classic.json`, m138/F-03, ADR-002 §1 amended.)
  (2) A real launch is what it is today: `commandDelayMs` above 0 and either no injected `ptySpawn`
  or `observeReadiness` set. A scripted launch keeps its fixed write at `commandDelayMs` whatever the screen shows.
  (3) With a model, a real launch pastes on the first `ready` verdict and does not wait for
  `commandDelayMs`; the Enter is still its own write after the submit delay (70/06). (4) With a
  model and no `ready` verdict by `readyCapMs` (default 60 s), nothing is typed: the session stops
  `failed / timeout`, and its screen is recorded under the code `screen-not-ready` (ADR-004).
  (5) With no model, readiness is today's gate byte for byte: the floor, then bracketed paste ON
  with something visible drawn since, and at the cap the directive is typed anyway under
  `tui-ready-marker-absent`. (6) The resubmit reads the paste as parked when a row strictly between
  the two rules around the cursor's row contains `[Pasted text #` followed by a digit; with no model
  it reads today's bytes since the paste. Everything else about the resubmit is unchanged: once,
  only on that sign, never after a session id.

  RULINGS (QA, 2026-09-27). (1) The recogniser's cases are frames built by writing escape
  sequences into a real model, or the committed fixtures replayed; no case hand-builds a snapshot
  object. (2) The driver's cases inject `openSessionScreen`: the real door over the real model for
  the screen path, and the real door with a `load` that throws for the byte path. (3) The driver
  suite's existing readiness and resubmit cases (2026-09-24 and 2026-09-27) move to the byte path
  by that injection, with their assertions unchanged. (4) Each timing case bounds its wait with a
  wall limit at least ten times what it needs, so contention cannot fake a red. (5) A case in this
  task that must reach the cap draws a frame no v1 entry claims, never `first-run.json`: story 01
  registers `first-run` as a blocking screen without editing this task's suite.

  Background:
    Given a scripted PTY the case drives by emitting chunks, and a session-id watch that never resolves
    And `READY` is the chunk list of `test/fixtures/claude-screens/ready.json`

  Scenario Outline: only the input box is ready
    Given a real 80×24 model holding <frame>
    When the `ready` entry's `recognise` is asked of its snapshot
    Then it answers <ready>

    Examples:
      | frame                                                                                                   | ready |
      | the `ready.json` recording                                                                              | yes   |
      | the `ready.classic.json` recording: the classic renderer's box on the normal buffer                     | yes   |
      | the `first-run.json` recording                                                                          | no    |
      | the `ready.json` frame redrawn on the normal buffer                                                     | yes   |
      | the `ready.json` frame redrawn on the normal buffer with the `❯` row indented by one space              | no    |
      | the `ready.json` frame with the `❯` row indented by one space                                           | no    |
      | the `ready.json` frame with both rules drawn in `╌`                                                     | no    |
      | the `ready.json` frame with the lower rule 79 characters wide                                           | no    |
      | the `ready.json` frame with the cursor moved two rows up                                                | no    |
      | a resumed frame: earlier turns drawn above, each user turn a row beginning `❯`, the live box at the cursor | yes   |
      | that resumed frame with the live box erased and the cursor left on the last earlier `❯` row             | no    |
      | an alternate buffer whose cursor row is `❯` on the top row, with nothing above it                       | no    |

  Scenario: the directive is pasted on the first ready frame, without waiting for the floor
    Given the real door over a real model
    And the drive is a real launch with `commandDelayMs` 5000 and `readyCapMs` 10000
    When `READY` is emitted 20 ms after the spawn
    Then the directive's bracketed paste is the first write, within 1,000 ms of the spawn
    And the Enter is the second write, on its own

  Scenario: on the classic renderer the directive is pasted on the box on the normal buffer, not at the cap
    Given the real door over a real model and a degrade sink the case reads
    And the drive is a real launch with `commandDelayMs` 5000 and `readyCapMs` 10000
    When the chunks of `test/fixtures/claude-screens/ready.classic.json` are emitted 20 ms after the spawn
    Then the directive's bracketed paste is the first write, within 1,000 ms of the spawn
    And the sink holds no `screen-not-ready` and no `tui-ready-marker-absent` event

  Scenario: nothing ready, nothing typed — the cap stops the session
    Given the real door over a real model and a degrade sink the case reads
    And the drive is a real launch with `commandDelayMs` 10 and `readyCapMs` 80
    When a frame no v1 entry claims is emitted and nothing else: `ESC[?1049h`, then `Starting…` on row 0
    Then the drive resolves `{ outcome: "failed", failureReason: "timeout" }`, and the PTY received no write at all
    And the sink holds one `screen-not-ready` event whose rows begin with `Starting…`

  Scenario: a ready frame in several chunks is one pass and one paste
    Given the real door over a real model with an injected registry whose `ready` entry counts its calls
    When `READY`'s chunks are emitted in the same tick
    Then `recognise` ran once for that burst, and the paste was written once

  Scenario: a scripted launch keeps its fixed write whatever is on screen
    Given the real door over a real model, and a drive with an injected `ptySpawn`, `commandDelayMs` 0 and no `observeReadiness`
    When the drive starts and nothing is emitted
    Then the paste is written on the next tick, as it is today

  Scenario Outline: with no model, the byte gate is today's
    Given the real door with a `load` that throws
    And the drive is a real launch with `commandDelayMs` 10 and `readyCapMs` <cap>
    When <emitted>
    Then <typed>

    Examples:
      | cap  | emitted                                                                                 | typed                                                                                  |
      | 5000 | paste ON split across two chunks, then ` prompt`                                        | the paste is written once the ON is seen, after the floor                              |
      | 5000 | the pre-REPL ON, keyboard modes and queries, then OFF                                   | nothing is written                                                                     |
      | 5000 | the pre-REPL ON…OFF, the REPL's ON and title, then `ESC[?1049h` and the banner          | the paste is written after the banner                                                  |
      | 60   | nothing                                                                                 | the paste is written at the cap, and `tui-ready-marker-absent` is recorded             |

  Scenario: the resubmit reads the parked paste from the input box
    Given the real door over a real model, a real launch, `acceptTimeoutMs` 400 and `resubmitAfterMs` 60
    And `READY` has been emitted and the paste and its Enter written
    When a chunk moves the cursor to the input row and draws `[Pasted text #1 +1 lines]` there
    Then one more Enter is written, `directive-resubmitted` is recorded, and a third Enter is never written

  Scenario Outline: nothing parked in the box, no extra Enter
    Given the real door over a real model, a real launch, `acceptTimeoutMs` 300 and `resubmitAfterMs` 60
    And `READY` has been emitted and the paste and its Enter written
    When <drawn>
    Then the PTY holds exactly two writes when the drive resolves `failed / timeout`

    Examples:
      | drawn                                                                                          |
      | nothing more is drawn                                                                          |
      | `[Pasted text #1 +1 lines]` is drawn on row 2, above the upper rule                            |
      | the directive's own text is echoed on the input row                                            |
      | the input box is replaced by a select menu whose highlighted row is `❯ 1. Use this server`     |

  Scenario: with no model, the resubmit reads the bytes as today
    Given the real door with a `load` that throws, and the driver suite's 2026-09-27 resubmit case
    When it runs
    Then its assertions hold unchanged: one more Enter on `[Pasted text #1`, none on the body's echo or a dialog
