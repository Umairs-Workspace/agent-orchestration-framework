---
doc: verification
---
# 169 · Hyperagent plans the work — Verification

## Verification evidence

### 169/01 · Integration packages are self-contained — the story's own lanes

Every scenario is `@executable`; the story declares no `@manual` and no `@uat` scenario and has no UI
surface, so no design-conformance review applies. Each lane ran foreground on 2026-10-23 with
`AOF_GLOBAL_HOME` isolated to a fresh temp dir, exit code and both streams read.

- **`node scripts/test.mjs --only packages/core/test/hyperagent-runtime.suite.mjs test/arch/command/acd-integration-registry-one-home.test.mjs packages/integration-hyperagent/test/hyperagent.suite.mjs`**
  — exit 0, `executed 25 cases; failures 0`, no `not ok` on either stream. Includes E1–E8 of task
  00, E1–E3 of task 01, and both task 02 E1 cases (the package seam and the `hyperagent:check` verb).
  `verifies → tasks/00_an-integration-contributes-its-own-assets.feature`,
  `tasks/01_core-names-no-integration-outside-the-registry.feature`,
  `tasks/02_check-extracts-on-windows.feature`
- **`node test/integration/cli.mjs lifecycle`** — exit 0, 60 `ok`, 0 `not ok`. Covers the CLI end of
  task 00 R2/R3: the render appears once `work.integrations.hyperagent` is present and leaves when it
  is removed, and `work init --runtime hyperagent` fails with `Unsupported runtime "hyperagent"`.
  `verifies → tasks/00_an-integration-contributes-its-own-assets.feature`

Not re-run at this verify: the other controls and suites the build edited (bundle membership,
generated stamp, declared writes, learning-edge census, session-driver mesh-blind, source-directory
budget, the bundle/delegation suites). They were green at the build's review (STATE `## Verification`)
and fall to the milestone's `aof work regression-gate 169`.

### 169/00 · Hyperagent plans the work — the story's own lanes

No UI surface, so no design-conformance review applies. Both lanes ran foreground on 2026-10-23 with
`AOF_GLOBAL_HOME` isolated to a fresh temp dir. The exit code and both streams were read.

- **`node scripts/test.mjs --only packages/core/test/hyperagent-runtime.suite.mjs test/arch/command/acd-integration-registry-one-home.test.mjs packages/integration-hyperagent/test/hyperagent.suite.mjs`**
  — exit 0, `executed 25 cases; failures 0`, no `not ok` on either stream. Covers task 00 E2/E4–E6
  (members read from the package, the seven skills plus `AGENT.md`, the execution contract) and task 01
  E2–E7 (brief determinism and refusals, the result block, check in a temporary checkout and the unsafe
  branch, doctor hints). The package's check case, red here when assimilated (F-2), is green.
  `verifies → tasks/00_hyperagent-renders-the-planning-subset.feature`,
  `tasks/01_hyperplan-delegates-and-checks.feature`
- **`node test/integration/cli.mjs lifecycle`** — exit 0, 60 `ok`, 0 `not ok`. Covers task 00
  E1/E3/E7 and task 01 E1: no `.hyperagent/` and no `hyperplan` without `work.integrations.hyperagent`.
  With the block present, `/aof:hyperplan` renders for Claude, and the skills and `AGENT.md` render
  under `.hyperagent/` with no `aof-continue` and no `aof-hyperplan` there. Removing the block removes
  both. The doctor and the brief also run through the CLI.
  `verifies → tasks/00_hyperagent-renders-the-planning-subset.feature`,
  `tasks/01_hyperplan-delegates-and-checks.feature`

**Pending — task 01 E8 (`@manual`, live; operator-run).** Its precondition is absent on this
machine. Measured 2026-10-23: no Hyperagent MCP server is registered in `.mcp.json`,
`~/.claude.json` or `~/.codex/config.toml`. The procedure:

1. `claude mcp add --transport http hyperagent https://hyperagent.com/api/mcp`, then complete OAuth.
2. Import `.hyperagent/AGENT.md` and the seven `.hyperagent/skills/aof-*/SKILL.md` into Hyperagent.
3. `/aof:hyperplan plan` for one idea → draft PR. Then `aof work integrations hyperagent check <branch>`.
4. Promote the milestone it framed, `/aof:hyperplan refine <NN>` → draft PR, then `check` again.

Paste slot (to fill in): the PR URLs, both `check` outputs, and the `aof work validate` result on each
branch.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16901 | `test/arch/command/acd-integration-registry-one-home.test.mjs` (E1, E2) | GREEN (2/2, 2026-10-23). | E2 plants `packages/core/src/work/planted.mjs` importing `@aof/integration-hyperagent/runtime` in a temp tree and runs the same scanner. Observed: the violation list is exactly `packages/core/src/work/planted.mjs imports @aof/integration-hyperagent/runtime`. |
| FF-16902 | `packages/core/test/hyperagent-runtime.suite.mjs` (E6, E8) | GREEN (2026-10-23). | Created `packages/core/assets/commands/hyperplan.md` (one line, `probe`) and re-ran the suite. Observed red: `not ok - 169/01 E8 · core's assets hold no Hyperagent file`, actual `[ 'commands/hyperplan.md' ]` vs expected `[]`, exit 1. File removed; nothing left behind. |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | ADR-003 named one Notion import in `command-core.mjs` as FF-16901's exception. Measured at verify, `@aof/integration-notion` is imported from ten modules under `packages/core/src`. FF-16901 excepts the Notion package by name. | defect | low | Non-blocker. The control matches the decision's intent: Notion is the chore's to move. ADR-003 is amended with the measured ten modules (ratified at this verify). Recall: no prior finding with this cause (m72/F-72-AD, F-72-AB, F-72-A and m69/F-69-V10 are other ADR wordings). | product-owner (the Notion chore: ten modules, not one) | closed |
| F-02 | The sidecar copy of an integration's assets (`scripts/install-local.mjs`, `scripts/build-sea.mjs`) has no test of its own. Task 00 E2 covers only the reader, against a sidecar laid out by hand. | test-gap | low | Non-blocker. The writer is first exercised by the next payload install. Recorded as an OUTCOME gap. Recall: m163/F-02 and m138/F-04 are other `install-local` faults, so this is a distinct incident. | product-owner (backlog) | open |
| F-03 | ADR-005's gate drops an integration's resources and assets. An integration's hooks and templates are not gated, and no integration ships either today. | gap | low | Non-blocker. Nothing renders ungated today. Recorded as an OUTCOME gap. Recall: m124/F-15 and m55/F-55-M-2 are other unpinned or uncounted members, so this is a distinct incident. | product-owner (backlog) | open |

## Accept decision

**ACCEPTED (169/01)** — 2026-10-23. The story's own lanes are green (25/25 cases, the lifecycle
feature 60/60). Both declared controls are green and each was seen to fail on a red probe.
`aof work validate 169/01` passes, and no blocker finding is open. Carried forward: F-02 and F-03 as
OUTCOME gaps, and the milestone's `aof work regression-gate 169`, which story 00 and the milestone
accept still need.
