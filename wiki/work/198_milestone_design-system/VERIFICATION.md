---
doc: verification
---
# 198 · The designer draws mocks on the project's design system — Verification

## Fitness functions

Each row is filled when its control lands. The red probe records what was changed to make the
control fail, and the message observed.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-19801 | `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` | green, 2026-11-27 (verify, focused run) | **On disk, 2026-11-27 (verify):** the shipped `design-system-refine-canvas` in `packages/design-system/assets/bundle.json` was made to name `"claud"`. The suite went red at bundle load, before the control's own sweep ran: "Fragment "design-system-refine-canvas" contributed by @aof/design-system names the runtime "claud" in its "runtimes", which the capability matrix does not hold: its runtimes are "claude", "codex", "opencode"." The control's own assertion is reached by the in-file planted gaps over the fixture bundle (a Codex body on a Claude-only fragment, `"claud"`, a named runtime with no body), each green as a red, naming the fragment, the runtime and the slot. Restored byte for byte. |
| FF-19802 | `test/arch/practices/acd-runtime-scoped-prose.test.mjs` | green, 2026-11-27 (verify, focused run) | **The fixture leg, on disk, 2026-11-27 (verify):** `isFor` in `packages/core/src/work/bundle-compose.mjs` made to answer `true` for every runtime. Both legs went red: "the fixture bundle: fragment notes-demo, member command:demo, runtime codex: it does not name the runtime, and its render differs from the render with the fragment deleted; fragment notes-demo, member command:demo, runtime opencode: it does not name the runtime, and its render holds the body; fragment notes-agent, member agent:aof-demo, runtime codex: …", and "the shipped bundle: fragment design-system-refine-canvas, member command:refine, runtime codex: …". Restored, clean against HEAD. **198/02, the shipped leg:** (a) the shipped `design-system-refine-canvas` made unscoped, with its common body also given to Codex so the load accepts it; (b) a composer that loses the Claude leg (`dropsScoped` over the shipped bundle). Observed: (a) "fragment design-system-refine-canvas, member command:refine, runtime codex: a runtime other than Claude renders the body; fragment design-system-refine-canvas, member command:refine, runtime opencode: a runtime other than Claude renders the body"; (b) the control names `design-system-verify-pull-back`, `command:verify` and runtime `claude`. Recorded 2026-11-27, 198/02 build. **198/03:** the shipped `design-system-verify-re-sync` (`checks.design-system`) made unscoped the same way: "fragment design-system-verify-re-sync, member command:verify, runtime codex: a runtime other than Claude renders the body; fragment design-system-verify-re-sync, member command:verify, runtime opencode: a runtime other than Claude renders the body". Recorded 2026-11-27, 198/03 build. |
| FF-19803 | `test/arch/ui/acd-design-role-split.test.mjs` | green, 2026-11-27 (verify, focused run) | 198/02: a fragment `planted-designer-bash`, targeting `agent:aof-designer` with `tools: ["Bash"]`, added to a copy of the shipped descriptor; and a fragment whose body holds the line `tools: Read, Bash`. Observed: `designerToolGrants` answers `["planted-designer-bash grants Bash"]`, and names `planted-body grants Bash` for the body line, against `[]` for the shipped bundle. Recorded 2026-11-27, 198/02 build. |
| FF-19804 | `test/arch/practices/acd-design-system-verbs-offline.test.mjs` | green, 2026-11-27 (verify, focused run) | **On disk, 2026-11-27 (verify):** `export async function pullPlanted(url) { return fetch(url); }` appended to `packages/design-system/src/check.mjs`. Observed: "Expected values to be strictly deep-equal: + [ 'packages/design-system/src/check.mjs: calls fetch(' ] - []". Restored byte for byte. |
| FF-19805 | `test/arch/ui/acd-imported-mock-self-contained.test.mjs` | green, 2026-11-27 (verify, focused run) | 198/02: the fixture import's board (`test/fixtures/design-system/imported-mock/board.dc.html`) given a second script, `<script src="https://cdn.example.com/x.js">`; and a board loading `../../secret.js`. Observed: "test/fixtures/design-system/imported-mock/board.dc.html: https://cdn.example.com/x.js (a network source other than a Google Fonts css2 link)", and "m/b.dc.html: ../../secret.js (not a sibling file of the board)". The unplanted fixture, which loads `./support.js`, `ds/aof/tokens.json` and a Google Fonts css2 link, passes. Recorded 2026-11-27, 198/02 build. |

## Verification evidence

All runs on the working tree at `a54e6900` plus the uncommitted 198/02 and 198/03 builds, with
`AOF_GLOBAL_HOME` set to a fresh temporary directory, selected by file through
`node scripts/test.mjs --only`. These are story-scoped lanes. The whole-tree run is the regression
gate, which has not run (see the accept decision).

- **The package, the practice and UI controls, the rasterizer and the practice list.**
  `packages/design-system/test/index.mjs`, `test/arch/practices/index.mjs`,
  `test/arch/ui/index.mjs`, `packages/execution/test/diagram-rasterize.suite.mjs`,
  `packages/core/test/practice-render-lane.suite.mjs`. Result: 408 cases, 0 failures.
  verifies → every `@executable` task of 198/01–03, FF-19801–FF-19805.
