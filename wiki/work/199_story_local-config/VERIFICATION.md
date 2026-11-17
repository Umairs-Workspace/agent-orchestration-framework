---
doc: verification
---
# 199 · Verification

## Contract and review

The four tasks are `@executable` only: no `@manual` scenario, no `@uat` scenario and no UI surface,
so there is no agent-run lane, no human acceptance and no design review. The story is parentless and
has no `ARCHITECTURE.md`, so it declares no `FF-NN` control and this record has no red-probe
register. The arch suites that sweep source act as its fitness checks.

## Verification evidence

### 199 — the story-scoped lane, 2026-11-17, this MacBook, at d5a8d9ae

`AOF_GLOBAL_HOME=$(mktemp -d) aof test --scope file <135 suites> --json`, run record
`20261117T123406198Z-85895dd8bdd3-82494` (result `red`). The 135 suites are those that import a
module 199 changed (the local-config leaf, the operator profile, the work-init and workspace
suites, the command inventory, the three messaging refusals), plus every `test/arch` suite that
sweeps source. 1,105 cases ran, 1,086 passed and 19 failed.

- **`test/command/config-inspect.test.mjs`**: every one of the 21 story cases (`199 00 …` to
  `199 03 …`) passed. Each scenario and outline maps to one case by its example id or title.
  `verifies → tasks/00…03`
- **`packages/messaging/test/services.test.mjs`** (`node --test`): 4 passed.

### The 19 failures, attributed by commit

The eight suite files holding the 19 failures ran again through `scripts/test-shard.mjs` in two
detached worktrees. Each worktree's `node_modules` was an APFS clone of this checkout's, so workspace
imports resolved inside it. One worktree was at **3562430f**, the commit before 199. The other was
at **5d1ac698**, 199 itself. Both runs: 66 cases, 20 failures. The 20th, `core-workspace/copied
core runs…`, is an artefact of the cloned `node_modules`, and it passes in this checkout.

- **18 failures were already red before 199 and are unchanged by it**, with the same offenders and
  counts. They are `FF-6905` (`acd-worker-driver-no-headless-print`), `m42-item-3`
  (`packages/foundation/src/fs.mjs`), both codebase-grounding cases (their offender lists are
  identical before and after), six `FF-11904` cases and `138/00 task01` (`test/loop` 66 > 64,
  `packages/foundation/src` 9 > 8), `distribution-workspaces` ×2 and `yarn-installation` ×3
  (`/var` against `/private/var`), and `workspace-boundaries/planted …`. `FF-16004` is in this
  group too. `aof work find` loaded 759 modules against a ceiling of 758 before 199, and 760
  against the ceiling of 759 that 199 set. 199 added one module and raised the ceiling by one,
  so the gap of one was already there.
- **One failure hides a regression that 199 introduced.** `workspace-boundaries/all actual owners
  are scanned…` was red before 199 on three `packages/mesh` entries. At 199, it also names
  `config-inspect.mjs` three times as unaudited plus three times as stale, and `work/doctor.mjs`
  once as unaudited. This is F-03.

### 199 — the fixes for F-01 and F-03, 2026-11-17, re-run on the same lane

Both fixes were made at verify, at the operator's instruction ("fix the issues inline"):

- **F-03.** `scripts/workspace-runtime-audit.json` re-stamps `config-inspect.mjs`'s three entries.
  Their expression digests are unchanged, and each reason gains a line for 199. The file also
  gains one entry for `work/doctor.mjs`'s `git ls-files --error-unmatch` probe. That probe now
  carries `timeout: 30_000`, like its sibling git calls. The three `packages/mesh` entries left
  stale by 3562430f (`writeText` → `writeJson`, with the git calls byte-identical) are re-stamped
  in the same file, with a reason line each. As a result, `inspectBoundaries` reports **no
  findings** over the real tree, and `workspace-boundaries/all actual owners are scanned…` is
  green for the first time since 3562430f.
