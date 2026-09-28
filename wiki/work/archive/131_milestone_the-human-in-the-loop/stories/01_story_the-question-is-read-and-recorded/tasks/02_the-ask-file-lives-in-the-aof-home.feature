@executable @cli @work @work-stream
Feature: one ask file per run lives in the aof home, fifteen keys in a frozen order, owned by one module

  ADR-003 §1. `src/loop/ask-request.mjs` owns the ask, in the shape of `src/loop/stop-request.mjs`.
  The directory is `loopAsksDir(env)` = `<globalMeshPaths({ env }).meshRoot>/loop-asks`, which
  honours `AOF_GLOBAL_HOME` and is never under a checkout. The file is
  `askRequestPath(dir, runId)` = `<dir>/<runId>.json`, keyed by run and never by ref (130's
  stale-key hazard). The record has FIFTEEN keys in this order: `runId, ref, workspaceId,
  loopRunId, scope, sessionId, phase, node, question, askedAt, state, parkedAt, answer,
  answeredAt, by`. `ASK_STATES` is `waiting | parked | answered`. Every write goes through
  `writeText` (temp + rename). A read tolerates absence. A file that is not a record reads `null`
  after ONE `reportDegrade("loop-ask-request", …)`. The owner's exports are `openAsk`, `parkAsk`
  and `clearAsk`. The verb's is `answerAsk` (task 03). `readAsk` and `readAsks` are the reads,
  and `createAskPoll` is the owner's poll, with the stop source's shape.

  RULINGS (PO, 2026-09-23). (1) `now` is a zero-argument function answering a `Date`, and every
  instant is written as its `toISOString()`, as the stop request does. (2) A `runId` is ONE
  filename segment (`normalizeId`'s alphabet). Every export that takes one refuses another by
  throwing a `TypeError` that names `runId`, before any filesystem access. (3) A record is a
  plain object whose `state` is one of the three `ASK_STATES` words. An unknown extra key is
  carried and never degraded. (4) An omitted carried field is written `null` in its slot, so the
  key set never shrinks. (5) `openAsk` OVERWRITES whatever the file holds, answered or not: a
  resumed session that asks again is a new question. (6) `parkAsk` moves only a `waiting` ask. It
  leaves a `parked` or `answered` ask byte-unchanged, and answers `null` for an absent one: an
  answer that landed first wins the race with the bound. (7) `readAsks(dir, { workspaceId })`
  answers the records whose `workspaceId` matches, ordered by `askedAt`. It skips a non-record
  file and reports it through `reportDegrade`, which throttles repeats per code, so several
  corrupt files in one read may show as a single event. It answers `[]` for an absent directory. (8) `createAskPoll`'s
  interval is `unref`'d, `pollMs` defaults to 2000, and `stop()` clears it.

  RULINGS (QA, 2026-09-23). (1) `readAsks` reads only directory entries named `<segment>.json`.
  Any other entry, such as a `.tmp-*` write in flight or a stray `notes.txt`, is skipped with no
  degrade. Records with equal `askedAt` are ordered by `runId` ascending. (2) `parkAsk` answers the
  record as it stands after the call: the parked record, or the unchanged `parked` or `answered`
  record. A file that is not a record answers `null` after one degrade, and is left as it is.
  (3) `createAskPoll` follows the stop source: construction reads nothing, `ask()` is `null` before
  the first poll, `pollMs` of `0`, a negative number or a non-number arms no interval, and a poll
  that reads a non-record answers `null` after one degrade and never rejects.

  Background:
    Given an isolated aof home `H` (a fresh `AOF_GLOBAL_HOME`) and a fixture checkout `C` with no `loop-asks` anywhere beneath it
    And `dir` = `loopAsksDir({ AOF_GLOBAL_HOME: H })`, `NOW` = `() => new Date("2026-09-23T17:00:00.000Z")`
    And `ASK` = `{ runId: "R1", ref: "131/01", workspaceId: "w1", loopRunId: "L1", scope: "131", sessionId: "S1", phase: "refine", node: "node-7297", question: "Decision needed: X" }`
    And the degrade sink is the injected test sink, reset before every read

  Scenario: the directory and the path derive from the mesh root, and only there
    When `loopAsksDir({ AOF_GLOBAL_HOME: H })` is asked
    Then it answers `<H>/mesh/loop-asks`
    And `askRequestPath(<that dir>, "20260923T173003685Z-0000")` answers `<that dir>/20260923T173003685Z-0000.json`

  Scenario: an opened ask is the fifteen keys, in order, waiting, whole
    When `openAsk(dir, { ...ASK, now: NOW })` is awaited
    Then the file at `askRequestPath(dir, "R1")` has keys deep-equal, in order, to `["runId", "ref", "workspaceId", "loopRunId", "scope", "sessionId", "phase", "node", "question", "askedAt", "state", "parkedAt", "answer", "answeredAt", "by"]`
    And it reads `{ ...ASK, askedAt: "2026-09-23T17:00:00.000Z", state: "waiting", parkedAt: null, answer: null, answeredAt: null, by: null }`
    And no `.tmp-*` entry remains in `dir`
    And `readAsk(dir, "R1")` deep-equals the file's content

  Scenario: a re-ask overwrites the answered ask it follows
    Given the ask for `R1` has been answered
    When `openAsk(dir, { ...ASK, question: "Decision needed: Y", now: NOW })` is awaited
    Then `readAsk(dir, "R1")` reads `state: "waiting"`, `question: "Decision needed: Y"`, and `answer`, `answeredAt` and `by` all `null`

  Scenario Outline: openAsk writes a whole waiting record over whatever the file held
    Given the file for `R1` <prior>
    When `openAsk(dir, { ...ASK, question: "Decision needed: Y", now: () => new Date("2026-09-23T18:00:00.000Z") })` is awaited
    Then `readAsk(dir, "R1")` deep-equals `{ ...ASK, question: "Decision needed: Y", askedAt: "2026-09-23T18:00:00.000Z", state: "waiting", parkedAt: null, answer: null, answeredAt: null, by: null }`

    Examples:
      | prior                                                         |
      | does not exist                                                |
      | holds a `waiting` ask for `"Decision needed: X"`              |
      | holds a `parked` ask with `parkedAt` `2026-09-23T17:30:00.000Z` |
      | holds an `answered` ask with `answer: "b"`                    |
      | holds `{ not json`                                            |

  Scenario Outline: the key set never shrinks, and an omitted carried field is written null
    When `openAsk(dir, { ...ASK, <omitted>: undefined, now: NOW })` is awaited
    Then the file's keys are the fifteen, in order, and its `<omitted>` reads `null`

    Examples:
      | omitted   |
      | loopRunId |
      | scope     |
      | node      |
      | sessionId |

  Scenario: parking moves a waiting ask and nothing else
    Given the ask for `R1` is `waiting`
    When `parkAsk(dir, "R1", { now: NOW })` is awaited
    Then `readAsk(dir, "R1")` reads `state: "parked"` and `parkedAt: "2026-09-23T17:00:00.000Z"`, with every other key unchanged

  Scenario Outline: parkAsk after each prior state, including the answer that won the race
    Given the file for `R1` <prior>
    When `parkAsk(dir, "R1", { now: () => new Date("2026-09-23T19:00:00.000Z") })` is awaited
    Then it answers <answer>
    And the file for `R1` <after>, and the degrade sink received <degrades> coded `"loop-ask-request"`

    Examples:
      | prior                                                            | answer                    | after                                              | degrades  |
      | holds a `waiting` ask                                            | the parked record         | reads `parkedAt: "2026-09-23T19:00:00.000Z"`       | no event  |
      | holds a `parked` ask with `parkedAt` `2026-09-23T17:30:00.000Z`  | that record, unchanged    | is byte-unchanged                                  | no event  |
      | holds an `answered` ask with `answer: "b"`                       | that record, unchanged    | is byte-unchanged                                  | no event  |
      | does not exist                                                   | `null`                    | still does not exist                               | no event  |
      | holds `{ not json`                                               | `null`                    | is byte-unchanged                                  | one event |

  Scenario: clearing removes the file, and clearing twice is quiet
    Given the ask for `R1` exists
    When `clearAsk(dir, "R1")` is awaited twice
    Then no file exists at `askRequestPath(dir, "R1")`, neither call threw, and the degrade sink received nothing

  Scenario: the write never lands under the checkout
    Given `C` is the process's working directory
    When `openAsk(dir, { ...ASK, now: NOW })` is awaited
    Then a recursive listing of `C` after the call deep-equals the listing before it

  Scenario Outline: the read is absence-tolerant and degrades anything that is not a record to null
    Given the file at `askRequestPath(dir, "R1")` <state>
    When `readAsk(dir, "R1")` is awaited
    Then it answers <answer>
    And the degrade sink received <degrades> coded `"loop-ask-request"`, carrying `path` = that file's path

    Examples:
      | state                                 | answer      | degrades  |
      | does not exist, nor does `dir`        | `null`      | no event  |
      | holds the fifteen-key waiting record  | that record | no event  |
      | holds `{ not json`                    | `null`      | one event |
      | holds the record with `state` "done"  | `null`      | one event |
      | holds the fifteen-key record plus an unknown key `"extra": 1` | that record, key kept | no event |
      | holds `{ "state": "parked" }` and nothing else | that object | no event |
      | is empty (zero bytes)                 | `null`      | one event |
      | holds a JSON array                    | `null`      | one event |
      | holds JSON `null`                     | `null`      | one event |
      | holds the record with `state` "WAITING" | `null`    | one event |
      | holds the record with no `state` key  | `null`      | one event |
      | is a directory                        | `null`      | one event |

  Scenario Outline: a runId that is not one filename segment is refused before the filesystem is touched
    When each of `askRequestPath`, `openAsk`, `parkAsk`, `readAsk`, `clearAsk` and `createAskPoll` is called with the runId <id>
    Then each throws a `TypeError` naming `runId`, and `dir` still does not exist

    Examples:
      | id                              |
      | `"../R1"`                       |
      | `"a/b"`                         |
      | `undefined`                     |
      | `""`                            |
      | `".."`                          |
      | `".hidden"`                     |
      | a string containing a backslash |
      | `"a:b"`                         |
      | `"R 1"`                         |
      | the number `42`                 |

  Scenario: readAsks answers one workspace's records, ordered, and skips what is not a record
    Given `dir` holds `R1` (`w1`, `answered`, askedAt `17:02`), `R2` (`w1`, `waiting`, `17:01`), `R4` (`w1`, `parked`, `17:01`) and `R3` (`w2`, `waiting`, `17:00`), all on `2026-09-23`
    And `dir` also holds `R6.json` holding `{ not json`, a `.tmp-R5.json-1-2-x` holding half a record, and `notes.txt`
    When `readAsks(dir, { workspaceId: "w1" })` is awaited
    Then its `runId`s deep-equal `["R2", "R4", "R1"]`
    And the degrade sink received one event coded `"loop-ask-request"`, carrying `path` = `R6.json`'s path, and none for the other two entries

  Scenario Outline: readAsks answers an empty list without a fault
    Given `dir` <state>
    When `readAsks(dir, { workspaceId: "w1" })` is awaited
    Then it answers `[]`, no error is thrown, and the degrade sink received nothing

    Examples:
      | state                                        |
      | does not exist                               |
      | exists and is empty                          |
      | holds only `R3` for workspace `w2`           |
      | holds only a `.tmp-R1.json-1-2-x` entry      |

  Scenario: the poll reads the file on its interval and never holds the process open
    Given `createAskPoll({ dir, runId: "R1", pollMs: 5, timers: <fake timers> })` has been started
    When the ask for `R1` is answered and the fake interval fires once
    Then `ask()` answers the answered record
    And the interval was `unref`'d, and after `stop()` the fake timers hold no interval

  Scenario Outline: the poll arms one interval only for a positive finite pollMs
    When `createAskPoll({ dir, runId: "R1", pollMs: <pollMs>, timers: <fake timers> })` is started
    Then the fake timers hold <armed> interval(s), with period <period>
    And `ask()` answers `null` before any interval has fired

    Examples:
      | pollMs      | armed | period |
      | omitted     | 1     | 2000   |
      | `5`         | 1     | 5      |
      | `0`         | 0     | none   |
      | `-1`        | 0     | none   |
      | `"5"`       | 0     | none   |
      | `Infinity`  | 0     | none   |

  Scenario: a poll over a file that is not a record answers null and never rejects
    Given `createAskPoll({ dir, runId: "R1", pollMs: 5, timers: <fake timers> })` has been started, and the file for `R1` holds `{ not json`
    When the fake interval fires once
    Then `ask()` answers `null`, nothing rejected, and the degrade sink received one event coded `"loop-ask-request"`

  Scenario: the ask's words have one home
    When every module under `src/` other than `src/loop/ask-request.mjs` is read with its comments stripped
    Then none contains the text `loop-asks`
    And `src/loop/ask-request.mjs` imports `globalMeshPaths` from `../workspace.mjs`, `writeText` from `../fs.mjs` and `reportDegrade` from `../degrade.mjs`
