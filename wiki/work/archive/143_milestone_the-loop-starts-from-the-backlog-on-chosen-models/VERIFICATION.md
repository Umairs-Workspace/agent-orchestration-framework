---
doc: verification
---
# 143 · Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-14301 | `test/arch/loop/acd-loop-scope-guard.test.mjs` (the FF-14301 case) | green, 2026-10-02 | planted `import * as _probe from "@aof/work/commands/promote";` at the head of `packages/work-loop/src/commands/loop.mjs` → `not ok` naming `packages/work-loop/src/commands/loop.mjs imports @aof/work/commands/promote`; restored byte-identical (`cmp`), green again |
| FF-14302 | `test/arch/loop/acd-loop-concurrency-single-home.test.mjs` (the FF-14302 case, beside FF-12901) | green, 2026-10-03 | appended `export const _probe = "whole-item";` to `packages/work-loop/src/cycle.mjs` → `not ok` naming `packages/work-loop/src/cycle.mjs, packages/work-loop/src/engine.mjs` as the spellings outside the bounds home; restored byte-identical (`cmp`), green again |
| FF-14303 | `test/arch/session/acd-agent-model-source-map.test.mjs` (the FF-14303 case, beside FF-7006) | green, 2026-10-03 | clause 1: appended `export function resolveSessionLaunch() {}` to `packages/work-loop/src/commands/drive.mjs` → `not ok` listing `packages/work-loop/src/commands/drive.mjs:resolveSessionLaunch` beside the leaf's two; clause 2: appended `export const _probe = (config) => config?.work?.agents?.session;` to the same file → `not ok` listing `packages/work-loop/src/commands/drive.mjs`; restored byte-identical (`cmp`) after each, green again |

## Verification evidence

- **143/00 – 143/03 (`@executable`, 10 features) and FF-14301 – FF-14303, at accept, 2026-10-03.**
  Run in the `aof-143` worktree at `503d40eb` (the branch head before merge), with a temp
  `AOF_GLOBAL_HOME`. The importer sweep covered every test file the four stories declare or the
  branch changes, plus every direct importer of a changed `packages/*/src` module: 102 files through
  `scripts/test.mjs --only`. Result: 1651 ok and 1 not ok. The red was `131/03 task02` in
  `loop-command-wave` (`git worktree add … failed to read .git/worktrees/dispatch-07-01/commondir`).
  The suite re-run alone was 49 ok, 0 failures, so that red was contention (F-143-06). The six
  package `node:test` files the runner cannot select were run with `node --test`: 28 pass, 0 fail.
  The three FF cases are green in that run: `arch/143 FF-14301`, `FF-14302`, `FF-14303`.
  verifies → 143/00 tasks 00-01, 143/01 tasks 00-01, 143/02 tasks 00-02, 143/03 tasks 00-02.
- **No `@manual` and no `@uat` scenario** in any of the four stories, and no UI surface, so there is
  no agent-run procedure, no design-conformance render and no human sign-off.
- **The contract at accept (`4f7cc720`).** Three scenario lines in 143/00 task 00 launched the loop
  with `--json`, which face policy makes the read-only probe (F-143-01). Three FF scenarios named
  test files that were folded into existing suites at build (F-143-02). Both were corrected before
  acceptance, and `aof work validate 143` passes after the change.
- **Doctor at accept:** `aof work doctor 143` shows no `control-unresolved` at either severity.
  Its findings are advisory warnings only (`rubric-join-unchecked`, `control-runner-unchecked`,
  `numbering-gap`, `depends-edges-unchecked`, `mtime-ahead-of-updated`).

## Regression gate

