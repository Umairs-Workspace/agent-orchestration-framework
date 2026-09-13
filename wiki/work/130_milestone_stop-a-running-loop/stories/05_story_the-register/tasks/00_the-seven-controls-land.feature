@executable @cli @work @validate
Feature: the seven controls land in three files under test/arch/loop, registered by import and spread, with the row raised by exactly that count

  ARCHITECTURE `## Fitness functions`, 119/ADR-010's harness shape. Three files export
  `archTests` (an array of `{ name, run }`) and are registered by one import + one spread each in
  `test/arch/loop/index.mjs` — never `readdir`-discovered. Each control has its STRUCTURAL leg
  (source read through `test/support/module-family.mjs` for resolved specifiers — FF-11901's one
  extractor — and comment-stripped sweeps), its FIXTURE leg (the delivered code driven against the
  isolated home and the loop fixture), and a NON-VACUITY leg (a sweep that finds nothing reds).
  `test/arch/loop` rises 55 → 58 in `acd-source-directory-budget` by exactly the three files, the
  row's `why` naming each and which of the three subjects (registry / record / ladder) it is; the
  `src/loop` exemption's `why` names `stop-request.mjs` and `stop.mjs`. Every standing control the
  register cites stays green.

  RULINGS (QA, 2026-09-13): every clause below is the register's own wording; where STORY.md's
  paraphrase differs (its `path.join(… "loop-stops")` for the register's "`meshRoot` beside a
  `loop` literal"; its `stop_argv(`/`STOP_GRACE_MS` node-side reads for the register's `taskkill`
  / `generate_handler!` / one-delegate clauses) the register governs. A clause a builder finds
  unenforceable is reported against the register, never narrowed here.

  Background:
    Given the delivered tree with stories 01–04 landed, under an isolated `AOF_GLOBAL_HOME`

  Scenario Outline: each control is a registered arch-test that passes over the delivered tree
    When `node scripts/test.mjs --only test/arch/loop/<file>` runs
    Then every case named `arch/130 <id>` passes
    And `test/arch/loop/index.mjs` imports `archTests` from `./<file>` and spreads it once

    Examples:
      | file                                              | id                                      |
      | `acd-loop-stop-request-single-home.test.mjs`      | FF-13001, FF-13003                      |
      | `acd-loop-stop-settles-the-run.test.mjs`          | FF-13002, FF-13004                      |
      | `acd-loop-stop-reaches-every-face.test.mjs`       | FF-13005, FF-13006, FF-13007 (node leg) |

  Scenario: the three files are registered by import and spread, and nothing is readdir-discovered
    When `test/arch/loop/index.mjs` is read after the three files land
    Then it carries exactly three new `import { archTests as … } from "./<file>"` lines and exactly three new spreads in `tests`, APPENDED after `...acdSiteIsProjectedNotCopiedTests` with nothing above them re-ordered
    And the file contains no `readdir`, `readdirSync`, `glob` or computed `import(` — membership is written, never derived
    And `tests.length` equals the sum of every spread array's length, every case named `arch/130 <id>` is reachable exactly once, and `scripts/test.mjs` is byte-unchanged by the arrival

  Scenario: FF-13001 — the request has one home
    When its structural leg runs
    Then over a comment-stripped sweep of `src/**` the literal `loop-stops` and the state literals `"requested"`/`"honoured"` (as a stop-request state) appear only in `src/loop/stop-request.mjs`, and no `src/**` module matches `*loop*-store.mjs`
    And `src/loop/stop.mjs`, `src/commands/loop.mjs`, `src/mesh/declarations.mjs` and `src/mesh/presence.mjs` each import that module by RESOLVED specifier (through `module-family.mjs`) and contain no `path.join(` whose arguments name `meshRoot` beside a `loop` literal
    And `src/commands/loop.mjs` contains no `writeFile(` / `mkdir(` / `rename(` call form and no `process.once(` or `process.on(` whose first argument starts with `SIG`
    And the non-vacuity leg finds the module and at least four importers, and reds when the sweep finds none

  Scenario: FF-13003 — the verb is a probe-shaped write and one function
    When its fixture leg runs over the loop fixture with a live declaration
    Then `getCommand("work:loop").run({ scope, stop: true }, ctx)` leaves exactly ONE new file under `<home>/mesh/loop-stops/`, leaves `treeFiles(projectRoot)` unchanged, the fake driver's `spawnCalls` at 0, and answers a document whose keys deep-equal the seven in order
    And a second call answers `request: "cancel"` and the file reads `level: 2`; a call with no declaration rejects with code `loop-stop-no-declaration`; `run({ scope })` still answers the ten keys
    And structurally `stop` is a key of the closed input schema and of `cli.spec.flags`, appears in `cli.argv`'s body, `cli.launch`'s predicate names `options.stop`, and `stopLoop` is defined in `src/loop/stop.mjs` and imported by exactly `src/commands/loop.mjs` and `src/mesh/ui-serve.mjs`

  Scenario: FF-13002 — the interrupt path always settles
    When its structural leg runs over `src/commands/loop.mjs`
    Then for every `await drivePhase(` site the assigned binding reaches a `settleDriven(` call before any `return` in the enclosing block (the FF-12702 enclosing-function rule), every `haltDecision("operator-interrupt"` receives a producer bound from `source.producer()`, and there are exactly three drive sites
    And its fixture leg drives `runLoopBody` with an injected `stopSource` raised to level 2 during the drive, the fake driver honouring `signal` with `{ failed, cancelled }`: the record is `cancelled` with `failureReason: null`, the `driven` row's `outcome` is `"cancelled"`, the halt is `operator-interrupt` with producer `stop-request` and `Details` `cancelled=<runId>`, the request file reads `honoured`, and NO run in the fixture is `running`
    And raised to level 1 between drives the drive settles `done` and the halt names the request; `runLoopBody({ resume: true })` over a standing request clears the file and narrates `Cleared stop request` exactly once

  Scenario: FF-13004 — a honoured declaration yields no row, and the engine imports nothing
    When its fixture legs run
    Then `decideSupervisedDeclarations` over one supervised lineage whose latest run is `failed/timeout` answers one row, the same input plus `stopped: new Set([loopRunId])` answers none, and the input with `stopped: new Set()` and the input without `stopped` answer deep-equal rows
    And `supervisedDeclarations` over a fixture home holding a `honoured` request for that `loopRunId` answers no row, and a `requested` one still answers the row
    And structurally `src/mesh/declarations.mjs` imports `readStopRequest` from `src/loop/stop-request.mjs` (resolved) and passes `stopped` to the engine, and `src/work/loop.mjs` has zero `import` statements

  Scenario: FF-13005 — loops is additive and read by the same pass
    When its legs run
    Then `assemblePresenceRecord` without `loops`, and with `loops: []`, is byte-identical to today's record (the six keys, order included); with one entry the key is LAST, after `buildId`; `activeRuns` stays `string[]`; `assemblePresenceRecord(diskRecordWithLoops)` keeps the entry
    And `readActiveLoops` over a fixture with one running loop run and a `requested` level-2 file answers exactly one eleven-key entry with `stop: "cancel"`
    And every `src/**` module that calls `readActiveRuns(` also calls `readActiveLoops(` — the sweep finds both `heartbeat.mjs` and `launcher.mjs`, and reds when it finds fewer

  Scenario: FF-13006 — the fleet's button is local-only and reaches the one route
    When its legs run
    Then `loopStopAffordance` answers `button: null` for `localNodeId: null`, for `node.nodeId !== localNodeId`, and after rung 2, and a rung-1 button otherwise; `rememberStopRung` never lowers a rung; `fleetCurrentWorkLines` over the captured producer fixtures is byte-identical to its pinned lines
    And `ui/src/fleet/**` contains exactly one `fetch("/api/mesh/loop-stop"` (in `api.ts`) and none of the `work-loops` / `work/loops` / `loops-` tokens
    And in `ui-serve.mjs` the `/api/mesh/loop-stop` branch reads exactly `body.scope` and `body.workspaceId` and calls `admitWriteRequest(` before `readJsonBody(`; the route table is exactly six; the status route's body carries `localNodeId`

  Scenario: FF-13007 — the desktop's argv is formed in core (node leg)
    When its node leg runs
    Then `app/desktop/crates/app/src/supervisor.rs` spells no `"--stop"` literal and reaches `taskkill` in exactly one place, `main.rs` registers `stop_loop` in `generate_handler!`, and `app.js` invokes `stop_loop` from exactly one delegate
    And the cargo half (`supervision.rs` `#[cfg(test)]`: `stop_step`, `stop_argv`, `reconcile`) is story 04's, run by `scripts/test.mjs` over `app/desktop/Cargo.toml` and cited here, not re-run

  Scenario: the budget rows move once and agree with the tree in both directions
    When `node scripts/test.mjs --only test/arch/testing/acd-source-directory-budget.test.mjs` runs
    Then the `test/arch/loop` row reads `ceiling: 58` and its `why` names the three files and their subjects
    And the `src/loop` exemption's `why` names `stop-request.mjs` and `stop.mjs`
    And the control is green — no row over- or under-raised

  Scenario: the standing controls stay green
    When `node scripts/test.mjs --only` runs over `acd-loop-probe-contract`, `acd-loop-state-rides-the-run-record`, `acd-loop-module-import-boundary`, `acd-loop-narrates-in-flight`, `acd-clock-counts-attempts`, `acd-declaration-predicate-is-composed`, `acd-active-runs-frozen-string-array`, `acd-captured-producer-fixture`, `acd-session-presence-additive`, `acd-mesh-ui-read-only`, `acd-mesh-ui-write-isolation`, `acd-mesh-ui-no-core-import`, `acd-desktop-single-data-path`, `acd-ui-surface-file-budget`, `acd-console-log-confined`, `acd-no-new-silent-catch`
    Then every case passes
