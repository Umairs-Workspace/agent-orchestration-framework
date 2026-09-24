@executable @cli @work @board
Feature: a board list row carries the ask fact for a local lane and a mesh worker alike, and the CLI's list is unchanged

  ADR-006 §2. `applyAskOverlay(rows, { asks, workspaceId })` is exported from
  `src/commands/list.mjs` and applied by `work:list` only when `input.mesh === true`, AFTER
  `applyExecutionOverlay` and `applyCachedProvenance`, so it sees each row's final `execution`.
  The local asks come from 131/01's `readAsks(loopAsksDir(env), { workspaceId })`, lanes
  included, where `workspaceId` is `resolveWorkspaceId(ctx.workspace)` (04 developer ruling 13,
  the one resolver) and `env` is the one `ctx.globalWorkStoreOptions` already carries. A row
  gains `ask` only when it has one; every other row is the same object, untouched, so a
  workspace with no ask and the CLI's `work:list --json` (which never passes `mesh`) are
  byte-identical to today.

  RULINGS (PO, 2026-09-23).
  (1) AMENDS ADR-006 §2 in this authoring beat: the fact has THIRTEEN keys, in this order,
  `{ runId, state, question, phase, askedAt, parkedAt, answeredAt, by, answer, node, local,
  sessionId, scope }`. `scope` is added LAST because the parked receipt (ADR-006 §4's
  departure) names `aof work loop <scope> --resume`, and a receipt read back from the wire after
  a reload has no answer document to take it from.
  (2) A LOCAL ask is the ask record's own values for those keys, `local: true`. Every state the
  file can hold is carried — `waiting`, `parked` and `answered` — because the answered receipt is
  held until the owner's `clearAsk` drops the file (ADR-003 §6, DESIGN §1). Of several records
  for one ref, the one with the latest `askedAt` is the row's (`readAsks` orders by `askedAt`,
  so the last wins), the rule `answerAsk` uses, so the card shows the ask the verb would answer.
  A local ask attaches to the row whose `ref` equals the record's `ref`, never to a parent or
  child.
  (3) A MESH ask exists exactly where 04's mesh leg would accept an answer, so the card is never
  offered where the verb refuses: a row with no local ask whose `execution` is `active`,
  `state: "running"`, `code: "needs-input"` and has a `sessionId` gains `{ runId: null, state:
  <ASK_STATES' waiting word>, question: null, phase: null, askedAt: execution.updatedAt ?? null,
  parkedAt: null, answeredAt: null, by: null, answer: null, node: execution.nodeId, local: false,
  sessionId: execution.sessionId, scope: execution.scopeRef }`. Scope inheritance follows the
  execution overlay's, as the verb's `resolveScopedExecution` does, so a story of a milestone
  waiting on a worker carries the ask too. `askedAt` is the instant the worker reported
  `needs-input`, the same fact 04's ruling (1) sends as `answer.askedAt`.
  (4) A local ask wins over a mesh one on the same row — the watch item STATE records for 07,
  ruled, not built here.
  (5) `list.mjs` spells no ask state word and no `loop-asks` literal; it reads `ASK_STATES` and
  the directory from `src/loop/ask-request.mjs` (FF-13101). A failed ask read degrades through
  `readAsks`'s own `loop-ask-request` event and the list still answers every row.

  RULINGS (QA, 2026-09-23).
  (1) In cells, `F` is the first scenario's waiting fact; "a `needs-input` row" is an active
  overlay row, `state: "running"`, `code: "needs-input"`, session `"S9"`, node `"node-2976"`,
  updated `2026-09-23T17:05:00.000Z`, unless the cell overrides a part.
  (2) The fact is a projection: a record's extra keys, and its `ref`, `workspaceId` and
  `loopRunId`, never ride the row. An ask for a ref with no row adds no row.
  (3) Equal `askedAt`: `readAsks` orders by `runId` ascending (131/01 task 02, QA 1), so the
  higher `runId` wins. `answerAsk` must break the tie the same way. For the PO to ratify.
  (4) If `readAsks` throws (e.g. `dir` is a regular file), the overlay treats it as no asks; the
  list never rejects for the ask store.
  (5) The mesh rule is exact: `code` is compared case-sensitively, `node` is `nodeId` even when
  `null`, `askedAt` is `updatedAt` as stored. A row's own execution outranks its milestone's
  (`resolveScopedExecution`), so a story with its own settled row carries no worker ask.

  RULINGS (developer, 2026-09-23).
  (6) Feasible, two rows moved and one step amended. The board face passes `{ workspace }` only,
  so `ctx.globalWorkStoreOptions` is `{}` there and `loopAsksDir(ctx.globalWorkStoreOptions?.env)`
  falls to `process.env` through `defaultGlobalWorkspaceDir`, the home the store opens. The suite
  passes `{ env }`. The dir never derives from a `paths` override. `resolveWorkspaceId` is
  importable from `src/commands/` (`resync.mjs` does) and answers the id the overlay queries by.
  (7) Applied outermost, over `applyCachedProvenance(applyExecutionOverlay(…))`, every row's
  `execution` is final, with `scopeRef` set, so ruling 3's inheritance and QA 5's own-row rule
  come from the overlay and are not re-derived.
  (8) `global_assignments.updated_at` and `target_node_id` are `NOT NULL`, so an `updated null`
  or `node null` row cannot be seeded under `work:list`. Those two rows moved to a pure
  `applyAskOverlay` outline. Every other mesh row seeds with `insertAssignment` and
  `updateAssignmentState(…, { sessionId, code, now })`, workspace `"w2"` included.
  (9) The ask read's catch calls `reportDegrade("loop-ask-request", …)`: `acd-no-new-silent-catch`
  bans an empty catch in `src/`. A degrade count is of `loop-ask-request` events, with
  `setDegradeSinkForTest` installed per case, since it resets the 5 s per-code throttle.
  (10) The cases join `test/ui/board-mesh-execution.test.mjs` over an on-disk fixture, the shape
  of its directive-phase cases, with asks written through 01's `openAsk`, `parkAsk`, `answerAsk`
  and `clearAsk`, and the `extra` and `{ not json` rows by raw `writeFile`. The static import of
  `src/loop/ask-request.mjs` keeps the suite red until 01 lands, and `depends` orders that. The
  CLI row spawns `src/cli.mjs work list --json` in `W` with `AOF_GLOBAL_HOME` = `H`.
  (11) `work:list` rows keep the answering-side stamp that the `--json` face strips
  (`withoutAnsweringSide`), so "deep-equal to it" could never hold. Amended to the same call
  with `dir` removed.
  (12) The mesh condition is 04/03's verb predicate spelled a second time. If 04 lands it as an
  export, `list.mjs` imports it. Otherwise `list.mjs` spells it and 06 registers the pair. For
  the PO.

  RULINGS (PO, ratifying, 2026-09-23). QA (1)–(5) and developer (6)–(12) RATIFIED. On QA (3):
  `answerAsk` (131/01) breaks an `askedAt` tie by the higher `runId` too, so card and verb agree.
  On (12): import 04's predicate when its build exports one; else `list.mjs` spells it once.

  Background:
    Given an isolated aof home `H` and a mesh-enabled fixture workspace `W` pinned `mesh.workspaceId: "w1"`, holding milestone `03` with stories `03/01` and `03/02`, and milestone `04`
    And `dir` = `loopAsksDir({ AOF_GLOBAL_HOME: H })`, and `ctx.globalWorkStoreOptions` = `{ env: { AOF_GLOBAL_HOME: H } }`

  Scenario: a local lane's waiting ask rides its row, and no other row changes
    Given an ask for run `R1`, workspace `"w1"`, ref `"03/01"`, phase `"build"`, scope `"03"`, node `"node-7297"`, question `"Decision needed: move the residue?"`, askedAt `2026-09-23T17:00:00.000Z` has been opened `waiting`
    When `work:list` runs with `{ mesh: true }` in `W`
    Then the `03/01` row's `ask` deep-equals `{ runId: "R1", state: "waiting", question: "Decision needed: move the residue?", phase: "build", askedAt: "2026-09-23T17:00:00.000Z", parkedAt: null, answeredAt: null, by: null, answer: null, node: "node-7297", local: true, sessionId: <the ask's>, scope: "03" }`, keys in that order
    And the `03`, `03/02` and `04` rows carry no `ask` key and are deep-equal to the same run with no ask file

  Scenario Outline: every state the file holds is carried, so the receipt outlives the answer
    Given the ask for `R1` on `"03/01"` has been <moved>
    When `work:list` runs with `{ mesh: true }` in `W`
    Then the `03/01` row's `ask` reads <fact>

    Examples:
      | moved | fact |
      | parked at `2026-09-23T18:00:00.000Z` | `F` with `state: "parked"`, `parkedAt: "2026-09-23T18:00:00.000Z"` |
      | answered `"take b —\n  keep the tests"` by `{ actor: "umami", via: "board", node: "node-7297" }` at `2026-09-23T17:12:00.000Z` | `F` with `state: "answered"`, `answeredAt: "2026-09-23T17:12:00.000Z"`, that `by`, and `answer` byte-equal to the text |
      | parked at `18:00`, then answered `"take b"` by `{ actor: "you", via: "cli", node: "node-7297" }` at `19:00` | `F` with `state: "answered"`, `parkedAt: "2026-09-23T18:00:00.000Z"` kept, `answeredAt: "2026-09-23T19:00:00.000Z"`, that `by`, `answer: "take b"` |
      | answered, then re-opened at `2026-09-23T18:30:00.000Z` with question `"Decision needed: Y"` | `F` with `question: "Decision needed: Y"`, `askedAt: "2026-09-23T18:30:00.000Z"`, and `answer`, `answeredAt`, `by` `null` again |
      | opened with `scope` and `sessionId` omitted | `F` with `scope: null` and `sessionId: null`, still thirteen keys |
      | rewritten by hand with an extra key `"extra": 1` | `F`, exactly thirteen keys: no `extra`, `ref`, `workspaceId` or `loopRunId` (ruling 2) |
      | cleared by `clearAsk` after its answer | absent: the row has no `ask` key and deep-equals the no-ask run's |

  Scenario: a worker waiting on a human carries an ask with no question, wherever the verb would accept the answer
    Given no ask file exists, and the execution overlay's row for `"03"` is active, `state: "running"`, `code: "needs-input"`, node `"node-2976"`, session `"S9"`, updated `2026-09-23T17:05:00.000Z`
    When `work:list` runs with `{ mesh: true }` in `W`
    Then the `03` row's `ask` deep-equals `{ runId: null, state: "waiting", question: null, phase: null, askedAt: "2026-09-23T17:05:00.000Z", parkedAt: null, answeredAt: null, by: null, answer: null, node: "node-2976", local: false, sessionId: "S9", scope: "03" }`
    And the `03/01` and `03/02` rows carry the same `ask`, and the `04` row carries none

  Scenario Outline: an execution row that the verb would not answer carries no ask
    Given no ask file exists, and the execution overlay's row for `"03"` is <execution>
    When `work:list` runs with `{ mesh: true }` in `W`
    Then no row carries an `ask` key

    Examples:
      | execution |
      | active, `state: "running"`, `code: null`, session `"S9"` |
      | active, `state: "running"`, `code: "resumed"`, session `"S9"` |
      | active, `state: "assigned"` (queued), `code: null`, session `null` |
      | active, `state: "accepted"`, `code: "needs-input"`, session `"S9"` |
      | inactive, `state: "done"`, `code: "needs-input"`, session `"S9"` |
      | inactive, `state: "failed"`, `code: "needs-input"`, session `"S9"` |
      | active, `state: "running"`, `code: "needs-input"`, session `null` |
      | active, `state: "running"`, `code: "needs-input"`, session `""` |
      | active, `state: "running"`, `code: "NEEDS-INPUT"`, session `"S9"` (ruling 5) |
      | a `needs-input` row published for workspace `"w2"`, not `"w1"` |

  Scenario Outline: of the asks for a workspace, the row takes its own ref's latest, and nothing else
    Given <asks>
    When `work:list` runs with `{ mesh: true }` in `W`
    Then <outcome>

    Examples:
      | asks | outcome |
      | `R1` on `"03/01"` (`17:00`, waiting) and `R2` on `"03/02"` (`17:01`, parked) | `03/01` carries `R1`'s fact, `03/02` carries `R2`'s with `state: "parked"`, and `03` and `04` carry none |
      | `R1` on `"03/01"` (`17:00`, answered) and `R3` on `"03/01"` (`17:05`, waiting) | the `03/01` row's `ask` has `runId: "R3"`, `state: "waiting"` |
      | `R1` on `"03/01"` (`17:00`, waiting) and `R3` on `"03/01"` (`17:05`, answered by `"umami"`) | the `03/01` row's `ask` has `runId: "R3"`, `state: "answered"`: the ask `answerAsk` would refuse `ask-already-answered` on |
      | `R1` and `R3` on `"03/01"`, both asked `17:00` and waiting | the `03/01` row's `ask` has `runId: "R3"` (ruling 3) |
      | only `R3` on `"03/01"`, in workspace `"w2"` | no row carries an `ask` key |
      | only `R3` on `"03/01"`, with `workspaceId: null` | no row carries an `ask` key |
      | `R1` on `"03/01"` (`"w1"`, `17:00`) and `R3` on `"03/01"` (`"w2"`, `17:05`) | the `03/01` row's `ask` has `runId: "R1"` |
      | only `R5` on `"09/01"`, a ref with no row | no row carries an `ask` key, and the rows deep-equal the no-ask run's: none is added |
      | only `R1` on `"03"` | the `03` row carries it, and `03/01`, `03/02` and `04` carry none: never to a child |
      | only `R1` on `"03/1"` | no row carries an `ask` key: the ref is matched exactly |
      | no ask file, a `needs-input` row for `"03"`, and a row of its own for `"03/01"` reading `state: "done"` | `03` and `03/02` carry the worker's ask, and `03/01` carries none (ruling 5) |
      | no ask file, and a `needs-input` row of its own for `"03/01"`, session `"S7"` | only `03/01` carries an ask, with `sessionId: "S7"` and `scope: "03/01"` |
      | `R2` on `"03/01"` waiting, and a `needs-input` row for `"03"` | `03/01` carries `R2`'s, `local: true`; `03` and `03/02` carry the worker's, `sessionId: "S9"` |

  Scenario Outline: the overlay carries a null the store cannot hold (ruling 8)
    Given rows `03`, `03/01` and `03/02` as `applyExecutionOverlay` shapes them over a `needs-input` row for `"03"` whose <part> is `null`
    When `applyAskOverlay(rows, { asks: [], workspaceId: "w1" })` is asked
    Then <outcome>

    Examples:
      | part | outcome |
      | `updatedAt` | the `03`, `03/01` and `03/02` rows' `ask` reads `askedAt: null` |
      | `nodeId` | the `03` row's `ask` reads `node: null`, `local: false` |

  Scenario: a local ask wins over a worker's on the same row
    Given the ask for `R1` on `"03"` is `waiting`, and the execution overlay's row for `"03"` is active, running, `needs-input`, session `"S9"`
    When `work:list` runs with `{ mesh: true }` in `W`
    Then the `03` row's `ask` has `runId: "R1"` and `local: true`

  Scenario: the CLI's list is byte-identical with asks on disk
    Given the ask for `R1` on `"03/01"` is `waiting`
    When `aof work list --json` runs in `W` with `AOF_GLOBAL_HOME` = `H`
    Then its output is byte-identical to the same run with `dir` removed, and `work:list` with no `mesh` answers rows deep-equal to the same call with `dir` removed (ruling 11)

  Scenario Outline: an unreadable ask store never costs the list a row
    Given `dir` <state>
    When `work:list` runs with `{ mesh: true }` in `W`
    Then it answers every row `work:list` answers with no ask file, <asks>

    Examples:
      | state | asks |
      | does not exist | and no row carries an `ask`, with no degrade |
      | exists and is empty | and no row carries an `ask`, with no degrade |
      | holds only `R6.json` holding `{ not json` | and no row carries an `ask`, with one `loop-ask-request` degrade |
      | holds only a `.tmp-R1.json-1-2-x` holding half a record | and no row carries an `ask`, with no degrade |
      | holds only a record for `"03/01"` whose `state` is `"done"` | and no row carries an `ask`, with one `loop-ask-request` degrade |
      | holds `R6.json` holding `{ not json` beside `R1`'s waiting ask on `"03/01"` | the `03/01` row carrying `R1`'s ask and no other row one, with one `loop-ask-request` degrade |
      | is a regular file, not a directory | and no row carries an `ask`, and nothing is thrown (ruling 4) |

  Scenario: the list reads the ask through its one home
    When `src/commands/list.mjs` is read, comments stripped
    Then it imports `readAsks`, `loopAsksDir` and `ASK_STATES` from `../loop/ask-request.mjs`, spells none of `"waiting"`, `"parked"`, `"answered"` or `loop-asks`, and exports `applyAskOverlay`
