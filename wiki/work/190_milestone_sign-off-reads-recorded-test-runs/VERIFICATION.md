---
doc: verification
---
# 190 · A tree is tested once per change, and every sign-off door reads that run's record instead of running it again — Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-19001 | `test/arch/testing/acd-test-record-one-writer.test.mjs` | green at 190/00's build, 2026-11-10 | planted second writer and a planted `result`/`failures`/`record` input are named, in-row |
| FF-19002 | `test/arch/testing/acd-test-command-reports-not-decides.test.mjs` | green at 190/00's build, 2026-11-10 | three planted import shapes in a door are named, in-row |
| FF-19003 | `test/arch/testing/acd-test-selection-widens-never-narrows.test.mjs` | green at 190/01's build, 2026-11-10 | an unexplained selected suite, a sixth reason and a widened result carrying a reason each fail, in-row |
| FF-19004 | `test/arch/testing/acd-test-record-one-writer.test.mjs` | green at 190/00's build, with a named shrink-only baseline of two pre-existing modules (STATE Feedback) | a planted `write-tree` is named, in-row |
| FF-19005 | `test/arch/testing/acd-suite-registration-single-decider.test.mjs` | green at 190/01's build: all registered suite files are suites by the declaration | a narrower planted declaration leaves a package suite unselectable, in-row |
| FF-19006 | `test/arch/testing/acd-suite-registration-single-decider.test.mjs` (third leg) | green at verify, 2026-11-10 | at verify, appended `const own = (file, roots) => roots.some((root) => file.startsWith(root));` to `packages/work/src/testing/layout.mjs` and ran the suite: `not ok - arch/190 FF-19006 …` with `+ [ 'iterates the declared roots or suffixes itself' ]`. The file was restored byte-identical (sha `bc26d063…` before and after), and the leg went green again |

All six controls were green in verify's scoped run (below), the same run that measured F-01.

## 190/01 task 03 · the recent stories narrow (`@manual`, agent-run, 2026-11-10)

**The replay (E11).** The 76 stories of milestones 160–180 that declare `files:` went through the
shipped `selectSuites`. The run used this repo's declared roots (`test` plus the 15 package and app
`test/` directories), `suiteSuffixes` `[".test.mjs", ".suite.mjs"]`, no couplings, and the
transitive relations port. The graph was the refine's `aof graph build .` artifact
(2026-11-09T23:01:03Z), built after every one of those stories landed. As in RESEARCH Q1, a file
first added on or after a story's `created:` stands in for "absent from the graph". It is
presented as absent and on disk, the state at review time. The whole suite is 1,269 runnable
suite files. The script is `.tmp/190-01-replay.mjs` (ignored).

| what | stories |
|---|---|
| still widen | **64 of 76** (RESEARCH Q1 baseline: 76 of 76) |
| … widen on a `no-registered-dependent` file | 46 |
| … widen on a `not-in-graph` file | 49 |
| … on an `.mjs` file | 46 |
| … on a document or data file (`.md`, `.json`, `.yaml`, `.feature`) | 41 |
| … on code the graph does not extract (`.ts`, `.tsx`, `.mts`, `.rs`) | 23 |
| narrow | **12** |

Of the 12 that narrow, the **median selected count is 1,119 and the 75th percentile 1,120**, of
1,269. Only 167/04 narrowed to a handful (9). **This is the finding, and it overturns RESEARCH's
"median 8".** That figure counted direct importers. The transitive walk ADR-003 §2 requires reaches
the composition root (`aof/default-application`), which nearly every suite imports, so a source
module's closure is about 1,119 suites. Each such run is a whole-tree run in all but name. The
widenings group as follows:
- **Documents and renders.** The largest groups are bundle sources (`packages/core/assets/**/*.md`,
  35), the generated renders (`.agents/`, `.opencode/`, `.claude/`, `.codex/`, `.hyperagent/`, 77
  together), and the lock, journal and config `.json` files.
- **TypeScript and Rust.** The code graph does not extract `.ts`/`.tsx`/`.mts`/`.rs`, so those
  files are always absent. A coupling may never place code (ADR-003 §4).
- **`.mjs` files with no runnable dependent suite.** Examples are UI-only modules and modules
  covered only by native `node:test` files, which this repo's per-file runner cannot run (see
  below).

