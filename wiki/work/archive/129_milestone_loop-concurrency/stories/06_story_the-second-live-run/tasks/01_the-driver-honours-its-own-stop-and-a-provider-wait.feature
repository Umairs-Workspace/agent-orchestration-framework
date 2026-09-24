@executable @cli @work @bug @finding-F-58 @finding-F-59
Feature: the driver honours the stop it requested, and a provider wait is not silence

  Two defects the live run of 2026-09-15 (loop 127, `--resume`, five attempts on 127/03's refine)
  surfaced in `src/agent-session-driver.mjs`, both read at the source (`VERIFICATION.md` `F-58`,
  `F-59`; the loop-diag log `loop-diag.127.2026-09-15T10-47-32-544Z.log`; the five transcripts).

  F-59 — THE PROBE RACES THE REQUESTED STOP. A stop this driver requests (`done` from the
  transcript watch, a deadline, a cancel) records `requestedStopOutcome`, kills the tree, and
  applies the outcome only when `term.onExit` delivers. The liveness probe (`process.kill(pid, 0)`
  every 15 s) can see the dead pid first and settles `failed/agent_died`; `finish` is guarded, so
  the requested `done` is a no-op. Attempt 5 completed the refine, ran `run-complete done`, the
  driver logged `stop-requested done` → `tree-terminated` → `exit-confirmed failed` 55 ms later,
  and the loop halted `run-not-retryable` on a refine that had finished. The probe now settles
  with the REQUESTED outcome when one stands; a death nobody asked for is still `agent_died`.

  F-58 — A PROVIDER WAIT IS NOT SILENCE. When the account's usage limit is hit, `claude` prints
  `Usage limit reached · continuing automatically at <time>` (the status line) or `You've hit
  your session limit · resets <time>` (the turn's text) and waits, alive, for the reset. No
  transcript progress follows, so the heartbeat deadline read it as a hung session and killed it
  after 15 minutes — attempt 1 at minute 40, attempts 2–4 after 20 minutes each, an hour of
  blind retries against a limit no retry lifts. The driver now reads the line off the output
  (the buffer's tail, terminal escapes stripped); while the last such line is newer than every
  heartbeat, the heartbeat check re-asks a window later and kills nothing; the first heartbeat
  after the line restores the ordinary rule; `startToCloseMs` still bounds the attempt. The
  detection is reported once as the `provider-wait` breadcrumb so the diag log names it.

  Background:
    Given `driveInteractiveClaudeSession` over an injected PTY double

  Scenario: a requested done survives the probe seeing the killed pid first
    Given a PTY whose pid cannot exist and whose `kill()` emits no exit
    And the transcript watch answers `done` and the liveness probe runs every 10 ms
    When the driver requests the stop and releases the PTY
    Then the run settles `done` — never `agent_died`
    And the `onSessionStop` breadcrumbs read `stop-requested done` then `exit-confirmed done`

  Scenario: a death nobody requested is still agent_died
    Given a PTY whose pid cannot exist and no stop requested
    When the liveness probe runs
    Then the run settles `failed` with `agent_died`, as before this story

  Scenario Outline: the provider-wait line is read off the output in both spellings, escapes stripped
    When `PROVIDER_WAIT_RE` is asked over <output> with the terminal's escapes stripped
    Then it <answer>

    Examples:
      | output                                                                              | answer                                              |
      | `Usage limit reached · continuing automatically at 1:40pm`                          | matches, the match starting at `Usage limit reached` |
      | `\x1b[33mUsage limit reached · continuing automatically at 1:40pm\x1b[0m`           | matches after the escapes are stripped              |
      | `You've hit your session limit · resets 1:40pm (Europe/London)`                     | matches, the match starting at `hit your session limit` |
      | `Refine of 127/03 · Archive is a move is complete.`                                 | does not match                                      |
      | `NEEDS_INPUT`                                                                       | does not match                                      |

  Scenario: a provider wait suspends the heartbeat deadline until the session resumes
    Given a deadline policy of `startToCloseMs` 500, `heartbeatMs` 30, `startupGraceMs` 5 and a heartbeat reader answering `null`
    And the PTY emits `Usage limit reached · continuing automatically at 1:40pm` after the directive is written
    When 150 ms pass
    Then the PTY has not been killed and the heartbeat reader has been asked at least three times
    And exactly one `provider-wait` breadcrumb was reported, its `detail` starting `Usage limit reached`
    When the heartbeat reader answers an instant newer than the line and 80 ms pass
    Then the PTY is killed and the run settles `failed` with `timeout` — the ordinary rule, restored by the resumed progress

  Scenario: start-to-close still bounds a provider wait
    Given a deadline policy of `startToCloseMs` 120, `heartbeatMs` 30, `startupGraceMs` 5 and a heartbeat reader answering `null`
    And the PTY emits the provider-wait line after the directive is written
    When the attempt's wall clock expires
    Then the run settles `failed` with `timeout` from `startToCloseMs`, and the heartbeat rule never fired first
