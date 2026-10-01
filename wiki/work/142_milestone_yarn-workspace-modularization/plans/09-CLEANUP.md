# Plan 09 — cleanup and verify: what was done, measured

Executed 2026-10-01 on `refactor/yarn-workspace-modularization`, after the independent review
([09-REVIEW](09-REVIEW.md)) withheld signoff at `dd8b610e`. Plan: [09-cleanup-and-verify-PLAN](09-cleanup-and-verify-PLAN.md).
Evidence for every test move is the tracked [09-test-ledger.json](09-test-ledger.json).

## The review's findings, and where each stands

| Finding | Result |
| --- | --- |
| 1. No test-ownership cleanup | **Done in part, by measurement.** 69 of 1,106 root suites moved to the workspace that proves them; the ledger classifies all 1,106. The rest stay with a stated reason each (below). `apps/ui/test/` exists with a `test` script. |
| 2. Whole-tree gate not green | See [Final gate](#final-gate). The wiki link floor is repaired; two of the other three ratchets are operator decisions (below). |
| 3. Completion evidence not reconciled | The index's stale "already implemented" paragraph, the plan table, the completion audit and the checklist are updated. |
| 4. `UPGRADE-CHANGELOG.md` deleted | Restored byte-identical from `2cd5d915` (`447854a9`); `work-upgrade-changelog` is 9/9 again. |

The review also asked whether the 2,176 → 1,413 link drop was real. It was: 787 links into retired `ui/` and `app/desktop/`
and 270 more into retired `src/` paths (links whose destination no longer exists anywhere — 210 into `ui/`, plus older `src/` citations — were left). All 1,057 rewritten destinations exist at their new homes; only the link targets were rewritten
(`339e90b1`, `66da1555`). Resolving links went 1,414 → 2,471 against the 2,317 floor; no floor was touched.

## Test placement

| Home | Suites moved | Runs through |
| --- | ---: | --- |
| `apps/ui/test` | 33 (+18 harness files in `apps/ui/test/support`) | `@aof/ui` — 776 cases |
| `packages/core/test` | 24 | `aof` — 214 cases |
| `packages/work-loop/test` | 6 (+ story fixtures) | `@aof/work-loop` — 42 cases (it owned none) |
| `packages/work/test` | 4 (+ pre-Examples parser helper) | `@aof/work` — 150 cases |
| `packages/knowledge/test`, `packages/work-graph/test` | 1 each | their packages |

Every move preserved test names: the registered case-name multiset is **11,537 with no duplicates, identical before and
after each batch** (compared with `scripts/test.mjs`'s own assembled `tests` array). The ledger's own names agree with the
registry (none missing, none over-registered).

### What stays at the root, and why

Root `test/` is the integration home, so its subject folders name what they integrate: `test/ui` was renamed **`test/surfaces`**
(41 suites — the board, fleet, shell and terminal faces mounted against the real server, mesh and assembled application;
they cannot live in `apps/ui` because an app may not import the assembled core). Names identical before and after.


| Suites | Reason |
| ---: | --- |
| 482 | Repository-wide architecture guards (`test/arch`, by the placement rule). |
| 505 | Drive the assembled application. These are **not** a mechanical move: package modules are factories (for example
`createMeshPresence` in `@aof/mesh/presence`) that `packages/core/src/application/assemble.mjs` wires with explicit collaborators from
`bindings/`. Moving a suite means rebuilding its collaborator graph by hand. The ledger records the namespaces each touches
(189 touch exactly one and spawn nothing, mostly `work`, `mesh`, `assets`, `knowledge`, `execution`). Measured by **object identity**, not name: of the 2,407 `const x = _aofApplication…;`
accessors in 468 such suites, only **3** are the very object a feature package exports; **2,187** are closures that exist only once
core has assembled them (200 are primitives). One suite reaches nothing but package exports, and it still mounts an assembled fixture
helper. So no suite in this group moves by swapping imports; each would need its collaborator graph built by hand. Whether to do
that is an **operator decision**; nothing here pretends it is done. |
| 14 / 11 / 5 | Spawn the CLI / exercise `scripts/` / repo-level fixtures. |
| 15 | Read a repository artifact no workspace owns (`schemas/`, live wiki, hooks, tracked renders), import an arch guard, or use the
repo-wide `source-slice` helper (imported by 226 suites) — each named in the ledger. |

## Readers updated with the moves

`scripts/test.mjs` (registration), `scripts/test-unit.mjs`, `scripts/workspace-boundaries.mjs` (a root `dependencies` entry now
declares a test owner), `scripts/workspace-runtime-audit.json` (source digest of `scripts/test.mjs`, expressions unchanged), the
`apps/ui` freeze (see below), `test/arch/testing/acd-source-directory-budget.test.mjs` (shrunk ceilings lowered, owned rows
added, two support layers exempted), FF-5311's registration-row pattern, root `package.json` + `yarn.lock` (`@aof/ui` declared as a
test owner; Yarn regenerates the identical lock). No floor was lowered to make a move pass.

**`apps/ui` freeze.** Not re-pinned. The digest excludes `apps/ui/test/` and normalizes the one added `test` script line, so
the pinned digest is the one pinned before any test moved in; every `apps/ui/src` file and the manifest are still hashed.

**FF-5311 residue.** The one re-pin: owned-workspace test indexes (`../packages/<n>/test/…`, `../apps/<n>/test/…`) are
registration rows like `../test/…` ones. Measured: the residue loses exactly those seven import lines and no logic line.

## Sweep for the retired layout

Active code, scripts, workflows and docs contain no live use of root `src/`, `ui/src`, `app/desktop` or root `bin/`. What remains
is deliberate or frozen: comments naming the installed `ui/dist` layout (Plan 05 kept it); `scripts/build-sea.mjs` accepting a legacy
root `bin/aof.mjs` as a build input (left, not changed); stale test-path citations inside `apps/ui/src` comments (editing them would
break the freeze pin). `.gitignore` entries all match existing paths; no leftover worktree; the global `node_modules/aof` junction
targets `packages/core`. Two TECH_DEBT entries gained a path note (item 83, item 36); none was discharged and none opened.

**Per-package hygiene** (static scan of every workspace's manifest against every tracked importer): no feature package declares a
dependency it does not import. `@aof/ui` declared four nothing imports (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`,
`tunnel-rat`); they are removed, Yarn's lockfile-only update drops them and four transitive packages, and the supply-chain audit
passes. Six export subpaths have no code consumer (`@aof/knowledge/commands/shared`, `@aof/mesh/terminal-resume-refusal`,
`@aof/work/doctor/freshness`, `@aof/work/doctor/identity`, `@aof/work/promote/chore-seed`, `@aof/work-graph/shapes`), but they are
**kept**: removing them was tried and FF-11903 went 55 → 61, because the citation sweep resolves historical `src/…` citations
through those exports. They are load-bearing for the record, not dead. `aof/asset-base` stays (a documented public seam). One empty, untracked leftover directory (`packages/core/src/notify/`) was removed.
The `apps/ui` freeze was re-pinned once for the manifest change, with the previous digest reproduced from the previous manifest.

**Duplicated helpers.** A scan for function bodies identical after comment/whitespace normalisation (≥120 characters) finds 17
across files — all 17 already existed at the pre-142 baseline, which had 19 (the migration removed two and created none). Five pure
within-package pairs now have one home, the copy deleted and the kept definition imported: `intervalTicker`,
`readPresentedCredential`, `frameByteLength`, `routingKey` (mesh) and `findSection` (work). Three more were consolidated and then
**reverted because a guard forbids the edge**: `deepFreeze` (FF-6304/2: the trigger level leaf imports only the gate home) and
`compareEdges`/`nodeKeys` (FF-7805: the record renderer's bytes are composed in one place). Left on purpose: `isRevokedLocal`, whose
comment records the copy as a boundary decision (the control stream must not pull in the registry's credential surface); the cross-package pairs (`isoInstant`, `renameWithRetry`, `settleExecFile`, `sendMethodNotAllowed`, core's
`readConfig`/`defaultWhich`), each a new dependency edge or a digest-pinned file; and `defaultPushExec`/`defaultCloneExec`, two
named seams.

One latent defect surfaced and was fixed: `test/work/lifecycle/work-observe.test.mjs` (a known unregistered native test the gate never
runs) had a fixture expectation rewritten by the core move to a path its own input never produced, so it failed 1 of 21 when run directly.

## Open for the operator

1. The 505 assembled-application suites (above): rewrite per subject, or keep as the assembled-application integration home.
2. Three remaining `work/this-tree-holds-what-is-live` ratchets, with exact causes: **142 has no `SPEC.md`** (validate: "missing or
   empty record doc"); **backlog story `a-running-loop-is-visible-in-the-ui` declares neither `reads` nor `files`**; **story 141 is
   `done` and still at the wiki root** (needs archival). The fourth, the link floor, is fixed.
3. The platform legs listed in [08-VERIFICATION](08-VERIFICATION.md) stay open; nothing here changes them.

## Final gate

Run from clean detached worktrees (`git worktree add --detach`, `prepare-worktree.mjs`, `ui-build.mjs`, isolated
`AOF_GLOBAL_HOME`), on Windows x64, 2026-10-01.

**The whole tree now signs off in about 24 minutes, not ~1¾ hours.** The serial runner was stopped at 6,707 of 11,537 cases
after ~55 minutes (one failure, the site-build fixture below, since fixed). `scripts/test-sharded.mjs` (`yarn test:sharded`) runs
the same registry across 16 worker processes: every registered case is mapped to its file by identity before anything runs
(a run that cannot account for a case refuses to start), each unit runs through the runner's own `runCases` with an isolated
home, units go longest-first from recorded timings and slow files split into case chunks, a failed unit is retried once
alone, and the integration and cargo lanes run once through `scripts/test.mjs --lanes-only`. FF-5311's residue was re-pinned
for it with the measured diff.

| Run | Cases | Wall | Result |
| --- | --- | --- | --- |
| Sharded #1 at `8478cc07` | 11,525 of 11,537 (12 lost to an import ring, now fixed) | 23.6 min | 5 real failures — all fixed in `681567f2`: the shard's import ring, two helper consolidations that broke FF-6304/2 and FF-7805, six exports FF-11903 needs, 12 archive links (54 > 52 in a clean tree) — plus the known ratchets; 4 load flakes |
| Sharded #2 at `681567f2` | **11,537 of 11,537** | 23.8 min | Only the three operator ratchets and one unaudited import (fixed in `36988e87`, re-run green); 4 load flakes green alone, two of them a Windows `EBUSY` temp cleanup now retried in every fixture (`36988e87`) |
| Workspace suites | 14 workspaces, 1,344 registered + 248 native | — | all green in isolation |
| Integration + cargo lanes | inside the sharded runs | — | green |
| UI build / supply-chain audit | — | — | pass / 0 warnings |
| Windows distribution (`build-sea` → `stage-release-assets` → `verify-distribution`) | 8 checks | — | all pass, including the real SEA PTY round-trip and the built UI |

Where the time goes (summed across workers, from `.tmp/test-timings.json`): 341 minutes in total. The process-spawning tail
dominates (`loop-command-wave`, `loop-command-reconcile`, `work-dispatch-lanes`, the gate-propagation suites), and under 16-way
load each of their cases runs several times slower than alone. The 643 files under 5 s sum to 25 minutes, so per-process start-up
is not the limit. Further gains are in those suites themselves (the backlog story `the-whole-tree-run-signs-off-in-minutes`
names them), not in more workers. Linux/WSL, macOS and the hosted CI matrix remain open, as recorded in 08-VERIFICATION.
