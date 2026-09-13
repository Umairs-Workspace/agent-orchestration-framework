@executable @cli @work @work-stream
Feature: stopLoop resolves the scope's loop from its run records, writes or escalates the request through one core, and answers seven keys or a coded refusal

  ADR-002 §3-§7, ADR-006 §1. `stopLoop(workspace, { scope, now })` in `src/loop/stop.mjs` is the
  ONE function the CLI face, the fleet route and the desktop reach. In order: `decideLoopScope`
  (refusal → `loop-stop-scope`); the items in scope through `listItems` + `loopScopeIncludes`, their
  runs through `readRuns`; `readLoopDeclaration` (`null` → `loop-stop-no-declaration`); the latest
  run carrying that `loopRunId` — when its `node` and `workspace.config.mesh.nodeId` are both
  strings and differ → `loop-stop-not-local`, naming both and the remedy (a `null` node counts as
  local); `live` = that run `isRunning` and not `isStale` under `heartbeatFromConfig(workspace)`;
  then `requestLoopStop` with `by: { node, pid }` — and when `live === false` the request is marked
  `honoured` at once (no loop will honour it; the mark is what stops the supervisor relaunching a
  dead one). A refusal is `{ ok: false, code, message }`, never a throw; success is SEVEN keys in
  frozen order `{ ok: true, loopRunId, scope, live, request, state, path }` with `request` ∈
  {`"drain"`, `"cancel"`} for the level AFTER the call (through `STOP_LEVELS`) and `state` ∈
  {`"requested"`, `"honoured"`}. A third call answers `"cancel"` again. The verb reads run records
  only — `supervised` plays no part, so a foreground loop is first-class. The command face
  `stopLoopCommand` maps `ok: false` to `commandError(message, code, 404 for no-declaration, 409
  otherwise)`; `render` prints one line; `json` answers the document verbatim.

  RULINGS (QA, 2026-09-13). (1) "Latest declaration" is `readLoopDeclaration`'s own order —
  greatest `createdAt`, then greatest `runId` — over EVERY run in scope, whichever item it sits
  on; an older loop still `running` is not the target when a newer declaration exists. (2) The
  stale boundary is `isStale`'s: `age > heartbeatMs` — a heartbeat exactly `heartbeatMs` old is
  live. (3) A `node` that is the empty string reads as absent, by `meshNodeIdOf`'s own `length > 0`
  rule on the config side — a refusal naming an empty node would send the operator to no console.
  (4) A not-live loop's request is honoured at the first call and, by 01/task 01's ladder, a
  honoured request is not re-opened: the second and third calls answer `drain`/`honoured` again.
  The verb and the driver judge staleness by the same `heartbeatMs`, so a record the verb calls
  dead is one the driver is already timing out.

  Background:
    Given an isolated aof home and a loop fixture over stream `03` whose config's `mesh.nodeId` hydrates to `"umamis-msi"` and carries no `mesh.workspaceId`
    And `NOW` is an injected clock and `heartbeatMs` is the fixture's resolved `heartbeatFromConfig` (the 15-minute default)
    And a declaration `D` with `loopRunId` `"L1"` on scope `"03"` is written onto run records of the fixture as the loop shell writes them

  Scenario Outline: liveness is the record's own, and the request is written either way
    Given the latest run carrying `D` is <run>
    When `stopLoop(workspace, { scope: "03", now: NOW })` is called once
    Then it answers `{ ok: true, loopRunId: "L1", scope: "03", live: <live>, request: "drain", state: <state>, path: <the request file> }` with keys in that order
    And the request file reads `level` 1, `state` <state>, `by` `{ node: "umamis-msi", pid: process.pid }`, `workspaceId` `null`, `honouredAt` <honouredAt>

    Examples:
      | run                                                              | live  | state         | honouredAt |
      | `running` with `heartbeatAt` 1 ms inside `heartbeatMs`            | true  | `"requested"` | `null`     |
      | `running` with `heartbeatAt` exactly `heartbeatMs` before `NOW`   | true  | `"requested"` | `null`     |
      | `running` with `heartbeatAt` `heartbeatMs` + 1 ms before `NOW`    | false | `"honoured"`  | `NOW`      |
      | `running` with no `heartbeatAt` and `updatedAt` fresh             | true  | `"requested"` | `null`     |
      | `queued`                                                          | false | `"honoured"`  | `NOW`      |
      | `done`                                                           | false | `"honoured"`  | `NOW`      |
      | `failed` (`timeout`)                                             | false | `"honoured"`  | `NOW`      |
      | `cancelled`                                                      | false | `"honoured"`  | `NOW`      |

  Scenario Outline: the second call escalates a live loop, a third is idempotent, and a honoured request is not re-opened
    Given the latest run carrying `D` is <run>
    When `stopLoop(workspace, { scope: "03", now: NOW })` is called three times
    Then the answers' `(request, state)` pairs are, in order, <answers>
    And the file reads `level` <level> after the second call and is byte-identical after the third

    Examples:
      | run                    | answers                                                                     | level |
      | `running` and fresh    | `("drain", "requested")`, `("cancel", "requested")`, `("cancel", "requested")` | 2     |
      | `done`                 | `("drain", "honoured")`, `("drain", "honoured")`, `("drain", "honoured")`      | 1     |

  Scenario Outline: refusals are coded documents, never throws
    Given <situation>
    When `stopLoop(workspace, { scope: <scope>, now: NOW })` is called
    Then it answers `{ ok: false, code: <code>, message: <message> }` and nothing else
    And no request file was written and `loop-stops` was not created

    Examples:
      | situation                                                               | scope     | code                          | message                                                  |
      | nothing                                                                 | `"nope"`  | `"loop-stop-scope"`           | the scope refusal's own message                          |
      | nothing                                                                 | `""`      | `"loop-stop-scope"`           | the scope refusal's own message                          |
      | nothing                                                                 | `"05-03"` | `"loop-stop-scope"`           | the scope refusal's own message (lo greater than hi)     |
      | nothing                                                                 | `"03/01"` | `"loop-stop-scope"`           | the scope refusal's own message (a story ref is not a driver) |
      | no item at all in scope                                                 | `"04"`    | `"loop-stop-no-declaration"`  | names the scope and `aof work loop 04` as the way to start one |
      | runs in scope, none carrying a usable declaration (a bare `work:drive` run) | `"03"` | `"loop-stop-no-declaration"`  | names the scope and `aof work loop 03` as the way to start one |
      | the latest run carrying `D` has `node` `"umamis-mac-mini"`              | `"03"`    | `"loop-stop-not-local"`       | names `umamis-mac-mini`, `umamis-msi`, and "stop it on umamis-mac-mini's own console" |

  Scenario Outline: locality is decided only when both sides name a node
    Given the latest run carrying `D` is `running`, fresh, and carries `node` <node>
    And the fixture's config `mesh.nodeId` is <nodeId>
    When `stopLoop(workspace, { scope: "03", now: NOW })` is called
    Then it answers `ok: true` with `live: true`
    And the request file's `by.node` is <byNode>

    Examples:
      | node                  | nodeId          | byNode          |
      | `null`                | `"umamis-msi"`  | `"umamis-msi"`  |
      | `"umamis-msi"`        | `"umamis-msi"`  | `"umamis-msi"`  |
      | `""`                  | `"umamis-msi"`  | `"umamis-msi"`  |
      | `"umamis-mac-mini"`   | absent          | `null`          |

  Scenario Outline: the latest declaration in scope is the target, whatever item it sits on
    Given scope <scope> holds a declaration `L1` (`createdAt` `T1`, its run <l1run>) and a declaration `L2` (`createdAt` <t2>, its run `done`) <where>
    And a request file for `"L-old"` already stands in `loop-stops`
    When `stopLoop(workspace, { scope: <scope>, now: NOW })` is called
    Then it answers `loopRunId` <target>, `scope` <scope>, `live` <live>
    And the request file for <target> reads `scope` <scope>
    And `"L-old"`'s file is byte-identical

    Examples:
      | scope     | l1run              | t2                              | where                        | target  | live  |
      | `"01-05"` | `done`             | after `T1`                      | `L1` on `03/01`, `L2` on `05/01` | `"L2"` | false |
      | `"03"`    | `running`, fresh   | after `T1`                      | both on `03/01`              | `"L2"`  | false |
      | `"03"`    | `done`             | equal to `T1`, `runId` greater  | both on `03/01`              | `"L2"`  | false |
      | `"03"`    | `running`, fresh   | before `T1`                     | both on `03/01`              | `"L1"`  | true  |

  Scenario: a foreground loop is stoppable
    Given `D` carries `supervised: false`
    When `stopLoop(workspace, { scope: "03", now: NOW })` is called
    Then it answers `ok: true`

  Scenario Outline: the command face maps the document to the CLI contract
    Given `stopLoop` will answer <document>
    When `command.run({ scope: "03", stop: true }, ctx)` is awaited
    Then <outcome>

    Examples:
      | document                                       | outcome                                                                                    |
      | `{ ok: true, …, request: "drain", live: true }` | it resolves the seven-key document verbatim, and `command.cli.render` of it is `03 — stop requested (drain) for loop L1, live. <path>` |
      | `{ ok: true, …, request: "cancel", live: false }` | `render` prints `03 — stop requested (cancel) for loop L1, not live. <path>`               |
      | `{ ok: false, code: "loop-stop-no-declaration", message }` | it rejects with `commandError` `code` `"loop-stop-no-declaration"`, `status` 404, `message` verbatim |
      | `{ ok: false, code: "loop-stop-not-local", message }` | it rejects with `status` 409 and `message` verbatim                                    |
      | `{ ok: false, code: "loop-stop-scope", message }` | it rejects with `status` 409 and `message` verbatim                                        |

  Scenario Outline: the child process prints the document or the refusal and exits accordingly
    Given the fixture <fixture>
    When `aof work loop 03 --stop <flags>` is run as a child process against it with the isolated home in its environment
    Then stdout is <stdout> and the exit code is <exit>
    And <also>

    Examples:
      | fixture                     | flags    | stdout                                               | exit | also                                                                 |
      | carries `D`, live           | `--json` | the seven-key document, parsed                       | 0    | the file's `requestedAt` parses as an ISO instant (no injected clock) |
      | carries `D`, live           | ``       | the one render line                                  | 0    | nothing else is printed                                              |
      | carries no declaration      | ``       | empty                                                | 1    | stderr names `loop-stop-no-declaration`                              |
