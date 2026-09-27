@executable @cli @work @work-stream
Feature: a honoured loop yields no row — the producer reads the marks, the engine takes an additive default-absent stopped set, and the engine still imports nothing

  ADR-004 §4-§5. Two independent guards keep the supervisor from relaunching a loop the operator
  stopped. (a) The desktop's own hold, task 00. (b) The row itself goes: `supervisedDeclarations`
  (`src/mesh/declarations.mjs`, the disk-reading producer) reads, for each candidate declaration,
  `readStopRequest(loopStopsDir(), loopRunId)` from story 01's module and collects `stopped:
  Set<loopRunId>` of those whose `state` is `"honoured"`, handing it to
  `decideSupervisedDeclarations` as an ADDITIVE input. The engine appends `stopped` to its one
  destructure, and skips `if (stoppedSet.has(declaration.loopRunId))` immediately after the
  `supervised !== true` guard. DEFAULT-ABSENT: `const stoppedSet = stopped instanceof Set ? stopped
  : EMPTY_SET` (a frozen empty `Set`, module-level) — an absent, empty or ill-typed input drops
  nothing and every existing caller answers byte-identically; `src/work/loop.mjs` gains NO import
  (`Set` is a global; `acd-clock-counts-attempts` keeps its zero). A `requested` mark drops nothing
  — the loop is draining and its row is retained on liveness as today. Belt: a `cancelled` or
  `done` latest run already reads `not-retryable`; the mark is load-bearing only for a retryable
  last run (`failed/timeout`), the lineage 126 relaunches. A `--stop` on a declaration that is not
  live marks its request honoured at once (ADR-002 §3f), so a dead supervised loop's row goes at
  the next tick and nothing relaunches it until `--resume` clears the mark.

  RULINGS (QA, 2026-09-13): the engine cases use the suite's EXISTING fixtures — `loop()` is
  `lr-1` on scope `"53"`, level `L2`, cap 3; `run()` / `settled()` build the records; `ask(runs, {
  ceilingMs, now, items })` calls the engine with `maxAttempts` 3, `CEILING` 2h, `STALENESS` 15 min
  and the store's real `isRunning` / `isStale` / `retryReadiness`; `workspaceWith(ceilingMs)` is
  the member on `C:/m`. The headline's `L1` / `03` / 12h / 10 min read as these. A `stopped` case
  adds that one key to `ask`'s input and changes nothing else. The producer cases drive
  `supervisedDeclarations` through `mesh status --declarations` over the on-disk fixture of
  `test/mesh/identity/mesh-status-declarations.test.mjs` (`makeWorkspace` — milestone `53`, a
  `reclaimed()` record, one listed row) under the harness's isolated `AOF_GLOBAL_HOME`, whose
  `loopStopsDir()` holds the request; a request is written through story 01's own
  `requestLoopStop` / `markStopHonoured` and never by hand, except the corrupt-file case, which
  writes bytes that do not parse. Each case removes what it wrote. A member with an unreadable
  config is staged as `mesh-workspace-workdir-absolute.test.mjs` stages descriptors, its
  `.aof/aof.config.json` removed after registration. `--resume`'s clearing is story 02's
  (`test/loop/loop-command-resume.test.mjs`); here the clear is the call it makes,
  `clearStopRequest`, so no loop is launched by this suite.

  Background:
    Given the engine fixtures of `test/loop/work-loop-declarations.test.mjs` — `loop()`, `run()`, `settled()`, `ask()`, `workspaceWith()` — with the store's real `isRunning` / `isStale` / `retryReadiness`
    And the on-disk producer fixture of `test/mesh/identity/mesh-status-declarations.test.mjs` under an isolated aof home

  Scenario Outline: the engine drops a stopped declaration and only a stopped one
    Given the lineage's latest run is <latest>
    When `ask` is called with `stopped: <stopped>`
    Then it answers <rows>

    Examples:
      | latest                                              | stopped                                        | rows                                                                  |
      | `failed` / `timeout` at attempt 1 (retryable, in budget) | absent                                    | one row for `lr-1`                                                    |
      | `failed` / `timeout`                                | `new Set()`                                    | one row for `lr-1`                                                    |
      | `failed` / `timeout`                                | `new Set(["lr-1"])`                            | none                                                                  |
      | `failed` / `timeout`                                | `new Set(["lr-2"])`                            | one row for `lr-1`                                                    |
      | `failed` / `timeout`                                | `new Set(["LR-1"])`                            | one row for `lr-1` — matched exactly, never case-folded               |
      | `failed` / `timeout`                                | a `Set` of 1,000 ids, `lr-1` among them        | none — the set's size changes nothing                                 |
      | `failed` / `timeout`                                | a `Set` of 1,000 ids, `lr-1` not among them    | one row for `lr-1`                                                    |
      | `failed` / `timeout`                                | `["lr-1"]` (an array, ill-typed)               | one row for `lr-1` — dropped nothing, threw nothing                   |
      | `failed` / `timeout`                                | `{ has: () => true }` (Set-like, not a `Set`)  | one row for `lr-1` — `instanceof Set`, never duck-typed               |
      | `failed` / `timeout`                                | `"lr-1"` (a string)                            | one row for `lr-1`                                                    |
      | `failed` / `timeout`, `supervised: false`           | `new Set(["lr-1"])`                            | none — already skipped by the `supervised` guard; the mark changes nothing |
      | `running`, fresh                                    | `new Set(["lr-1"])`                            | none — DROPPED: the skip precedes the liveness branch, so a honoured loop is never retained on liveness either |
      | `running`, stale                                    | `new Set(["lr-1"])`                            | none                                                                  |
      | `failed` / `runtime_offline`, reclaimed             | `new Set(["lr-1"])`                            | none                                                                  |
      | `cancelled`                                         | absent                                         | none — `not-retryable` by the store's own verdict                     |
      | `cancelled`                                         | `new Set(["lr-1"])`                            | none                                                                  |
      | `done`                                              | absent                                         | none                                                                  |

  Scenario: two lineages in one workspace, one stopped
    Given items `53` (`lr-1`) and `60` (`lr-2` on scope `"60"`), each with a `failed` / `timeout` latest run
    When `ask` is called with `stopped: new Set(["lr-1"])`
    Then it answers exactly one row, `lr-2`'s, carrying its six keys
    And with `stopped: new Set(["lr-1", "lr-2"])` it answers none, and with `stopped` absent both

  Scenario: absent and empty answer byte-identically, and the input's other keys are untouched
    Given the lineage's latest run is `failed` / `timeout`
    When the engine is called without `stopped`, with `stopped: new Set()`, with `stopped: null` and with `stopped: undefined`
    Then the four answers deep-equal one another and deep-equal the suite's existing expected rows, and every existing case of the suite still passes with no edit
    And the returned rows still carry exactly the six keys `workspaceId, projectRoot, loopRunId, scope, level, cap`, frozen, and the input object is not mutated

  Scenario: the engine imports nothing
    When `src/work/loop.mjs` is read
    Then it contains no `import` statement, no `require(` and no dynamic `import(` — the frozen empty `Set` is built from the global

  Scenario Outline: the producer reads the marks from the one module and hands the set
    Given the fixture workspace holds the reclaimed `lr-1` lineage with `supervised: true` and the request for `"lr-1"` <request>
    When `mesh status --declarations` is run over it
    Then it answers <rows>

    Examples:
      | request                                        | rows                                                                                                                              |
      | does not exist                                 | one row `{ id: "lr-1", label: "loop 53", argv: ["work", "loop", "53", "--level", "L2", "--resume"], cwd: <dir>, scope: "53", level: "L2", cap: 3 }` |
      | is level 1 `requested`                         | one row — a draining loop keeps its row                                                                                           |
      | is level 2 `requested`                         | one row                                                                                                                           |
      | is level 1 `honoured`                          | none                                                                                                                              |
      | is level 2 `honoured` with `cancelled` set     | none                                                                                                                              |
      | is a corrupt file                              | one row — an unreadable mark drops nothing, and `reportDegrade("loop-stop-request", …)` was called once                            |
      | exists `honoured` for `lr-2` only              | one row for `lr-1` — the mark is keyed by id                                                                                      |
      | is `honoured` but the record is `supervised: false` | none — no row either way, and `ok` is still `true`                                                                           |

  Scenario: a member whose config cannot be read keeps the existing fallback and is still read for marks
    Given a second workspace registered as a member of this node whose `.aof/aof.config.json` was removed after registration, holding the same reclaimed `lr-1` lineage
    When `mesh status --declarations` is run with no request on disk, and again with `lr-1` `honoured`
    Then the first answers that member's row exactly as a member with an intact config is answered — the ceiling fallback stands as it stood before this story — and the second answers none
    And `skipped` is `[]` both times — an unreadable config is not a skipped member, and the mark is read for it all the same

  Scenario: the producer spells no path
    When the comment-stripped source of `src/mesh/declarations.mjs` is read
    Then it imports `readStopRequest` and `loopStopsDir` from `../loop/stop-request.mjs` and contains no `loop-stops` literal

  Scenario: a dead supervised loop is stopped and stays stopped until resumed
    Given the fixture's latest run is `failed` / `runtime_offline`, reclaimed, and no loop process runs
    When `stopLoop` (story 02's core, the call `aof work loop 53 --stop` makes) runs against the fixture — it marks the request honoured at once, `live: false`
    And `mesh status --declarations` is run
    Then it answers no row for `lr-1`
    When `clearStopRequest(loopStopsDir(), "lr-1")` runs (the call `--resume` makes, ADR-003 §6)
    And `mesh status --declarations` is run again
    Then it answers the row again, deep-equal to the first answer of the outline above
