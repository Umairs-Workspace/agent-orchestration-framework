---
doc: verification
---
# 135 · Key examples in the contract — Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13501 | `test/arch/examples/acd-sbe-package-one-way.test.mjs` | green, 3 cases (2026-10-03, at `3eb38e39`) | Appended `import "@aof/specification-by-example/map";` to `packages/work/src/doctor/index.mjs`. The control went red with `packages/work/src/doctor/index.mjs: imports @aof/specification-by-example/map` and `… reaches the package by path: @aof/specification-by-example/map`. Restored the file and re-ran: green. |
| FF-13502 | `test/arch/examples/acd-example-trace-declared.test.mjs` | green, 3 cases (2026-10-03, at `3eb38e39`) | Appended `const probe = (feature, example) => feature.scenarios.some((scenario) => scenario.name === example.text);` to `packages/specification-by-example/src/doctor-lane.mjs`. The control went red with `doctor-lane.mjs: walks a parsed feature outside map.mjs`. Restored the file and re-ran: green. |

## Verification evidence

- **135/01 to 135/05 (`@executable`, 11 features) and FF-13501, FF-13502, at accept, 2026-10-03.**
  Run in the primary checkout on `134-discovery-example-map` with a temp `AOF_GLOBAL_HOME`, through
  `scripts/test.mjs --only`. The selection covered every test file the five stories declare, plus
  the UI's metering controls. Two declared paths had moved or are native: 01's
  `packages/work/test/example-map-parse.suite.mjs` now lives in the package, and
  `read.test.mjs`/`domain-services.test.mjs` are `node:test` files.
  - Story suites and FFs: 237 cases. One red, `acd-ui-surface-file-budget`: `DetailPanel.tsx` was
    at 1,030 of its 1,000-line ceiling, left there by 135/03 (F-135-01).
  - Native: `node --test packages/work/test/read.test.mjs packages/work/test/domain-services.test.mjs`
    ran 12 tests, 12 pass.
  - After the F-135-01 repair (`3eb38e39`): the UI-metering set was green (13 files, 133 cases), so
    was the whole `@aof/ui` workspace (780 cases), and so was the Plan 09 ledger (`core-workspace`,
    11 cases). `tsc -b` and `yarn ui:build` were green.
  - `node scripts/supply-chain-audit.mjs` (01 added a workspace) passed with 0 warnings.
  - verifies → 135/01 tasks 00-01, 135/02 tasks 00-01, 135/03 tasks 00-01, 135/04 tasks 00-02,
    135/05 tasks 00-01.
- **`@manual`: one mapped story formulated and linted end to end (STATE `## Verification`).** The
  subject was 135/04. Its contract was formulated from its own map at 135's refine, in 135's form
  (`Rule: R1 · …`, `Scenario: E8 · …`), and its map holds the stated example E8 (`[stated Q1]`).
  1. On the real stream, `aof work doctor 135/04 --json` exits 0 with no `example-untraced`.
  2. Delete the scenario `E8 · continue refuses a story whose contract lost a confirmed example`
     from `tasks/02_the-build-is-refused-while-an-agreed-example-is-missing.feature`. Then
     `aof work doctor 135/04` exits 1 with `error: example-untraced — 135/04: E8 (EXAMPLES.md
     line 17) is stated Q1 under R1, but no scenario or Examples row in the story's task features
     carries it inside a group naming R1.`
  3. Restore the file. `git diff` is empty, and the doctor exits 0 again with no `example-untraced`.
  The `aof` used was `0.1.0 (source a7f6316c+dirty)`, the npm-linked tree. The door half (continue
  refuses) is 04 task 02's `@executable` scenario and was not driven live, because a door that
  failed to refuse would have dispatched a build. verifies → SPEC outcome "deleting the scenario
  that carries a `confirmed` example turns the traceability lint red and names the example".
- **Design conformance, 135/03 (the task card): `INCONCLUSIVE`.** A renderer resolves (the cached
  `ms-playwright/chromium-1243`). But `work.ui` is absent from `.aof/aof.config.json`, no `--url`
  was given, and DESIGN.md's task-card surface declares no `Route`. So no render was attempted at
  any breakpoint, and no designer or QA session was spawned (F-135-03). DESIGN.md's binding
  checklist (regions, order, classes, and the no-rule state's unchanged markup) is asserted
  structurally by `apps/ui/test/board-rule-groups.suite.mjs`, which is green.
- **No `@uat` scenario** in any story, so there is no human sign-off.
- **Doctor at accept:** `aof work doctor 135` shows no `control-unresolved` at either severity.
  The register's two `pending` markers were dropped once both files had landed and their probes
  had been recorded. Its findings are advisory warnings only: `numbering-gap`,
  `control-runner-unchecked`, `rubric-join-unchecked` ×5 and `depends-edges-unchecked`.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-135-01 | 135/03 left three UI controls red: `DetailPanel.tsx` at 1,031 lines, over its ratchet (ADR-015/F2), FF-5307's `apps/ui/src` digest not re-pinned, and the home-route suite's exact-line accounting for the panel (998). | defect | major | blocker: fixed at verify | `3eb38e39`: the TASKS tab moved whole to `TasksTab.tsx` (panel 903 lines). Board rows rose 25 to 26 with the reason, the board pin moved with its subject, FF-5307 was re-pinned with the measured diff, the home-route row was re-aimed to 904. | fixed |
| F-135-02 | 135/05 added 12 registered cases without raising the Plan 09 ledger's `registryCases` (11825), so `core-workspace` was red. | defect | minor | blocker: fixed at verify | `3eb38e39`: 11825 to 11837, with the renamed board pin's case-name hash. | fixed |
| F-135-03 | The task-card surface cannot be rendered for a design judgement: DESIGN.md declares no `Route`, and `work.ui.baseUrl` is unset (the board runs on an ephemeral port). | gap | minor | non-blocker: the binding checklist is asserted structurally | DESIGN.md (a `Route` for the surface) and an `aof:verify --url` run against a live board | open |
| F-135-04 | 04's "the live stream gains no trace finding" runs the real doctor over the live stream. A later story that drops an agreed example while open turns 04's suite red, not its own. | gap | minor | non-blocker: the gate doing its job, with an indirect pointer | recorded at 04's review; the red names the offending story in its message | closed |