**The coupling census (scenario 2).** The literal mentions were counted over all 1,333 suite files
(`*.test.mjs` and `*.suite.mjs` under every test root). `.claude/` is named by 85 suites,
`.agents/` by 32, `.opencode/` by 19, `.codex/` by 26, `.hyperagent/` by 2, `core/assets` or an
`"assets"` segment by 191, `README` by 32, `aof.lock.json` by 29 and `aof.apply-journal` by 0.
**No coupling is declared.** A literal census sees a suite that names a path. It does not see a
suite that reads the bundle through `aof work update`, the CLI or a manifest walk, and for asset
documents that is the common case. ADR-003 rejected the text index for exactly this reason. A
coupling built from these counts would be confidently wrong for those suites, so every undeclared
document keeps widening. A coupling for these families needs a reader census that follows walks,
which is a later item.

**Three narrowed stories run what was selected (scenario 3).**
- `aof test --scope impacted --story 167/04`, run 2026-11-10 with an isolated `AOF_GLOBAL_HOME`:
  `13/1269 suites · scope impacted (story 167/04) · graph built 2026-11-09T23:01:03.157Z · no
  widening · resolved 5 graph-dependent · may not stand as a verdict · recorded (tree c91b4e0)`,
  in 3 min 28 s (the whole-tree run took 53 min). It selected 13, not the replay's 9. Its three
  created files are in today's graph, so they resolve as `graph-dependent` with their own
  dependents rather than as `suite-itself` or `imported-by-changed`. One case failed:
  `131/08 task00`, the pre-existing command-count red the whole-tree run also showed.
- **160/10 and 180/03 were not launched.** Both declare no created file, so today's selection
  equals the replay's: 1,119 suites each. Launching them is two near-whole-tree runs (~50 min
  each) that show nothing the selection comparison does not. This is an honest gap in the
  scenario's letter. It is left for the verify session to accept or to run.

