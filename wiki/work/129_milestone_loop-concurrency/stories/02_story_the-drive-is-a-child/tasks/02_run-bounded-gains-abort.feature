@executable @cli @work @work-stream
Feature: runBounded gains an abort signal, a grace period and a piped stdin, additively

  ADR-005 §1. `runBounded` (`src/work-audit/spawn.mjs`, 72/ADR-001's bounded shell-less spawn) is
  the one seam the loop family may spawn through (FF-12902). It gains three additive options:
  `signal` (an `AbortSignal`), `graceMs` (a positive integer, default the module's own named
  constant) and `stdin` (`"ignore"` today, or `"pipe"`). An abort ENDS the child's stdin (the
  cancel channel of task 01), waits `graceMs` for the child to exit on its own, then kills it
  exactly as the deadline path does; the outcome is `"aborted"`, a fourth member of
  `SPAWN_OUTCOMES`, with `error` naming the abort and whether the kill was needed. A child that
  exits within the grace is still `"aborted"` — the caller asked for the stop and got it — with
  its real `exitCode`. The result envelope's key set (`SPAWN_RESULT_KEYS`) is unchanged: every key
  on every outcome. Callers passing none of the three options are byte-identical, including the
  audit's own spawns and `work:grade`'s; `stdio` stays `["ignore", "pipe", "pipe"]` unless
  `stdin: "pipe"` is asked for, and no `shell` option exists on any path.

  RULINGS (Three Amigos, 2026-09-13): the FIRST of the deadline and the abort to fire decides the
  outcome and exactly one kill is ever sent — an abort whose grace outlives the deadline is still
  `"aborted"`, a deadline that expires before any abort is `"deadline-expired"` and a later abort
  changes nothing; a `signal` ALREADY aborted when `runBounded` is called never spawns and answers
  `"aborted"` with `exitCode` null and `error` saying it was aborted before start; a `stdin` value
  other than `"ignore"` or `"pipe"` is `"not-started"` with `error` naming the value — the same
  RETURNED refusal `argumentVectorProblem` gives a bad argv, never a throw.

  Background:
    Given `runBounded`, `SPAWN_OUTCOMES`, `SPAWN_RESULT_KEYS` and the named grace constant from `src/work-audit/spawn.mjs`
    And an injected `spawnChild` double whose child records the spawn options, every `stdin.end()` and `kill()` with a timestamp, and can exit on demand

  Scenario: the outcome vocabulary gains aborted
    When `SPAWN_OUTCOMES` is read
    Then it is exactly `["exited", "deadline-expired", "not-started", "aborted"]`

  Scenario: an abort ends stdin, waits the grace, then kills
    Given `runBounded` is running with `stdin: "pipe"`, `graceMs` 50 and a signal, and the child has written `partial` to stdout and `warn` to stderr
    When the signal aborts and the child does not exit
    Then the child's `stdin.end()` was called exactly once, before any `kill()`
    And `kill("SIGKILL")` was called exactly once, no sooner than 50ms after the abort
    And the result's `outcome` is `"aborted"`, its `error` matches `/abort/u` and `/killed/u`, and its `stdout` is `"partial"` and `stderr` `"warn"`
    And the result's key set is exactly `SPAWN_RESULT_KEYS`

  Scenario Outline: a child that exits within the grace is aborted with its own exit code and no kill
    Given `runBounded` is running with `stdin: "pipe"`, `graceMs` 500 and a signal
    When the signal aborts and the child exits with <exit> after 20ms
    Then `kill()` was never called
    And the result is `outcome` `"aborted"` with `exitCode` <exitCode> and `signal` <signal>
    And its `error` matches `/abort/u` and does not match `/killed/u`

    Examples:
      | exit                | exitCode | signal      |
      | code 0              | 0        | null        |
      | code 3              | 3        | null        |
      | a `SIGTERM` signal  | null     | `"SIGTERM"` |

  Scenario Outline: an abort after the run settled changes nothing
    Given `runBounded` completed with `outcome` <settled>
    When the signal aborts afterwards
    Then the result stays <settled>, `stdin.end()` is not called and no further `kill()` is attempted

    Examples:
      | settled              |
      | `"exited"`           |
      | `"deadline-expired"` |
      | `"not-started"`      |

  Scenario Outline: the abort's own faults are recorded, never thrown, and the sequence still completes
    Given `runBounded` is running with <options> and a signal, and the child <fault>
    When the signal aborts and the child does not exit
    Then `runBounded` resolves rather than rejects, with `outcome` `"aborted"`
    And <observed>

    Examples:
      | options                       | fault                                     | observed                                                            |
      | `stdin: "pipe"`, `graceMs` 20 | throws from `stdin.end()`                 | `kill()` was still called no sooner than 20ms after the abort       |
      | `stdin: "pipe"`, `graceMs` 20 | throws from `kill()`                      | `error` matches `/the kill itself did not land/u`                   |
      | `stdin: "ignore"`, `graceMs` 20 | has no `stdin` (`null`)                 | nothing was ended, and `kill()` was called no sooner than 20ms after the abort |

  Scenario Outline: graceMs is a positive integer or the named default
    When `runBounded` is called with `stdin: "pipe"`, a signal that aborts at once, `graceMs` <graceMs> and a child that never exits
    Then `kill()` follows the abort no sooner than <applied> ms

    Examples:
      | graceMs                    | applied     |
      | absent                     | the default |
      | 40                         | 40          |
      | 0                          | the default |
      | -1                         | the default |
      | `Number.NaN`               | the default |
      | `Number.POSITIVE_INFINITY` | the default |
      | `"40"`                     | the default |
      | `null`                     | the default |

  Scenario Outline: callers passing no new option are byte-identical
    When `runBounded` is called with <options> and the child exits 0
    Then the spawn double received `stdio` <stdio>, `windowsHide` true, and no `shell` key
    And the result's `outcome` is `"exited"` and its key set is exactly `SPAWN_RESULT_KEYS`

    Examples:
      | options                                        | stdio                          |
      | `{ command, args }`                            | `["ignore", "pipe", "pipe"]`   |
      | `{ command, args, deadlineMs: 10 }`            | `["ignore", "pipe", "pipe"]`   |
      | `{ command, args, stdin: "ignore" }`           | `["ignore", "pipe", "pipe"]`   |
      | `{ command, args, graceMs: 50 }`               | `["ignore", "pipe", "pipe"]`   |
      | `{ command, args, signal }`, never aborting    | `["ignore", "pipe", "pipe"]`   |
      | `{ command, args, stdin: "pipe" }`             | `["pipe", "pipe", "pipe"]`     |

  Scenario: the deadline and the abort are two different outcomes
    Given `runBounded` is running with `deadlineMs` 30, `stdin: "pipe"` and a signal that never aborts
    When the child does not exit
    Then the result's `outcome` is `"deadline-expired"`, never `"aborted"`, and its `error` matches `/30ms deadline/u`
    And `stdin.end()` was never called

  Scenario: no shell on any path
    When the spawn options of every `runBounded` call in this feature are inspected
    Then each one's key set is exactly `cwd`, `env`, `stdio`, `windowsHide`

  Scenario Outline: the first of the deadline and the abort to fire decides, with one kill
    Given `runBounded` is running with `stdin: "pipe"`, `deadlineMs` <deadline>, `graceMs` <grace> and a signal that aborts at <abortAt>
    When the child never exits
    Then the result's `outcome` is <outcome>
    And the child received exactly one `kill`

    Examples:
      | deadline | grace | abortAt | outcome             |
      | 30       | 100   | 10ms    | "aborted"           |
      | 30       | 5     | 10ms    | "aborted"           |
      | 30       | 100   | 50ms    | "deadline-expired"  |

  Scenario: a signal already aborted at the call never spawns
    Given a signal that is already aborted
    When `runBounded` is called with it and `stdin: "pipe"`
    Then the spawn double was never called
    And the result's `outcome` is `"aborted"`, `exitCode` null and `error` matches `/aborted before start/`

  Scenario Outline: an unknown stdin value is a returned not-started
    When `runBounded` is called with `stdin` <stdin>
    Then the spawn double was never called
    And the result's `outcome` is `"not-started"` and `error` names <stdin>

    Examples:
      | stdin       |
      | "inherit"   |
      | "overlapped"|
      | 0           |
