---
doc: verification
updated: 2026-10-03
---
<!--
  Story VERIFICATION.md — is story 145 truly done, and what is the evidence?
  Parentless story (parent: null): this is the story's own record; there is no milestone SPEC box to
  tick and no milestone regression gate at this door.
  No sibling ARCHITECTURE.md: 145 declares no FF-NN of its own. It WIDENS two declared at 133
  (FF-13301, FF-13302), so those legs and their red probes are recorded under ## Fitness functions,
  citing the declaring item.
  No UI surface and no DESIGN.md: no design-conformance section.
-->
# 145 · A milestone's loop plan can be drawn — Verification

## Method

Lanes in scope: `@executable` (tasks 00–03), one `@manual` and one `@uat` (task 03). Run inline by the
product owner, who is also the single writer allocating the finding ids below.

The build lives on branch `145-loop-diagram` (worktree `aof-145`). Every suite ran through
`node scripts/test.mjs --only <files>` under fresh `AOF_GLOBAL_HOME` and `CLAUDE_CONFIG_DIR`
directories, exit codes read unpiped. The lane widened outward: the story's own suites, then every
test importing a changed module, then every test that enumerates the bundle's command files (a new
command is a census change, and the importer sweep does not reach those, F-145-02).

## Verification evidence

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story + importers) | 17 files: `loop-wave-plan`, `story-context-contract`, `story-contract-derive`, `work-next-ready-set`, `doctor-diagrams-lane`, `test/diagrams/`, `test/arch/diagrams/`, `arch/loop/acd-loop-family-boundary`, `test/arch/planning/`, `acd-source-directory-budget`, `acd-number-null-safe`, `loop-command-wave`, `work-loop-phase-map`, `diagram-layout.suite`, `bundle.suite`, `yarn-installation` | **479 ok, 1 failure, exit 1**: `yarn-installation / extracted kernels cannot import core…`, `node:fs` in `commands/diagram/export.mjs` (F-145-01). `domain-services.test.mjs` is a `node:test` file the selector cannot load; run directly: **6 pass, 0 fail, exit 0** | tasks 00–03 |
| `@executable` (command census) | every test that enumerates `packages/core/assets/commands`, 50 files (all but `test/work/index.mjs` and the integration step definitions) | **1023 ok, 6 failures**: three are 145's (F-145-02); three are `this-tree-holds-what-is-live` and are inherited (F-145-03) | task 03 |
| `@executable` after the fixes | `yarn-installation`, `test/diagrams/`, `test/arch/diagrams/`, `diagram-layout.suite`, `bundle.suite`, `acd-source-directory-budget`; then `adapters`, `autonomous-shell-out-prompt`, `acd-learning-edge-reaches-every-cut`, `test/diagrams/`, `diagram-layout.suite`, `test/arch/diagrams/` | **96 ok, exit 0**; then **101 ok, exit 0** | tasks 00–03 |
| `@manual`: a real milestone, end to end | `/aof:loop-diagram 135` followed in this session against this repository (`refine_first`), the CLI half run from the 145 branch's own `packages/core/src/cli.mjs` rather than an installed payload, because the branch is unmerged and installing it would have changed the live control node | `aof diagram plan 135 loop --json` exit 0: wave 1 = `135/01`, `135/02`; wave 2 = `135/03`, `135/04`, `135/05`; all five `built` (done); bound 3; no held, no unplanned. 04 (`depends: [01, 02]`) is not beside 01. `loop.html` drawn by the engine's skill; `aof diagram export 135 loop --json` exit 0, `written: [execution/loop.png]` via the `playwright-cache` rung. `execution/` holds `loop-plan.json`, `loop.html`, `loop.png`, and no SVG. The PNG's two columns, five green nodes and five edges match `loop-plan.json` | task 03 `@manual` |
| gate | `aof work validate 145`, from the worktree root | `PASS — 145 is well-formed.` exit 0 | step 4 |
| gate | `aof work doctor 145`, from the worktree root | exit 0; **no `control-unresolved`** at either severity. Warns only: `cache-status-divergence` (the cache still reads the pre-build status), `numbering-gap`, `rubric-join-unchecked`, `depends-edges-unchecked`; `Loop-Ready: 80% (8/10)` | step 4 |

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| m133/FF-13301 | `test/arch/diagrams/acd-diagram-generator-named-once.test.mjs`, which now sweeps the bundle prose as well as `src/**` | green: `loop-diagram.md` does not name the generator | the suite's own probe plants the generator's name in code and in prose; the detector fires on both and ignores a comment (`arch/133 FF-13301 red probe`, ok) |
| m133/FF-13302 | `test/arch/diagrams/acd-diagram-layout-single-home.test.mjs`, extended to `execution/` and the loop file names | green: outside `diagrams/layout.mjs` no module builds an `execution/` path or spells a loop file name | `arch/145 FF-13302 red probe`: `execution/loop.svg` spelled in `plan.mjs` fails it, naming the file (ok) |

## User sign-off

| scenario | procedure | result |
|---|---|---|
| task 03 `@uat`: the operator can read the parallelism off the picture | the operator opened `wiki/work/135_milestone_key-examples-in-the-contract/execution/loop.png` | **Round 1, not signed off**: two changes asked for. Done stories should be green, and the loop diagram needs no SVG (F-145-04). The operator also confirmed `loop.html` stays, since it is the engine's source and can be shown in the UI. **Round 2, after the fix, signed off** by the operator on 2026-10-03 |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-145-01 | `commands/diagram/export.mjs` imported `existsSync` from `node:fs`, outside the module's declared native ports, which red `yarn-installation` | defect | blocker | fixed in the item | 145 (`0d2c537d`): the source read answers `diagram-source-missing` on `ENOENT` | closed |
| F-145-02 | the new bundle command reddened its own census: the repository's rendered bundle and lock lacked it (`141/03`, `140/00`: `created: 3`), FF-12405 had it unclassified, and the autonomous door's pre-existing command set did not name it | defect | blocker | fixed in the item | 145 (`1e15ffb0`): `aof work update` renders and locks it; FF-12405 classifies it; the door pin names it | closed |
| F-145-03 | `this-tree-holds-what-is-live` 00 / 02 ×2: 122 stale-reads against a ceiling of 117, and 134 done at the root | inherited | non-blocker | red at `aa9fd84c` before 145 (m135/REGRESSION.md override row); 145's records add no stale `reads:` (validate PASS) | the operator's `aof work archive 134` and the stale-reads ratchet's owner | open |
| F-145-04 | `@uat` round 1: built stories were shaded grey, not green, and an SVG was kept that the operator does not need | design-gap | blocker | fixed in the item | 145 (`1e15ffb0`): the style guide's `done` role (green), and the brief asks for it; the loop export keeps the PNG alone; contract tasks 01–03 amended | closed |

## Accept decision

**Accepted, 2026-10-03.** Every `@executable` scenario is green, and the `@manual` run on 135 holds.
The operator signed off the `@uat` on round 2. Validate passes, doctor reports no unresolved control,
and no blocker finding is open: F-145-01, -02 and -04 are fixed in the item, and F-145-03 is
inherited and non-blocking.
