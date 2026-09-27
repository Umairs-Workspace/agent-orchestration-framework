@executable @cli @work @work-stream
Feature: presence carries the loops — an additive key read by the same pass as activeRuns, omitted when empty, emitted by both producers and the reshape

  ADR-005 §1-§2. `readActiveLoops(items, { workspaceId, stopRequestFor })` sits beside
  `readActiveRuns` and walks the SAME `readRuns` read: every `running` run whose `brief.loop` is
  usable contributes to ONE entry per `loopRunId` (the latest such run), ELEVEN keys in frozen
  order — `{ loopRunId, workspaceId, scope, level, cap, phase, cycle, ref, runId, supervised, stop }`
  — `ref` the run's `itemRef`, `stop` ∈ {`null`, `"drain"`, `"cancel"`} read through story 01's
  `readStopRequest` and mapped by `STOP_LEVELS` (a `honoured` request still maps by level — the
  loop is exiting). `assemblePresenceRecord` gains `loops` and emits it LAST, after `buildId`, and
  ONLY when non-empty — the `buildId` discipline: the six existing keys are byte-identical when no
  loop runs, so the eleven suites that deep-equal the record's key list re-pin nothing. Every reader
  treats an absent key as `[]`. BOTH producers carry it — the heartbeat verb and the launcher's
  tick (`assembleActiveRunsAndSubsumedWorkspaces` returns `loops` beside `activeRuns`), because the
  tick's record is what this machine actually publishes — and the registry's reshape passes it
  through. The cached-run half of the union contributes no loop: a loop is local by definition.
  `activeRuns` stays the frozen `string[]`.

  RULINGS (QA, 2026-09-13). "Usable" is `readLoopDeclaration`'s five-key rule (`src/work/loop.mjs`
  `usableDeclaration`: `loopRunId`, `scope`, `level`, `cap`, `startedAt` present and non-null) — the
  only definition the tree has; the read COPIES the other values through and validates nothing
  further, so `cap: 0` rides as `0` and a missing `cycle` as `null` (how the line renders them is
  task 03's). Liveness is not this read's question: a `running` run with a stale `heartbeatAt` is
  listed exactly as `activeRuns` lists it — the verb's `live` and the desktop say otherwise. Entry
  order is encounter order over the items handed in (the UI sorts). "Latest" is `createdAt` then
  `runId` (`compareRuns`). A request file that does not parse reads `null` (ADR-001 §2), so `stop`
  is `null`. The read is a READ: every run record is byte-identical after it.

  Background:
    Given an isolated aof home and a fixture workspace `W` (`workspaceId` `"w1"`) holding items `03`, `03/01` and `03/02`
    And `stopRequestFor` answers what the test wrote under `loopStopsDir()`
    And a "usable" `brief.loop` is `{ loopRunId, scope, level, cap, phase, cycle, startedAt, id, supervised }` unless a row says otherwise

  Scenario Outline: readActiveLoops reduces the running runs to one entry per loop
    Given the items' run records are <records>
    When `readActiveLoops([03, 03/01, 03/02], { workspaceId: "w1", stopRequestFor })` is awaited
    Then it answers <answer>
    And every entry's keys are, in order, `["loopRunId", "workspaceId", "scope", "level", "cap", "phase", "cycle", "ref", "runId", "supervised", "stop"]`
    And every run record's bytes are unchanged

    Examples:
      | records                                                                                      | answer                                                                                             |
      | none                                                                                         | `[]`                                                                                               |
      | `03/01` `running` with `brief.loop` `{ loopRunId: "L1", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, supervised: false, … }` | one entry `{ loopRunId: "L1", workspaceId: "w1", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, ref: "03/01", runId: <that runId>, supervised: false, stop: null }` |
      | `03/01` `done` with a `brief.loop`                                                           | `[]` — only `running` runs count                                                                   |
      | `03/01` `queued` with a `brief.loop`                                                         | `[]` — queued is pre-running                                                                       |
      | `03/01` `running` with no `brief.loop`                                                       | `[]`                                                                                               |
      | `03/01` `running` with a `brief.loop` missing `scope`                                        | `[]` — an unusable declaration is not a loop                                                       |
      | `03/01` `running` with a `brief.loop` whose `startedAt` is `null`                            | `[]` — the five-key rule, not a four-key one                                                       |
      | `03/01` `running` with `cap: 0` and no `cycle` key                                           | one entry with `cap: 0`, `cycle: null` — copied, not validated                                     |
      | `03/01` `running` with `phase: "verify"`, `cycle: 3`                                         | one entry with `phase: "verify"`, `cycle: 3`                                                       |
      | `03/01` `running` with a `heartbeatAt` ten minutes old                                       | one entry — liveness is not this read's question                                                   |
      | `03/01` and `03/02` both `running` under the same `loopRunId` `"L1"`, `03/02` created later  | one entry, `ref` `"03/02"` and `runId` from the LATER record                                       |
      | `03/01` `running` under `"L1"` and `03/02` `running` under `"L2"`                             | two entries, `"L1"` then `"L2"` — the items' order                                                 |
      | `03/01` `running` under `"L1"` and `03/02` `done` under `"L1"`, `03/02` created later        | one entry, `ref` `"03/01"` — the done run is not in the reduction                                  |

  Scenario Outline: the standing request rides the entry as a word
    Given `03/01` is `running` under `"L1"` and the request for `"L1"` <request>
    When `readActiveLoops` is awaited
    Then the entry's `stop` is <stop>

    Examples:
      | request                              | stop        |
      | does not exist                       | `null`      |
      | is level 1 `requested`               | `"drain"`   |
      | is level 2 `requested`               | `"cancel"`  |
      | is level 1 `honoured`                | `"drain"`   |
      | is level 2 `honoured`                | `"cancel"`  |
      | is a file that does not parse        | `null`      |
      | exists for `"L9"` only               | `null` — keyed by `loopRunId`, never by scope |

  Scenario Outline: the record is additive — six keys byte-identical without loops, loops last with them
    When `assemblePresenceRecord({ nodeId: "n1", heartbeatAt: T, activeRuns: ["r1"], sessions: [], aofVersion: "0.1.0", buildId: "b1"<loops> })` is called
    Then its keys deep-equal <keys>
    And `JSON.stringify` of it without `loops` equals today's record's `JSON.stringify` byte for byte

    Examples:
      | loops                                   | keys                                                                          |
      | ``                                      | `["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"]`  |
      | `, loops: []`                           | `["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"]`  |
      | `, loops: undefined`                    | `["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"]`  |
      | `, loops: null`                         | `["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"]`  |
      | `, loops: "L1"`                         | the six — a non-array is not a loops list                                       |
      | `, loops: [<one eleven-key entry>]`     | `[…the six, "loops"]`                                                          |

  Scenario: a record without buildId still puts loops last
    When `assemblePresenceRecord({ nodeId: "n1", heartbeatAt: T, activeRuns: [], sessions: [], aofVersion: "0.1.0", loops: [<one entry>] })` is called
    Then its keys deep-equal `["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "loops"]`

  Scenario: activeRuns is still the frozen string array
    Given `03/01` is `running` under `"L1"`
    When `readActiveRuns([03/01])` and `readActiveLoops(…)` are awaited
    Then `readActiveRuns` answers `[<runId>]` — strings only — and the loop entry's `runId` equals it

  Scenario Outline: both producers carry the key, and the reshape keeps it
    Given the run records are <records>
    When `mesh:heartbeat` runs against `W` and, separately, the launcher's tick assembles this node's record
    Then each published record <carries>
    And `global-node-registry.mjs`'s reshape of the published disk record answers the same keys in the same order

    Examples:
      | records                                                        | carries                                                                 |
      | `03/01` `running` under `"L1"`                                  | `loops` with the one entry, as its LAST key                             |
      | none running                                                    | no `loops` key at all                                                   |
      | `03/01` `running` under `"L1"` and a second registered workspace `w2` with its own running loop `"L2"` | `loops` with ONE entry from the verb (it reads `W` alone) and TWO from the tick, `workspaceId` `"w1"` then `"w2"` |

  Scenario: the cached half of the union contributes no loop
    Given the node's cached active run ids name a run on a workspace this machine does not hold
    When the launcher's tick assembles the record
    Then `activeRuns` carries that run id and `loops` carries no entry for it

  Scenario: a workspace whose items cannot be enumerated loses its loops, not the tick
    Given two registered workspaces where the second's item enumeration throws
    When the launcher's tick assembles the record
    Then `loops` carries the first workspace's entry and the tick completes

  Scenario: the desktop's parser tolerates the new key
    When `app/desktop/crates/core/src/status.rs` is read
    Then its `Presence` struct carries no `deny_unknown_fields` attribute, so a record carrying `loops` parses and `active_runs` reads as before