- **F-01.** Task 01's outline row reads `at "work.agents.session.models.build"`, and the edges
  case asserts the reported path exactly.

The lane was re-run with `aof test --scope file <same 135 suites> --json`, run record
`20261117T132010561Z-9e8111a87fbe-56366`: 1,108 cases, 1,089 passed and 19 failed.

- **`test/command/config-inspect.test.mjs`**: all 24 story cases passed, the 21 from before plus
  three new `199 04 …` cases. `verifies → tasks/00…04`
- **Red probe, task 04.** Dropping the doctor probe's `timeout: 30_000` changes that file's source
  without re-stamping it. `199 04 the boundary detector names no file 199 touched` then went red,
  1 failure in 72 cases. The probe was then restored.
- **The 19 failures**: 18 are the pre-existing reds listed above, minus the boundary case that is
  now fixed. The 19th is `FF-9603 (2)`, raised by
  `wiki/work/201_milestone_memory-recall-pick/stories/01_…/PLAN.md` line 56. That milestone is
  being promoted and refined by another session, and the file is uncommitted and not 199's.

### Gates

- `aof work validate 199`: PASS ("199 is well-formed").
- `aof work doctor 199`: no errors and no `control-unresolved` at either severity. The warnings are
  stream-wide: `numbering-gap` (122), `depends-edges-unchecked`, and `rubric-join-unchecked`.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | Task 01's edges outline expects `config-local-key-not-allowed` "at `work.agents.session.models`". The build reports the leaf written (`work.agents.session.models.build`), as it does for E8's `work.examples.enabled`. The test was loosened to read "at" as "at or within" instead of the row being restated. The contract and the assertion are both looser than the behaviour. No prior occurrence was recalled. | test-gap | low | non-blocker. Restate the row as `work.agents.session.models.build` and assert the path exactly. Fixed at verify. | product-owner, 199 | closed |
| F-02 | `STORY.md` `files:` named `test/command/local-config.test.mjs`, which was never created, plus two suites the build never touched. It omitted 15 files the commit changed, including four arch tests and three messaging modules. This is the same cause as m127/F-05 and m119/F-30: arch-test pins and command edges are found only at build. | defect | low | non-blocker. Fixed at verify: `files:` now lists exactly the 25 paths 5d1ac698 changed outside `wiki/`. | product-owner | closed |
| F-03 | 199 edited `config-inspect.mjs` without re-stamping its three entries in `scripts/workspace-runtime-audit.json`, which are keyed on the file's source. 193 and chores 195–197 each re-stamped the file. 199 also added an unaudited `spawnSync("git", ["ls-files", "--error-unmatch", …])` to `work/doctor.mjs`. `workspace-boundaries/all actual owners are scanned…` was already red on three mesh entries, which hid all four offenders. The cause is the same as m161/F-05, an edited file leaving its audit key stale. | defect | medium | **blocker**: a declared child-process audit was left uncovered. New `@bug` task `tasks/04_the-runtime-audit-covers-every-child-process-199-touched.feature`, fixed at verify and green, with its red probe recorded above. | product-owner, 199 | closed |

## Accept decision

**DECLINED**, 2026-11-17, first pass. F-03, a blocker, sent the story back to `in-progress`.

**ACCEPTED**, 2026-11-17, second pass. All five tasks' scenarios are green, including the `@bug`
task 04 with its red probe recorded. No blocker is open, because F-01, F-02 and F-03 are all closed.
`aof work validate 199` passes. The pre-existing reds in the story lane are not 199's, and they are
still owed at the next whole-tree gate. They are `FF-6905`, `m42-item-3` (3562430f's `writeJson`
fallback in `packages/foundation/src/fs.mjs`), `FF-16004` (one over), both codebase-grounding
cases, `FF-11904`/`138/00`, `distribution-workspaces` ×2, `workspace-boundaries/planted …` and
`yarn-installation` ×3.
