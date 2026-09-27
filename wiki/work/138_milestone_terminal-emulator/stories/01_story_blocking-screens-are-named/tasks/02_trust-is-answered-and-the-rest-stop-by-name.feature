@executable @cli @work @work-stream
Feature: trust is answered by standing consent, and MCP approval, first-run and login stop the session by name within a frame

  ADR-003 §3 to §5. With the shipped registry, the driver 00 landed answers the recordings the way
  each entry's action says, with no edit to the driver. The trust answer is the operator's standing
  consent: the loop being pointed at this checkout, which `ensureWorktreeTrusted` already pre-writes.
  The dialog appearing means that pre-write lost (F24). The other three are named failures a retry
  cannot help.

  RULINGS (PO, 2026-09-27). (1) No file under `src/` other than `src/terminal/claude-screens.mjs`
  and the three loop modules of task 03 is edited. If a case here needs a driver change, that is a
  contract gap in 00, reported, not patched. (2) A named failure resolves `{ outcome: "failed",
  failureReason: "blocked_screen", screen: { id } }` with nothing written to the PTY after the
  frame, not even an Enter. (3) `blocked_screen` is not retried and `RETRYABLE_REASONS` is not
  edited.

  RULINGS (QA, 2026-09-27). (1) The cases drive `driveInteractiveClaudeSession` with a scripted PTY
  that emits the recordings, the real door, the real model and the shipped registry, as a real
  launch (`commandDelayMs` 10, `readyCapMs` 5000). (2) "Within a frame" is the emit to the
  `stop-requested` breadcrumb, under a 1,000 ms wall limit. (3) The "not yes" trust frame is the
  recording followed by a chunk that redraws the menu with `❯` on its second option, as claude does
  on the down arrow.

  Scenario: trust is answered once, and the directive follows on the input box
    When `trust.json` is emitted, and after the PTY receives its Enter, `ready.json`
    Then the writes are exactly `\r`, the directive's paste, and its Enter, in that order
    And the session is not stopped, and no screen event is written

  Scenario: a trust menu not on its named option is a named failure
    When `trust.json` is emitted, followed by the redraw that highlights its second option
    Then the drive resolves with `screen: { id: "trust" }` and `failureReason` `blocked_screen`, and the PTY received no write

  Scenario: trust returning after its answer is a named failure
    When `trust.json` is emitted, answered, followed by a blank frame, and then `trust.json` again
    Then the drive resolves with `screen: { id: "trust" }` after exactly one `\r`

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