**Native package tests are not runnable by this repo's per-file runner.** `node scripts/test-shard.mjs
packages/work/test/testing.test.mjs` answers `not ok - … exports no array of { name, run }
entries`. RESEARCH Q4 measured `*.suite.mjs` only. So the selector takes a suite only when it is
also a member of the whole suite the runner runs, and the census walk counts a workspace `test/`
directory's array suites only, as it already did for the `test` root.

## Verification evidence (aof:verify 190, 2026-11-10)

### The scoped suites (`@executable` + fitness functions)

Story-scoped, per the gate's rule. The whole tree runs once, at the milestone gate. Every run had an
isolated `AOF_GLOBAL_HOME` and used `aof test --scope file`.

- **The 190 lane, 21 suites.** These are every suite that names 190, its stories or its controls,
  plus the bundle and graph-impact suites 190 changed. Five failing cases: `160/05 The verify prose
  names the word` (F-01), `autonomous-shell-out/black-box` b01 (F-02), and three `yarn-installation`
  production cases (F-03). Every 190 case and FF-19001–FF-19006 passed. Summary:
  `21/1273 suites · scope file · … · recorded (tree e61694c)`.
- **The prose lane, 97 suites.** These are every suite that reads a command, template or variant
  190/03 rewrote (`verify.md`, `continue.md`, `review.md`, `add-uat.md`, `teach.md`, the UAT
  templates, `variants/codex/workflow.md`), plus `teach-frame` and `codex-ownership`.
  `global-work-propagation` was excluded, because the live control daemon holds `127.0.0.1:4182`.
  There were 11 failing cases, triaged under Findings: F-01, F-02, F-03, and two that are not 190's:
  - `arch/71 FF-7106` names 189/01's `STORY.md`, a refine record already red before 190 (STATE,
    190/00 build).
  - `bundle-asset-manifest-complete/00` lists `commands/map-tests.md` as on disk but untracked. 190
    is uncommitted, and the check clears when it is committed.
- **After F-01's fix, both lanes again (110 suites).** `160/05` is green. The 13 failing cases left
  are F-02, F-03 (10 cases in 6 suites), FF-7106 and the untracked-manifest case above, none a 190
  case. Summary: `110/1273 suites · scope file · … · recorded (tree 3ef7b23)`.

### 190/01 task 03 · scenario 3, completed (verifies → 190/01 task 03 "three narrowed stories run what was selected")

The build ran 167/04 and left 160/10 and 180/03 unlaunched. Verify answered them with 190/04's
`--plan`, which selects exactly as a launch would and runs nothing:

```
plan: 13/1273 suites · scope impacted (story 167/04) · graph built 2026-11-09T23:01:03.157Z · no widening · resolved 5 graph-dependent · may not stand as a verdict · nothing ran
plan: 1119/1273 suites · scope impacted (story 160/10) · graph built 2026-11-09T23:01:03.157Z · no widening · resolved 6 graph-dependent · may not stand as a verdict · nothing ran
plan: 1119/1273 suites · scope impacted (story 180/03) · graph built 2026-11-09T23:01:03.157Z · no widening · resolved 4 graph-dependent · may not stand as a verdict · nothing ran
```

160/10 and 180/03 select the replay's 1,119. 167/04 selects 13 rather than the replay's 9, for the
reason the build recorded (its created files are now in the graph). The whole suite is 1,273, not
1,269, because 190/04 added four suites. Scenario 2 (a census backs each declared coupling) holds
vacuously, since this repo declares no coupling. F-08 carries what the 1,119 means.

### 190/02 · the live resume check (verifies → 190/02 tasks 00 and 01)

An `aof-developer` agent ran this in an independent clone (its own `.git`), with the working tree
synced over it. The tree was reduced to 15 units (30 files and 296 cases, plus four new 35 s
suites so the budget would stop part-way). `global-work-propagation` was removed, and
`work.test.gate.budgetMinutes` was set to `1`. The clone's `REGRESSION.md` rows:

```
| a25e9130… | 2026-11-10T12:28:20.248Z | all | not-finished | not finished: test/slow/slow-b.test.mjs, test/slow/slow-c.test.mjs, 5 units not started · sharded --jobs 2 · 1.0 min |
| a25e9130… | 2026-11-10T12:29:22.353Z | all | green | resumed from 2026-11-10T12:28:20.248Z: 7 of 15 units re-run · sharded --jobs 8 · 0.6 min |
```

- **The resume ran only what was left.** It passed `--files` naming exactly the 17 files of the 7
  units left, all 11 files of the unstarted packed unit among them, plus `--no-lanes`, because the
  lanes had finished. It ran 173 cases, and 123 + 173 = 296.
- **A finished gate run answers a later `aof test --scope all` (task 01).** The answer was
  `1276/1276 suites · scope all · … · may stand as a verdict · answered from the run of
  2026-11-10T12:29:22.353Z (tree 97a71c4)`, with `--json` showing `launched: false`.
- **A changed tree refuses the resume.** One comment line was added to a suite and committed. The
  resume refused with `regression-gate-resume-tree-changed` (`from 372c33d…`, `now b48792f…`). No
  row was appended, no record written and nothing launched.
- **Other refusals:** a green newest row gave `regression-gate-nothing-to-resume`, and an untracked
  file gave `regression-gate-dirty-tree`.

PLAN.md's check needed two corrections, both in the plan and neither a product defect:
- **There is no `--budget-min` flag on `regression-gate`.** The budget is the tracked key
  `work.test.gate.budgetMinutes`, so a resume always runs under the stopped run's budget. Lifting
  the budget changes the content, which refuses the resume.
- **A `git commit --allow-empty` does not refuse a resume.** The key is the content, so the plan's
  step 3 needed a real change. As a side effect, a resumed row names the resuming commit.

The run found one defect, F-04.

### 190/04 task 04 · `/aof:map-tests` on real trees (verifies → 190/04 task 04)

An `aof-developer` agent followed `.claude/commands/aof/map-tests.md` in an independent clone
whose `work.test` block had been reset to `4ff7fba6`'s. Every `aof test` was `--plan`. The code
graph was the rsynced 2026-11-09 build, not a rebuild, because `memory.graph.share: "git-refs"`
would have published a ref to this repo. Two of the 30 replayed commits were the clone's own setup
commits, and both widen in both replays.

- **E14 · PARTIAL.**
  - The doctor before: `test-layout-suites` named 265 unselectable files, and `test-layout-couplings`
    and `test-layout-resume` both warned.
  - Before replay: `commits=30 widened=30 narrowed=0`.
  - The declaration written: the 16 registered `test/` roots, `[".test.mjs", ".suite.mjs"]`, three
    census-backed couplings (`wiki/work/**` → 674 suites, `wiki/planning/**` → 22,
    `LICENSE`/`SECURITY.md` → 7) and `reportArgs`/`filesArgs`. `aof project validate` passed, and
    nothing outside `work.test` changed.
  - After replay: `commits=30 widened=26 narrowed=4`. The narrowed counts were `[7, 675, 679, 1155]`,
    a median of 677 and a p75 of 798 (interpolated), of 1,273.
  - The doctor after: couplings `ok`, resume `ok`, **suites still `warning`** on 8 native `node:test`
    files in `packages/{effects,server,contracts,messaging}/test` that the runner never registers
    (F-05).
  - Caveat: the `wiki/work/**` coupling is a literal census plus the whole-tree readers. 190/01
    declined to declare one for exactly that reason. Without the two `wiki/*` couplings, only one
    commit narrows.
- **E16 · not triggered.** The after median is 53% of the total, not within 10%, so the Then does
  not apply. One commit is near-total on its own (f96cb41e, 1155/1273). That is F-08's composition
  root (`packages/core/src/application/default.mjs`, imported directly by 657 suites).
- **E19 · PASS.** The config hash was `21b291bf…` before and after `--dry-run`, with the same
  mtime and size and an empty `git status`. The proposed diff was identical to E14's.
- **E15 · PASS for its letter.**
  - Setup: a scratch `vitest-shop` project with gate `npx vitest run --shard=1/1`.
  - The written declaration has no `reportArgs` or `filesArgs`, and the report says "resume:
    unavailable for this runner" and names the contract.
  - Doctor: `test-layout-resume` stays `warning`, while suites and couplings went `ok`.
  - **But `aof test --scope all --plan` answers `0/0 suites`.** The doctor's `ok` and the selector
    disagree (F-06).

The run found F-05, F-06 and F-07.

### 190/04 · after the rework (verifies → 190/04 tasks 04 and 05, 2026-11-10)

- **Task 05 (`@bug` F-05, F-06, F-07).** E1, E2 and E3, plus a case for the exclusion and its
  refusal, are green in `test/testing/test-layout-check.test.mjs` and
  `test/work/lifecycle/map-tests-command.test.mjs`.
  - The 206-suite `--scope file` lane ran over every suite that reads the changed modules, plus
    the earlier 110. Its reds are F-02, F-03 (now also `distribution-workspaces` ×2, the
    `workspace-boundaries` plant probe and `this-tree-holds-what-is-live` 00, all `/var` against
    `/private/var`), FF-7106 and FF-9603 (189's records), and FF-5301 (red before 190, 190/00
    STATE). None is a 190 case.
  - The native `packages/work/test` files pass 19/19 under `node --test`.
- **E15, re-checked** in the same `vitest-shop` project:
  - `aof test --scope all --plan` gives `2/2 suites` (it was `0/0`), and `test-layout-suites` is
    `ok`.
  - `test-layout-resume` stays a `warning`, with no `reportArgs` or `filesArgs` written.
  - Each of the 6 commits widens on `no-graph`, honestly: the project has no code graph.
- **E14, re-checked** in the same clone. The agent's mapped declaration was applied, plus what the
  skill now authors: `exclude` for `packages/*/test/**/*.test.mjs` and `apps/*/test/**/*.test.mjs`,
  with its reason, and `noLanesArgs`. `aof project validate` passed.
  - The doctor answers: `ok: test-layout-suites`, `ok: test-layout-couplings - … declares 3
    couplings` and `ok: test-layout-resume`.
  - The whole suite is unchanged at `1273/1273`, because no member matches the exclusion. So the
    before and after replays recorded above stand: 30/30 widened before, 26/30 after, median 677
    and p75 798 of 1,273.
  - The clone's config was restored afterwards.
- **This repo**, with its own declaration, which now carries the same exclusion: `test-layout-suites`
  is `ok` and `test-layout-resume` is `ok`. `test-layout-couplings` stays a `warning`, because
  190/01 deliberately declared no coupling. That is the "keep widening has no `ok` spelling" item
  the operator holds (STATE, 190/04 review close).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `160/05 The verify prose names the word` (`test/run/regression-gate.test.mjs:1133`) went red. 190/03 rewrote `verify.md`'s `not-finished` paragraph to name `--resume` first, and the reflow split "re-run the gate, or to speed the run up" across a line break, which 160/05 reads as one line. 03's scoped lane never selected 160's case. A distinct incident: recall returned m96/F-96-B (a bundle control red on that milestone's own prose, a different control and cause; departed). | regression | blocker | New `@bug` task 190/03 tasks/02. 03 returned to `in-progress`. | fixed at verify: the paragraph reflowed with the phrase on one line, the manifest regenerated, `aof work update` re-rendered 2 files (0 drift, host config unchanged), and `160/05` is green in the 110-suite re-run | closed |
| F-02 | `autonomous-shell-out/black-box` b01: "the real provider path received a phase directive" fails. Reproduced outside the suite, the fixture's `scheduleToCloseMs: 1` halts the drive (`deadline-exhausted`, `elapsedMs=681`) before the PTY launch types to the shim. 190 changed no loop, session or PTY file. Recurrence of m172/F-172-14, same cause and evidence. | environment | medium | non-blocker for 190. Reds the whole-tree gate on this Mac. | m172/F-172-14 (its owner) | open |
| F-03 | Ten cases compare a `/var/folders/…` tmpdir with its `/private/var/…` realpath and go red: `yarn-installation` production ×3, `loops-commands` 00 and 03, `archive-is-a-move` 00, `promote-mints-the-number` 00 and 139/00, and `codex-ownership` 156 ×2 ("… is a main working tree"). No file involved is a 190 change. Recurrence of m172/F-172-11, same cause. | environment | medium | non-blocker for 190. Reds the whole-tree gate on this Mac. | m172/F-172-11 (its owner) | open |
| F-04 | A resumed gate run overwrites `.tmp/test-timings.json` with only the files it ran (about 1,270 entries became 17), and does the same to the main checkout's copy (`scripts/test-sharded.mjs`, the `perFile` write over `[timingsPath, mainTimingsPath]`). The next whole-tree gate loses its longest-first packing. `--shard` already wrote this way, and 190/02's `--files` resume hits it on every resume. Distinct: recall returned m160/F-06 (packing from a quieter run's timings, a different cause; departed). | defect | medium | non-blocker: costs speed, never correctness. A `--files`/`--shard` run should merge its timings into the stored set. | backlog | open |
| F-05 | `test-layout-suites` cannot reach `ok` on this repo. It counts 8 native `node:test` files under `packages/{effects,server,contracts,messaging}/test` that `scripts/test.mjs` never registers, and its repair ("Declare them with /aof:map-tests") is one the skill must refuse. Declaring them turns the check `ok` but makes 8 files selectable that the per-file runner rejects ("exports no array"). It fails 190/04 E14 and PLAN.md's "all ok". Distinct: recall returned no finding on this check. | defect | blocker | New `@bug` task 190/04 tasks/05. 04 returned to `in-progress`. The architect amends ADR-008 §1 first: how the check knows what the runner can run without a second predicate (FF-19006). | `aof:continue 190/04`: ADR-008 §7 adds `work.test.exclude`, decided through `select.mjs` alone. This repo excludes its 64 native `node:test` files, and the suites check is `ok` (190/04 re-check below) | closed |
| F-06 | Declared `suiteSuffixes` do not define the whole suite. `walkSuiteFiles` (`packages/work/src/audit/census.mjs:444`) collects only `.test.mjs`/`.suite.mjs`, so a project declaring `.test.ts` gets `aof test --scope all --plan` = `0/0 suites`, while `test-layout-suites` says `ok`. The doctor and the selector answer "what is a suite" differently, and 190's adoption path tells a non-`.mjs` project it is done when it can never narrow. Distinct: recall returned m161/F-02 and m72/F-72-X (registration and census controls, different defects; irrelevant). | defect | blocker | Same `@bug` task as F-05: one answer to "what is the whole suite". | `aof:continue 190/04`: ADR-008 §6 makes the whole suite honour declared suffixes, and §8 makes an empty whole suite a warning. The `.test.ts` project now plans `2/2` (190/04 re-check below) | closed |
| F-07 | `/aof:map-tests` never authors `work.test.gate.noLanesArgs`, so a mapped project's resume re-runs integration and cargo lanes that had finished. This repo's hand declaration has `["--no-lanes"]`. | defect | low | non-blocker. Folded into 190/04's `@bug` task while 04 is open. | `aof:continue 190/04`: `map-tests.md` and its Codex variant declare `noLanesArgs` when the gate program takes the flag (task 05 E3) | closed |
| F-08 | The SPEC's outcome "a story that only adds a new test file and edits one source file runs an impacted set, not the whole tree" holds only for leaf changes. Any source module's transitive dependents reach the composition root (`packages/core/src/application/default.mjs`), so a narrowed run selects 1,119 of 1,273 (190/01 task 03; f96cb41e at 1,155 in 04's replay). ADR-004 §3's revisit trigger ("if 190's verification shows narrowed story runs still slow") is met, and ADR-004 itself is still marked pending the operator's confirmation. Related to m72/F-72-AN (a widened run that is a whole run; departed: there the run widened, here it narrows in name only). | spec-gap | high | non-blocker, taken by the operator (2026-11-10): "get 190 completed" accepts the milestone with this open as a Gap. ADR-004 stands as written, and §3's revisit is the follow-up | backlog (story shape: stop the transitive walk at the composition root with an import smoke test, or ADR-004 §3's cost-based split) | open |

## Accept decision (aof:verify 190, 2026-11-10)

`aof work validate 190` passes. `aof work doctor 190` reports no error and no `control-unresolved`
at either severity: all six controls resolve, and each has a red probe.

- **190/00, 190/01, 190/02: accepted** (`in-review` → `done`). Their scenarios and controls are
  green, and 01's `@manual` and 02's live check are recorded above. No blocker routes to them.
  F-04 (02's resume clobbers timings) is a non-blocker for the backlog. F-08 is a milestone-level
  gap that 01 delivered to its ADR.
- **190/03: declined, then accepted.** The blocker was F-01. It went to `in-progress` with `@bug`
  task 02, was fixed at this verify (a reflow, re-rendered with 0 drift) and proved green in the
  110-suite re-run, then moved to `done`. It skipped a separate review round, because the fix is a
  two-line reflow that the control it broke now proves.
- **190/04: declined.** F-05 and F-06 are blockers, and F-07 is folded in. It is back to
  `in-progress` with `@bug` task 05. The architect amends ADR-008 §1 first, then `aof:continue
  190/04`. Task 04 is left unticked until E14 holds.
- **Milestone 190: not accepted.** Three things are missing:
  1. **Story 04 is open.**
  2. **No regression gate.** `aof work regression-gate 190` needs a clean checkout, and 190's
     work is uncommitted. The working tree also carries work that is not 190's: 188/F-14's
     `teach.md` voice rewrite, and an unowned `codex-ownership` case. A whole-tree run here meets the
     live control daemon on `127.0.0.1:4182`, plus F-02 and F-03, which are red on this Mac only.
  3. **F-08 and ADR-004 await the operator.**

## Regression gate (the milestone, 2026-11-10)

`aof work regression-gate 190` ran unchanged on a clean `ubuntu-latest` checkout through
`.github/workflows/gate.yml` (160/ADR-014 §6), started by pushing `gate/190` at `4a006d7b`, run
`42837319031`. This Mac cannot host the whole tree: the live control daemon holds `:4182`, and
F-02 and F-03 are red here only. The row was brought home unchanged from the run's artifact into
`REGRESSION.md`:

```
| 4a006d7bfa17a011e276f65346ddae84264e1d95 | 2026-11-10T15:07:18.127Z | all | green | sharded · 15.7 min |
```

PR #25's `test` workflow (8 shards and the budget judge) is green on the same commit, run
`42837305847`, and so is CodeQL. On the way, PR #25's earlier red run named six controls:
- one is 190's: FF-11901, fixed at `1facd256`;
- five were red on this branch before 190, at `4ff7fba6`: FF-5301, 131/08 task00, FF-9603 ×2 and
  FF-7106. Each was cleared at `434e01bb` with its reason;
- code-scanning alert 147 (polynomial ReDoS in `recordStatus`) was fixed at `4a006d7b`.

## Milestone accept decision (2026-11-10)

**Accepted.** All five stories are `done`. `aof work validate 190` passes, `aof work doctor 190`
reports no error and no `control-unresolved` at either severity, and the regression gate's newest
row is green at `4a006d7b`. No blocker finding is open:
- F-01, F-05, F-06 and F-07 are closed;
- F-02 and F-03 stay with their m172 owners;
- F-04 and F-08 are non-blockers in the backlog, and F-08 is the milestone's open Gap in
  `OUTCOME.md`.