- **The suites the builds re-counted, and the neighbouring arch lanes.**
  `test/command/application-assembly.test.mjs`, the `work-init`, `work-update` and `project-init`
  goldens, `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs`, and the `testing`,
  `bundle`, `command` and `diagrams` arch indexes. Result: 462 cases, 1 failure. The failure is
  FF-7106, and every line of it names 210/00's `STORY.md`, none 198's (F-01).
  `packages/core/test/application.test.mjs` is a `node:test` file, so it was run with
  `node --test`. Result: 2 tests, 2 pass.
- **198/00's own suites.** `packages/core/test/bundle-compose.suite.mjs`,
  `packages/core/test/codex-native-assets.suite.mjs`. Result: 146 cases, 0 failures.
  verifies → 198/00 tasks 00–03.
- **198/01 task 05, the dependency-audit scenario** ("adding the package passes the dependency
  audit"). `node scripts/supply-chain-audit.mjs`. Result: "supply-chain audit passed: 0 warning(s)".
  verifies → `01_story_a-project-extracts-its-design-system-and-names-it/tasks/05_aof-extracts-its-own-design-system.feature`,
  last scenario.
- **Not run: the operator's real Claude Design runs.** These are 198/01 task 05 (E19–E21 and the
  loop and mock-only scenarios), 198/02 task 03 and 198/03 task 03. Each one needs an interactive
  Claude session with the operator approving at an Artifact link. 01/05 also needs the operator's
  export of the `AOF` Claude Design pages not yet committed, which is outstanding (STATE, due
  2026-12-14). 02/03 and 03/03 build on the system that 01/05 publishes.
- No milestone surface has a `DESIGN.md`, so no design-conformance render applies. No task carries
  `@uat`.
- `aof work validate 198`: PASS. `aof work doctor 198`: no `control-unresolved` at either severity
  (warnings only: `mtime-ahead-of-updated`, `doc-over-budget` for three example maps,
  `example-map-too-many-rules` for 01 and 02, `control-runner-unchecked`, `rubric-join-unchecked`).

## Findings

| id | observed | type | severity | triage | routed to | status |
|---|---|---|---|---|---|---|
| F-01 | FF-7106 is red at HEAD on 210/00's `STORY.md`: it declares ten bundle members (the `add-uat`, `continue`, `manual`, `map-tests`, `repair`, `review` and `verify` commands under `packages/acd/assets/commands/`, the uat `SESSION.md` and `STATE.md` templates, and `packages/learning/assets/commands/teach.md`) without their tracked renders (`.agents/skills/aof-*/{SKILL.md,agents/openai.yaml}`, `.codex/aof/workflows/workflow-contract.md`, `.opencode/commands/aof/*.md`). No line names 198. The whole-tree run 198's accept needs would therefore be red on another milestone's contract. Same cause as m188/F-12, m161/F-06 and m151/F-151-01 (an open story's declaration reddening every other milestone's gate), a distinct incident on a new story (recall `a6363955-d693-457f-b125-4b8697657db9`). | defect (cross-item) | blocker for 198's regression gate, not for 198's code | fix in 210/00's contract: declare the tracked renders FF-7106 names, or narrow the members it declares | 210/00 (its refine) | fixed 2026-11-27 inline at verify (operator's go): 210/00's `files:` gains the twenty tracked renders and `packages/acd/assets/manifest.json`, and FF-7106 is green (6 cases, 0 failures). The full `test/arch` sweep before the gate then found the same story's `PLAN.md` restating two declared paths (FF-9603, recorded in STATE at 198/03). Reworded, green. |

## Accept decision

2026-11-27 · aof:verify 198 (solo, product owner inline).

- **198/00: accepted** (`in-review → done`). Every task is `@executable` and green, FF-19801 and
  FF-19802 are green with red probes recorded, and its code is committed (`0f791c91`). `OUTCOME.md`
  and `RETROSPECTIVE.md` are written in its folder.
- **198/01, 198/02, 198/03: not accepted, left `in-review`.** Their `@executable` lanes and controls
  are green, but each holds an `@manual` task that only the operator's interactive Claude Design
  run can sign off (see the evidence). This is awaiting sign-off, not developer rework, so no story
  goes back to `in-progress`.
- **The milestone: not accepted.** Three stories are not done. The regression gate has not run, and
  it cannot run yet, for two reasons:
  - the 198/02 and 198/03 builds are uncommitted (74 dirty paths), and `aof work regression-gate`
    refuses a dirty checkout;
  - FF-7106 is red on 210/00 (F-01), so the gate would be red even on a clean commit until 210/00's
    declaration is repaired.
- **To finish:** commit the 02/03 builds; fix F-01 in 210/00; run the three operator Claude Design
  runs (01/05 first, after the AOF page export); run `aof work regression-gate 198`; then
  re-run `aof:verify 198`.
