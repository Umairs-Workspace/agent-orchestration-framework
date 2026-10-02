# Plan 09 — cleanup and verify: what was done, measured

Executed 2026-10-01 on `refactor/yarn-workspace-modularization`, after the independent review
([09-REVIEW](09-REVIEW.md)) withheld signoff at `dd8b610e`. Plan: [09-cleanup-and-verify-PLAN](09-cleanup-and-verify-PLAN.md).
Evidence for every test move is the tracked [09-test-ledger.json](09-test-ledger.json).

## The review's findings, and where each stands

| Finding | Result |
| --- | --- |
| 1. No test-ownership cleanup | **Done in part, by measurement.** 99 of 1,106 root suites moved to the workspace that proves them; the ledger records all 1,106, and every retained assembled-application suite now carries its own measured subject (see [Test placement](#test-placement)). 73 suites that execute one feature package, or only core, remain at the root and are listed in the ledger as open. `apps/ui/test/` exists with a `test` script. |
| 2. Whole-tree gate not green | See [Final gate](#final-gate). The wiki link floor is repaired; two of the other three ratchets are operator decisions (below). |
| 3. Completion evidence not reconciled | The index's stale "already implemented" paragraph, the plan table, the completion audit and the checklist are updated. |
| 4. `UPGRADE-CHANGELOG.md` deleted | Restored byte-identical from `2cd5d915` (`447854a9`); `work-upgrade-changelog` is 9/9 again. |

The review also asked whether the 2,176 → 1,413 link drop was real. It was: 787 links into retired `ui/` and `app/desktop/`
and 270 more into retired `src/` paths (links whose destination no longer exists anywhere — 210 into `ui/`, plus older `src/` citations — were left). All 1,057 rewritten destinations exist at their new homes; only the link targets were rewritten
(`339e90b1`, `66da1555`). Resolving links went 1,414 → 2,471 against the 2,317 floor; no floor was touched.

## The second review's findings (`d48bf751`), and where each stands

| Finding | Result |
| --- | --- |
| P09-R2-01 sharding splits dependent cases | **Fixed.** `scripts/test-sharded.mjs` treats a suite file as atomic: one process, cases in order. A file is chunked only when it declares `export const independentCases = true` (and then only once it exceeds `--split-seconds`). `--plan` prints the units and the heaviest files without running anything. Seven heavy files are marked, each after all 286 of their cases passed alone in fresh processes (`loop-command-wave`, `loop-command-reconcile`, `work-dispatch-lanes`, `gate-propagation-refusals-leave-branch`, `loop-cap-exhaustion-carries-the-record`, `blocked-run-parking`, `lane-is-local-slot`). The live-tree suite is not marked, so `work-this-tree-holds-what-is-live` can no longer be cut between its promote setup and its promote case. |
| P09-R2-02 ledger is invalid JSON | **Fixed.** The 40 stray quotes from the `test/ui` → `test/surfaces` rename are gone; the ledger parses, all 1,106 `now` paths exist on disk and are unique. |
| P09-R2-03 convenience-assembled suites kept at root | **Done in part; the rest is classified, not moved.** The cited `scope-flags-fields-agree` is owned by `@aof/knowledge` (fail-on-use backend loaders; case name unchanged). Beyond it, 29 more suites moved (99 in all; case-name hashes identical to the ledger's for every one): 7 mesh suites built from `@aof/mesh` factories through `packages/mesh/test/support/mesh-services.mjs`; 8 `@aof/execution` suites (the rasterizer, the terminal-session registry and six run-store suites); 2 notion mapping suites; and 12 core-owned suites for the `assets` namespace (DSL, config inspection and editing, work init), which is core's own logic rather than a feature package's. The other retained suites were each run alone under V8 coverage against an assembly-only baseline: **91 execute two or more feature packages** (genuine integration), **303 drive a command, server or UI surface** through the assembled dispatcher, and **73 execute one feature package or only core** and are therefore package-owned in principle (open, named per entry). The static assembly-graph walk this plan first used over-counted packages (the shared `work` service takes collaborators from every package) and is not evidence. |

## Test placement

The 2026-10-02 [recheck](09-REVIEW.md#recheck-and-fixes--2026-10-02) verified the concrete fixes and
added two registered regression cases. The current registry therefore has **11,539 cases**; the
11,537-case figures below describe the preserved migration baseline and historical gate runs.

| Home | Suites moved | Runs through |
| --- | ---: | --- |
| `apps/ui/test` | 33 (+18 harness files in `apps/ui/test/support`) | `@aof/ui` — 776 cases |
| `packages/core/test` | 36 (24 by source import, 12 for the `assets` namespace through `support/assets-services.mjs`) | `aof` — 343 cases |
| `packages/work-loop/test` | 6 (+ story fixtures) | `@aof/work-loop` — 42 cases (it owned none) |
| `packages/work/test` | 4 (+ pre-Examples parser helper) | `@aof/work` — 150 cases |
| `packages/knowledge/test`, `packages/work-graph/test` | 2 / 1 | their packages; knowledge now runs 44 registered + 7 native cases |
| `packages/execution/test` | 8 (+ `support/run-store.mjs`) | `@aof/execution` — 93 cases |
| `packages/mesh/test` | 7 (+ `support/mesh-services.mjs`) | `@aof/mesh` — 62 cases |
| `packages/integration-notion/test` | 2 | `@aof/integration-notion` — 21 cases |

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
| 303 | Drive a registered command, server or UI surface through the assembled application; the dispatcher and the command bindings are part of what the suite proves (each entry names the commands or surfaces). |
| 91 | **Measured cross-package integration:** each executes functions in two or more feature packages beyond what assembling the application runs (V8 coverage, assembly-only baseline subtracted); each entry lists the packages and function counts. |
| 73 | **Open — package-owned in principle:** each executes exactly one feature package (71) or only core (2). They stay because their subject is built from collaborators core supplies (mesh presence and the control stream, the work service core composes over its path policy, fs and digest template, shared root fixtures) and the package-level rebuild is not done. Each entry names its subject and what it would need. This is the unfinished part of Plan 09's ownership requirement. |
| 14 / 11 / 5 | Spawn the CLI / exercise `scripts/` / repo-level fixtures. |
| 15 | Read a repository artifact no workspace owns (`schemas/`, live wiki, hooks, tracked renders), import an arch guard, or use the
repo-wide `source-slice` helper (imported by 226 suites) — each named in the ledger. |

Method for the measurement: `NODE_V8_COVERAGE` with precise function counts, one suite per process, an isolated `AOF_GLOBAL_HOME`, three baseline runs of importing `aof/default-application` (maximum count per function), and a function counts as executed by the suite when its call count exceeds the baseline. Two suites failed under coverage (spawn-deadline and census cases that depend on wall-clock timing); their entries say the measurement is partial.

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

## Work-stream dispositions and what stays open

The four `work/this-tree-holds-what-is-live` ratchets, each with its disposition. No test, floor or threshold was changed.

| Ratchet | Disposition |
| --- | --- |
| Backlog story `a-running-loop-is-visible-in-the-ui` declared neither `reads` nor `files` | **Resolved.** Its context contract now names the current locations of the code its Notes describe (`packages/mesh/src/launcher.mjs`, `packages/mesh/src/terminal-relay-bridge.mjs`, `packages/work-loop/src/child-drive.mjs`, `packages/work-loop/src/progress.mjs`, `apps/ui/src/home/feed-axis.mjs`, `apps/ui/src/fleet/Fleet.tsx`); the stale pre-migration paths inside its prose are left as written. `aof work validate` no longer reports it. |
| Story 141 was `done` and still at the wiki root | **Resolved.** Archived with `aof work archive 141` (0 links rewritten). It was a merged story from before this migration (#4), not something 142 caused. |
| Wiki link floor | **Resolved earlier** (above). |
| **142 has no record doc** (`aof work validate`: "missing or empty record doc (SPEC.md)") | **Accepted, not resolved.** 142's `SPEC.md` opens by stating this work proceeds outside the AOF workflow, so it carries no record-doc frontmatter. Making it valid means either adding lifecycle frontmatter, which contradicts that statement, or authoring an `AOF.md` digest, which carries `imported: true` provenance this folder does not have. Neither is an agent decision. The ratchet stays red for this one reason until the operator picks one or archives 142. |

## Open

1. **73 suites that execute one feature package, or only core, remain at the root** ([Test placement](#test-placement)). Each is named in the ledger with its subject and what a package-level construction would need. Plan 09's ownership requirement is **not complete** while they remain.
2. The platform legs listed in [08-VERIFICATION](08-VERIFICATION.md) stay open; nothing here changes them.

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
| Sharded #3 at `fb9e8f4b` (after the `test/surfaces` rename) | 11,537 (the report then miscounted retried units) | 38.0 min | Only the ratchets — but it ran without timings (fresh worktree) and two units burned 20-min kills: the slow file ran unsplit, and a transcript case hung on a real-time race outside its own 30 s ceiling. Both fixed in `d48bf751` |
| **Sharded #4 at `d48bf751` — the confirming run** | **11,537 of 11,537** | **23.1 min** | **Only the three operator ratchets.** Four timing-sensitive cases red under 16-way load, green alone (named in the run's SUMMARY.txt) |
| **Sharded #5 at `e7addd1e` - the tested commit for the second-review fixes** | **11,539 of 11,539** | **33.9 min** | Only the accepted 142 record-doc finding (cases 00 and 02 of the live-tree suite; case 01, the link floor, passes). `fleet-terminal-view-producer-fed` (a real-session case) failed in the pool and on its alone-retry, then passed 2 of 3 unloaded runs (the failing case differed between runs: an intermittent real-PTY race; the file is unchanged since the rename). Four load flakes green alone. |
| Workspace suites | 14 workspaces, 1,594 cases at `e7addd1e` (execution 93, mesh 62, core 343, notion 21, knowledge 44, work 150, work-loop 42, work-graph 63, ui 776) | — | all green in isolation, from the clean worktree |
| Integration + cargo lanes | inside the sharded runs | — | green (`cargo test` and `cargo check` of `apps/desktop` pass at `e7addd1e`) |
| UI build / supply-chain audit / workspace boundaries | — | — | pass / 0 warnings / 0 findings (at `e7addd1e`) |
| Windows distribution (`build-sea` → `stage-release-assets` → `verify-distribution`) | 8 checks | — | all pass at `e7addd1e` (fresh SEA build), including the real SEA PTY round-trip and the built UI |

The wall time rose from 23.1 to 33.9 minutes at `e7addd1e`: suites are now atomic by default (P09-R2-01), so the heaviest unmarked files run as one unit each (`acd-tune-is-non-vacuous-over-this-repo` 451 s and `work-this-tree-holds-what-is-live` 426 s summed under load) and only the seven marked files still split. That is the price of not cutting a suite between a case and its setup; marking more files `independentCases`, after the same alone-run evidence, is the way back.

Where the time goes (summed across workers, from `.tmp/test-timings.json`): 341 minutes in total. The process-spawning tail
dominates (`loop-command-wave`, `loop-command-reconcile`, `work-dispatch-lanes`, the gate-propagation suites), and under 16-way
load each of their cases runs several times slower than alone. The 643 files under 5 s sum to 25 minutes, so per-process start-up
is not the limit. Further gains are in those suites themselves (the backlog story `the-whole-tree-run-signs-off-in-minutes`
names them), not in more workers. Linux/WSL, macOS and the hosted CI matrix remain open, as recorded in 08-VERIFICATION.
