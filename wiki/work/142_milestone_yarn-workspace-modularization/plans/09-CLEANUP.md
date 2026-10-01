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
across files — all 17 already existed at the pre-142 baseline, which had 19 (the migration removed two and created none). The eight
within-package pairs that are pure now have one home, the copy deleted and the kept definition imported: `deepFreeze` (work-loop
trigger), `compareEdges` + `nodeKeys` (work-graph, which also retires loops-graph's now-dead `compareCodeUnits`/`baseNodeKey`),
`intervalTicker`, `readPresentedCredential`, `frameByteLength`, `routingKey` (mesh) and `findSection` (work). Left on purpose:
`isRevokedLocal`, whose comment records the copy as a boundary decision (the control stream must not pull in the registry's
credential surface); the cross-package pairs (`isoInstant`, `renameWithRetry`, `settleExecFile`, `sendMethodNotAllowed`, core's
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

(Recorded below after the clean-worktree run.)
