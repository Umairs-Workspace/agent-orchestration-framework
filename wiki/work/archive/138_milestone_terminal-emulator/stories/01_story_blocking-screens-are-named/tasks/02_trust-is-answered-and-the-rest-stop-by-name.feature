@executable @cli @work @work-stream
Feature: trust is answered by navigating to its option on the screen, one confirmed key at a time, and MCP approval, first-run and login stop the session by name within a frame

  ADR-003 §3 to §5, §4 as amended 2026-09-27, RESEARCH Q5. With the shipped registry, the driver 00
  landed answers the recordings the way each entry's action says, with no edit to the driver. The
  trust answer is the operator's standing consent: the loop being pointed at this checkout, which
  `ensureWorktreeTrusted` already pre-writes. The dialog appearing means that pre-write lost (F24).
  claude 2.1.283 opens it on `No, exit`, so the door reads the menu's order from the frame and walks
  to `Yes, I trust this folder` one arrow at a time, confirming each on the next frame before the
  next key, and presses Enter only on the option. The other three screens are named failures a
  retry cannot help.

  RULINGS (PO, 2026-09-27; amended at the re-refine, operator's decision 2026-09-27). (1) The driver
  is not edited: it writes each consent verdict's keys as one write of their own, as 00 landed. The
  navigation is the door's (`src/terminal/session-screen.mjs`), and the cursor-key mode it spells
  an arrow for is the model's (`src/terminal/screen.mjs`, the snapshot's `cursorKeys`). Beyond
  those two, only `src/terminal/claude-screens.mjs` and the three loop modules of task 03 are
  edited under `src/`. (2) A named failure resolves `{ outcome: "failed", failureReason:
  "blocked_screen", screen: { id } }`, and nothing is written to the PTY after the frame that
  decided it. (3) `blocked_screen` is not retried and `RETRYABLE_REASONS` is not edited. (4) The
  door's bounds are `CONSENT_MAX_KEYS` 8 arrows per consent and `CONSENT_STEP_MS` 2,000 ms for a key
  to show on screen. `openSessionScreen` takes `consentStepMs` so a case can shorten the wait; the
  count is not injectable. (5) An arrow is `ESC [ B` or `ESC [ A`, or `ESC O B` or `ESC O A` while the
  frame has application cursor keys on (DECCKM).

  RULINGS (QA, 2026-09-27; amended at the re-refine). (1) The cases drive
  `driveInteractiveClaudeSession` with a scripted PTY that emits the recordings, the real door, the
  real model and the shipped registry, as a real launch (`commandDelayMs` 10, `readyCapMs` 5000).
  A case that shortens the step bound does it through the `openSessionScreen` seam, still over the
  real door. (2) "Within a frame" is the emit to the `stop-requested` breadcrumb, under a 1,000 ms
  wall limit. (3) By default the PTY double answers an arrow the way claude did in RESEARCH Q5: it
  redraws the menu with `❯` moved one item in the arrow's direction, with the measured byte shape.
  The cases that need claude to misbehave script the double to do exactly that and nothing else.
  (4) A synthetic menu is `trust.json` followed by a chunk that redraws its menu rows. Its words and
  structure stay the recording's, so `trust` still claims the frame.

  Scenario: trust is answered by moving to its option, then one Enter, and the directive follows on the input box
    When `trust.json` is emitted, claude redraws each arrow as measured, and after the PTY receives the Enter, `ready.json`
    Then the writes are exactly `ESC [ B`, then `\r`, then the directive's paste, then its Enter, in that order
    And the session is not stopped, and no screen event is written

  Scenario Outline: the order is read from the screen, not assumed
    When <menu> is on screen, and claude redraws each arrow as measured
    Then the keys written before the directive are exactly <keys>, each arrow written only after the frame showing the previous one had moved the highlight

    Examples:
      | menu                                                                          | keys                                      |
      | `trust.json` as recorded: `❯ No, exit`, with `Yes, I trust this folder` below  | `ESC [ B`, then `\r`                      |
      | `trust.json` redrawn with `❯` already on `Yes, I trust this folder`           | `\r` only                                 |
      | a trust menu drawn with `Yes, I trust this folder` above the highlighted item | `ESC [ A`, then `\r`                      |
      | a trust menu whose `Yes, I trust this folder` is three items below `❯`        | `ESC [ B` three times, then `\r`          |
      | `trust.json` drawn with application cursor keys on (`ESC [ ? 1 h`)           | `ESC O B`, then `\r`                      |

  Scenario Outline: a navigation that cannot be confirmed on the screen is a named failure
    When <case>
    Then the drive resolves `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "trust" } }`, and the PTY holds exactly <writes>

    Examples:
      | case                                                                                                    | writes                  |
      | a trust menu with no `Yes, I trust this folder` item is on screen                                       | no write at all         |
      | a trust menu whose `Yes, I trust this folder` is nine items below `❯` is on screen                      | no write at all         |
      | `trust.json` is on screen, and claude answers the Down by moving `❯` away from the option               | one `ESC [ B`           |
      | `trust.json` is on screen, and claude draws nothing after the Down, with `consentStepMs` 100             | one `ESC [ B`           |
      | `trust.json` is on screen, and claude repaints the menu unchanged after the Down, with `consentStepMs` 100 | one `ESC [ B`           |

  Scenario: trust returning after its answer is a named failure
    When `trust.json` is emitted and answered by the Down and the Enter, a blank frame follows, and then `trust.json` again
    Then the drive resolves with `screen: { id: "trust" }`, and the PTY holds exactly `ESC [ B` and `\r`

  Scenario: a trust dialog after the directive was typed is a named failure
    When `ready.json` is emitted, the paste and its Enter are written, and then `trust.json`
    Then the drive resolves with `screen: { id: "trust" }`, and the PTY holds exactly the paste and its Enter

  Scenario Outline: a screen the operator's consent does not cover stops the session by name
    When `<fixture>` is emitted and nothing else
    Then within 1,000 ms `stop-requested` is recorded with `blocked_screen`, and the drive resolves `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "<id>" } }`
    And the PTY received no write, and the degrade sink holds one `session-screen` event whose rows are the recording's frame

    Examples:
      | fixture           | id           |
      | mcp-approval.json | mcp-approval |
      | first-run.json    | first-run    |
      | login.json        | login        |

  Scenario: MCP approval after the directive was typed is still named
    When `ready.json` is emitted, the paste and its Enter are written, and then `mcp-approval.json`
    Then the drive resolves with `screen: { id: "mcp-approval" }`, and the PTY holds exactly the paste and its Enter

  Scenario: a blocked run is not retried
    When the run store is asked whether a run that failed `blocked_screen` is retryable
    Then `isRetryable("blocked_screen")` is false, and `RETRYABLE_REASONS` is `runtime_offline`, `timeout` and `session_limit`