`aof work regression-gate 143` (144's sharded whole-tree program), run in a clean detached worktree
at `4f7cc720` with a temp `AOF_GLOBAL_HOME`, 2026-10-03: **red**, 31.6 min, row in `REGRESSION.md`.
An earlier run in the shared checkout was stopped and discarded: the 135 session moved
`packages/work/src/doctor/examples.mjs` into a new package mid-run, and 425 units failed to load.
Attribution of the red row:

- **143's, fixed in the item and green at `051e54ed`:**
  - 70/05 task02 ×2. 143/03's refine brief sacrificed its declared ADR-003/004 slice with
    3,261 chars unspent. That was a packer defect (F-143-08), fixed in `051e54ed`. Every suite that
    reaches the brief compiler passes: 369 cases, plus 7 in the package suite.
  - Plan 09 ledger and workspace-boundaries. 143 added FF-14302's case without a ledger row and
    changed `commands/loop.mjs` without re-stamping its runtime-audit `sourceDigest` (F-143-09).
    Both were refreshed on this branch by 135's `8ccdee6d` before 143 could.
  - Re-run at `051e54ed`: `core-workspace`, `brief-pinned-to-the-stream` and the three FF suites,
    39 cases, 0 failures.
- **Inherited from 142's squash, red on `main` (F-134-03):** FF-11903 ×2, 119/00 task02 ×2,
  FF-5204, and `this-tree-holds-what-is-live` ×3. These are the same cases as 144's two gate rows.
- **135's, not 143's:** 96/02-00 and FF-9603 (2) name
  `135_…/stories/01_story_the-practice-is-its-own-package/PLAN.md`, which restates declared paths.
  That item is in flight in another session.
- **Not isolated (logged, not red):** `fleet-boards-branch-deleted`, 53/00 task03, 38-06 ×2,
  130/01 stop-request, 131/01 ask-request.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-143-01 | 143/00 task 00 said `aof work loop widget-sync --json` runs and promotes, in three scenario lines. Face policy makes `--json` the read-only probe, so through the CLI it answers `wouldPromote`. | contract-wording | minor | non-blocker, fixed in the item | 143/00 task 00, `4f7cc720` | fixed |
| F-143-02 | The FF-14301, FF-14302 and FF-14303 scenarios named new test files that were never created: each control was folded into an existing suite because its directory was at its budget ceiling. | contract-wording | minor | non-blocker, fixed in the item | 143/00 task 00, 143/01 task 00, 143/02 task 01, `4f7cc720` | fixed |
| F-143-03 | Three 143/03 rows are evidenced piecewise, not by a running loop: task 01's wave-lane row and task 02's resumed-refine and supervisor-relaunch rows (a source match plus `sessionLendFor` and the resume rule). The reviewer traced each end to end. | gap | minor | non-blocker | 143/03 OUTCOME gap | open |
| F-143-04 | `knowledge/src/memory.mjs` and `mesh/src/commands/session.mjs` parse argv by hand. The `split("=", 2)` inline-value defect is fixed in both, but neither uses `parseSpecArgv`. | defect | minor | non-blocker: story-shaped | 143/02 OUTCOME gap; story (operator) | open |
| F-143-05 | `aof work loop <slug> --level L3` promotes before the L3 gate is computed. A refused gate leaves the item promoted and the loop not started. | gap | minor | non-blocker: no worse than promoting by hand and then being refused | 143/00 OUTCOME gap | open |
| F-143-06 | `131/03 task02` (`loop-command-wave`) was red under the 102-file sweep (`git worktree add` could not read a sibling worktree's `commondir`) and green alone (49/49). | defect | minor | non-blocker: contention, not a 143 file | the not-isolated log (144) | open |
| F-143-07 | ADR-005 said the mesh assignment directive and the trigger declaration build loop declarations. Both import only `decideLoopScope`; the loop shell builds every declaration. | contract-wording | minor | non-blocker, fixed in the item | ARCHITECTURE ADR-005, `4f7cc720` | fixed |
| F-143-08 | The brief packer entered a condenser that DECLINED (null) as a final reduction in `exhausted`, so a section that fit the whole ceiling was never condensed again; once sacrificed it was offered back whole only. 143/03 refine sacrificed its declared slice with 3,261 chars unspent (70/05 task02 red at the gate). | defect | major | blocker, fixed in the item | `packages/work/src/phase-brief.mjs`, `051e54ed` | fixed |
| F-143-09 | 143 added FF-14302 to `acd-loop-concurrency-single-home` (3 → 4 cases) without the Plan 09 ledger row, and changed `commands/loop.mjs` without re-stamping its runtime-audit `sourceDigest`. No story lane ran the tree-wide workspace suites. | defect | minor | blocker, fixed on the branch | refreshed in `8ccdee6d` (135/01); green at `051e54ed` | fixed |

## Accept decision

Accepted 2026-10-03 by `aof:verify 143`.

- The four stories were accepted on their scenarios: green at accept, validate PASS, and no open
  blocker. F-143-08 was the only blocker, and it was fixed in the item.
- `aof work doctor 143` shows no `control-unresolved` finding.
- The milestone door was passed with `--gate-override`. The whole-tree row at `4f7cc720` is red, and
  every red in it that is 143's is green at `051e54ed`. What stays red is inherited (F-134-03) or
  belongs to 135, which is in flight in another session.
