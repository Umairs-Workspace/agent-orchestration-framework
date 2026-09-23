@executable @cli @work @work-stream
Feature: the stop request lives in the aof home, keyed by loopRunId, as a ten-key record read absence-tolerantly

  ADR-001 §1-§2. A running loop cannot be signalled from another process on Windows, so the stop
  is a FILE the loop polls: `<globalMeshPaths({ env }).meshRoot>/loop-stops/<loopRunId>.json` —
  the sibling of `logs/` (the diag recorder) and `loop-fixes/` (129/ADR-005 §3), honouring
  `AOF_GLOBAL_HOME`, and never anywhere under a checkout (a loop leaves the tree as it found it;
  a lane's `git add -A` would otherwise commit it). The record has TEN keys in a frozen order —
  `loopRunId, scope, workspaceId, level, state, requestedAt, escalatedAt, honouredAt, cancelled,
  by` — written whole through `writeText` (temp + rename) after a recursive mkdir, so a reader
  never sees a half-written file. The read is absence-tolerant (`null`), and a file that does not
  parse reads `null` after ONE `reportDegrade("loop-stop-request", …)` — never a throw into the
  loop that polls it. The segment literal `loop-stops` and the state words `"requested"` /
  `"honoured"` are spelled in `src/loop/stop-request.mjs` and nowhere else under `src/`.

  RULINGS (QA, 2026-09-13). (1) `now` is a zero-argument function answering a `Date` (default
  `() => new Date()`), the shape `loop-diag.mjs` takes; every instant is written as its
  `toISOString()`. (2) "Does not parse" means does not parse AS A RECORD: a parsed value that is
  not a plain object whose `level` is the integer 1 or 2 reads `null` after one
  `reportDegrade("loop-stop-request", error, { path })`; an unknown extra key is carried, never
  degraded. (3) A `loopRunId` is ONE filename segment (`normalizeId`'s alphabet, `src/fs.mjs` —
  a `randomUUID()` fits); every export refuses another by throwing before any filesystem access,
  so an id arriving over a route (story 03) can never leave `loop-stops/`. (4) The key set never
  shrinks: an omitted `scope`, `workspaceId` or `by` is written `null` in its slot.

  Background:
    Given an isolated aof home `H` (a fresh `AOF_GLOBAL_HOME`) and a fixture checkout `C` with no `loop-stops` anywhere beneath it
    And `src/loop/stop-request.mjs` is imported with `H` in its environment and `dir` = `loopStopsDir({ AOF_GLOBAL_HOME: H })`
    And `NOW` is `() => new Date("2026-09-13T11:41:09.701Z")` and `BY` is `{ node: "win-host-a", pid: 4242 }`
    And the degrade sink is the injected test sink (`setDegradeSinkForTest`), reset before every read

  Scenario: the directory and the path are derived from the mesh root, and only there
    When `loopStopsDir({ AOF_GLOBAL_HOME: H })` is asked
    Then it answers `<H>/mesh/loop-stops`
    And `stopRequestPath(<that dir>, "27dbcc7a-3e23-402b-96fd-b59131131c56")` answers `<that dir>/27dbcc7a-3e23-402b-96fd-b59131131c56.json`
    And `loopStopsDir` with a different `AOF_GLOBAL_HOME` answers under THAT home — the resolver is `globalMeshPaths`, never `os.homedir()`

  Scenario: a written request is the ten keys, in order, whole
    Given `requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: NOW })` has been called once
    When the file at `stopRequestPath(dir, "L1")` is read as JSON
    Then its keys deep-equal, in order, `["loopRunId", "scope", "workspaceId", "level", "state", "requestedAt", "escalatedAt", "honouredAt", "cancelled", "by"]`
    And it reads `{ loopRunId: "L1", scope: "129", workspaceId: "w1", level: 1, state: "requested", requestedAt: "2026-09-13T11:41:09.701Z", escalatedAt: null, honouredAt: null, cancelled: null, by: { node: "win-host-a", pid: 4242 } }`
    And no `.tmp-*` entry remains in `dir` — the temp + rename write left nothing behind
    And `readStopRequest(dir, "L1")` deep-equals the file's content

  Scenario Outline: the key set never shrinks — an omitted carried field is written null
    When `requestLoopStop(dir, { loopRunId: "L2", now: NOW, <given> })` is called with nothing else
    Then the file's keys are the ten, in order
    And its `<key>` reads `null`

    Examples:
      | given                             | key         |
      | `scope: "129", workspaceId: "w1"` | by          |
      | `workspaceId: "w1", by: BY`       | scope       |
      | `scope: "129", by: BY`            | workspaceId |

  Scenario: the write never lands under the checkout
    Given `C` is the process's working directory and `dir` was resolved from `H`
    When `requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: NOW })` is called
    Then a recursive listing of `C` after the call deep-equals the listing before it
    And the file exists at `<H>/mesh/loop-stops/L1.json`

  Scenario Outline: the read is absence-tolerant and degrades anything that is not a record to null
    Given the file at `stopRequestPath(dir, "L1")` <state>
    When `readStopRequest(dir, "L1")` is asked
    Then it answers <answer>
    And the degrade sink received <degrades> coded `"loop-stop-request"`, each carrying `path` = that file's path
    And no error was thrown

    Examples:
      | state                                                 | answer                | degrades  |
      | does not exist                                        | `null`                | no event  |
      | does not exist, nor does `dir` itself                 | `null`                | no event  |
      | holds the ten-key record                              | that record           | no event  |
      | holds the ten-key record plus an unknown eleventh key | that object, key kept | no event  |
      | is empty (zero bytes)                                 | `null`                | one event |
      | holds `{ not json`                                    | `null`                | one event |
      | holds a JSON array                                    | `null`                | one event |
      | holds JSON `null`                                     | `null`                | one event |
      | holds `{ "loopRunId": "L1" }` — no `level`            | `null`                | one event |
      | holds the record with `level` 0                       | `null`                | one event |
      | holds the record with `level` 3                       | `null`                | one event |
      | holds the record with `level` `"2"` (a string)        | `null`                | one event |

  Scenario Outline: an id that is not one filename segment is refused before the filesystem is touched
    When each of `stopRequestPath(dir, <id>)`, `requestLoopStop(dir, { loopRunId: <id>, by: BY, now: NOW })`, `readStopRequest(dir, <id>)`, `markStopHonoured(dir, <id>, { now: NOW, cancelled: null })`, `clearStopRequest(dir, <id>)` and `createStopSource({ loopRunId: <id>, dir, process: a fresh EventEmitter, pollMs: 0 })` is called
    Then each throws an error naming `loopRunId`
    And `dir` still does not exist, nothing was written anywhere under `H`, and the emitter has no listener

    Examples:
      | id                                |
      | `undefined`                       |
      | `""`                              |
      | `"../L1"`                         |
      | `"a/b"`                           |
      | a string containing a backslash   |
      | `"a:b"`                           |

  Scenario: the level word map has exactly two entries and is frozen
    When `STOP_LEVELS` is read
    Then it deep-equals `{ drain: 1, cancel: 2 }`
    And it is frozen — assigning a third key throws a `TypeError`

  Scenario: the home-side literals have one home
    When every module under `src/` other than `src/loop/stop-request.mjs` is read with its comments stripped
    Then none contains the text `loop-stops`
    And none contains the literal `"honoured"`, and none spells `"requested"` as a stop-request `state` (the literal names a recovery-push and a resync state elsewhere; FF-13001 is the sweep, story 05's)
    And `src/loop/stop-request.mjs` contains both, and imports `globalMeshPaths` from `../workspace.mjs`, `writeText` from `../fs.mjs` and `reportDegrade` from `../degrade.mjs`
