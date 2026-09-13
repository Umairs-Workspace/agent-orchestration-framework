@executable @cli @work @work-stream
Feature: the ladder is 129/04's — the first request drains, the second cancels, and the lifecycle is requested → honoured → cleared

  ADR-001 §3-§4. `requestLoopStop` is the ONE writer of a request and its answer says what it
  did: no file → level 1 `requested` (`created: true`); a level-1 `requested` file → level 2 with
  `escalatedAt` (`escalated: true`); a level-2 file → unchanged (`escalated: false`); a file already
  `honoured` → unchanged, and the answer says so. The first request DRAINS (the shell stops
  dispatching, the in-flight drive finishes, the loop halts `operator-interrupt`); the second
  CANCELS the in-flight session now — the same two rungs 129/04 task 06 gives SIGINT. The
  lifecycle closes through two more exports: `markStopHonoured` (the SHELL's, at the halt it
  produces for the request — only the loop knows it has halted) sets `state: "honoured"`,
  `honouredAt` and `cancelled` (the runId the loop cancelled, or `null`); `clearStopRequest`
  deletes the file (the shell's, on `--resume` — the operator asking for the loop back), and is
  a no-op on an absent file. A `honoured` request is NOT re-openable by another `requestLoopStop`:
  the stop stands until a resume clears it.

  RULINGS (QA, 2026-09-13). (1) `now` is the `Date`-answering function task 00 rules; instants
  are written as the clock gives them and never compared or clamped — a clock that goes
  backwards writes an `escalatedAt` or `honouredAt` earlier than `requestedAt` (ADR-001 §4: the
  stale rule needs no clock comparison, so neither does this file). (2) `by` and `requestedAt`
  are the creator's; an escalation rewrites `level` and `escalatedAt` only. (3) A corrupt file is
  `null` to every writer, each after one degrade: `requestLoopStop` overwrites it whole
  (`created: true`, level 1), `markStopHonoured` answers `null` and leaves it, `clearStopRequest`
  deletes it and answers `{ cleared: true, record: null }`. (4) There is no lock: concurrent
  writers on one id are last-rename-wins, each write whole — a torn file is impossible, a lost
  update is not. (5) A second `markStopHonoured` on an `honoured` request is ADR-001 §5's
  idempotent re-mark: it answers the record unchanged, `honouredAt` and `cancelled` the first
  mark's.

  Background:
    Given an isolated aof home and `dir` = `loopStopsDir()`
    And `NOW` is an injected clock answering successive `Date`s whose ISO strings are `T1`, `T2`, `T3`, …
    And `BY` is `{ node: "umamis-msi", pid: 4242 }` and the degrade sink is the injected test sink

  Scenario Outline: each call answers what it did and the file reads the ladder's state
    Given the request for `"L1"` <before>
    When `requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: NOW })` is called
    Then the answer deep-equals <answer>
    And the file reads `level` <level>, `state` <state>, `escalatedAt` <escalatedAt>
    And `requestedAt` is unchanged from the first write when one existed

    Examples:
      | before                 | answer                                                                       | level | state         | escalatedAt |
      | does not exist         | `{ created: true, escalated: false, level: 1, state: "requested", record }`  | 1     | `"requested"` | `null`      |
      | is level 1 `requested` | `{ created: false, escalated: true, level: 2, state: "requested", record }`  | 2     | `"requested"` | `T2`        |
      | is level 2 `requested` | `{ created: false, escalated: false, level: 2, state: "requested", record }` | 2     | `"requested"` | unchanged   |
      | is level 1 `honoured`  | `{ created: false, escalated: false, level: 1, state: "honoured", record }`  | 1     | `"honoured"`  | `null`      |
      | is level 2 `honoured`  | `{ created: false, escalated: false, level: 2, state: "honoured", record }`  | 2     | `"honoured"`  | unchanged   |

  Scenario: the level never climbs past two
    Given `requestLoopStop` has been called four times for `"L1"`
    When the file is read
    Then `level` is 2 and `escalatedAt` is the instant of the SECOND call
    And the third and fourth answers were `{ created: false, escalated: false, level: 2, state: "requested", record }`

  Scenario: an escalation by another writer keeps the creator's by and requestedAt
    Given the request for `"L1"` was created by `BY` at `T1`
    When `requestLoopStop` is called for `"L1"` with `by: { node: "aof-wsl", pid: 77 }`
    Then the file reads `level` 2, `by` `{ node: "umamis-msi", pid: 4242 }` and `requestedAt` `T1`

  Scenario Outline: a clock that goes backwards is written as given, never compared or clamped
    Given the request for `"L1"` is level 1 `requested` with `requestedAt` `T3`
    And the clock now answers `T1`, earlier than `T3`
    When <call> is called
    Then the file reads <field> `T1` and `requestedAt` `T3`
    And no error was thrown

    Examples:
      | call                                                         | field         |
      | `requestLoopStop` for `"L1"`                                 | `escalatedAt` |
      | `markStopHonoured(dir, "L1", { now: NOW, cancelled: null })` | `honouredAt`  |

  Scenario Outline: markStopHonoured closes the request once and records what was cancelled
    Given the request for `"L1"` <before>
    When `markStopHonoured(dir, "L1", { now: NOW, cancelled: <cancelled> })` is called
    Then the file reads `state` `"honoured"`, `level` <level>, `honouredAt` <honouredAt>, `cancelled` <written>
    And the answer is the record

    Examples:
      | before                                                | cancelled                    | level | honouredAt               | written                      |
      | is level 1 `requested`                                | `null`                       | 1     | the clock's next instant | `null`                       |
      | is level 2 `requested`                                | `"20260913T110303238Z-0000"` | 2     | the clock's next instant | `"20260913T110303238Z-0000"` |
      | is level 2 `honoured` at `T5` with `cancelled` `null` | `"20260913T110303238Z-0000"` | 2     | `T5` — unchanged         | `null` — unchanged           |

  Scenario: marking an absent request honoured is a no-op that answers null
    Given no request exists for `"L9"`
    When `markStopHonoured(dir, "L9", { now: NOW, cancelled: null })` is called
    Then it answers `null` and no file is created

  Scenario Outline: clearStopRequest deletes the file whatever its state, and tolerates absence
    Given the request for `"L1"` <state>
    When `clearStopRequest(dir, "L1")` is called
    Then it answers <answer>
    And `readStopRequest(dir, "L1")` answers `null`
    And no error was thrown

    Examples:
      | state                | answer                             |
      | is level 1 requested | `{ cleared: true, record }`        |
      | is level 2 honoured  | `{ cleared: true, record }`        |
      | does not exist       | `{ cleared: false, record: null }` |

  Scenario Outline: a corrupt file is null to every writer, and each says what it did
    Given the file at `stopRequestPath(dir, "L1")` holds `{ not json` and the degrade sink is reset
    When <call> is called
    Then it answers <answer>
    And the file <file>
    And the degrade sink received one event coded `"loop-stop-request"`
    And no error was thrown

    Examples:
      | call                                                                                           | answer                                                                      | file                             |
      | `requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: NOW })` | `{ created: true, escalated: false, level: 1, state: "requested", record }` | is the ten-key record at level 1 |
      | `markStopHonoured(dir, "L1", { now: NOW, cancelled: null })`                                   | `null`                                                                      | still holds `{ not json`         |
      | `clearStopRequest(dir, "L1")`                                                                  | `{ cleared: true, record: null }`                                           | is gone                          |

  Scenario: two writers racing on one id both see a whole file
    Given two `requestLoopStop` calls for `"L1"` are started without awaiting between them
    When both settle
    Then the file parses as one ten-key record at level 1 or 2
    And neither call threw

  Scenario: an escalation racing a mark on one id leaves one whole answer, never a torn file
    Given the request for `"L1"` is level 1 `requested`
    When `requestLoopStop` for `"L1"` and `markStopHonoured(dir, "L1", { now: NOW, cancelled: null })` are started without awaiting between them and both settle
    Then the file parses as one ten-key record
    And it reads one of `level` 2 `"requested"`, `level` 1 `"honoured"` or `level` 2 `"honoured"` — the last rename's, over whatever that writer read
    And neither call threw
