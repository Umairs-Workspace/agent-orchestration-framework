# Plan 09 — Cleanup and verify

Status: complete on this host 2026-10-02, gated at `5035a225` ([09-REVIEW](09-REVIEW.md#final-gate--5035a225-2026-10-02)); executed 2026-10-01 — `[~]` marks work done in part, the rest recorded as an operator decision; see [09-CLEANUP](09-CLEANUP.md) for the record and [09-test-ledger.json](09-test-ledger.json) for the evidence. The final pass, after [Plan 08](08-final-verification-PLAN.md). Requested by the operator
2026-10-01: double-check the refactor, and put every test where it belongs — the root `test/` folder is for
cross-package integration only.

Independent review 2026-10-01: **signoff withheld** at `dd8b610e`; see
[findings and fresh verification](09-REVIEW.md). Each finding's resolution is in [09-CLEANUP](09-CLEANUP.md).

Rechecked 2026-10-02: the shard and ledger defects are fixed and covered by regression checks;
the cited knowledge test is moved. The broader ownership finding remains open. The registry now
holds 11,539 cases: the preserved 11,537 plus two named review checks (see [review](09-REVIEW.md#recheck-and-fixes--2026-10-02)).

## Objective

Leave the tree with nothing transitional in it and every test owned by the workspace it proves. A package's
behaviour should be testable with `yarn workspace <name> test`, without the assembled application, and a
root test should exist only because it needs more than one workspace at once.

## Test placement rule

| Home | Holds | Runs through |
| --- | --- | --- |
| `packages/<name>/test/` | Tests of one package through its public exports or its own source, with stubs/fixtures for other packages' ports | the package's own test entry (the existing suite-registration pattern) |
| `apps/ui/test/` | UI-only logic and rendering (no Node services, servers or core) | `@aof/ui`'s test entry |
| `apps/desktop` (Cargo) | Rust core and shell tests | `cargo test` / `cargo check`, as today |
| root `test/` | Cross-package integration: the assembled application, CLI child processes, real servers + built UI, installer/distribution, and repository-wide architecture guards (`test/arch/`) plus shared `support/` and `fixtures/` | `scripts/test.mjs` |

A test that reaches one package only through `aof/default-application` for convenience is package-owned:
rewrite its construction to the package's public factory, or record why the assembled application is the
subject. A whole-tree architecture guard stays at the root even when its current subject is one package.

## Baseline (heuristic census at `df56538e`, to be replaced by the ledger)

1,106 root `*.test.mjs` files: 697 reach several owners, 370 one owner, 39 none detected. Of the single-owner
files, 183 reach only the assembled application, 88 only core source, 62 only `apps/ui` (32 in `test/ui`,
18 in `test/session`, 12 in `test/arch`), and 29 only one feature package (mostly mesh and work-loop).
Packages already hold 88 test files. These are starting observations, not move targets.

## Work

- [x] **Ledger** (all 1,106 baseline files classified, names recorded): Classify every root test file into a tracked `09-test-ledger.json`: owners reached (imports,
  source paths read, processes spawned), verdict (move to `<home>` / rewrite then move / stays: reason), and its
  registered test names. Recompute rather than trusting the heuristic above.
- [x] **Move package-owned tests** (70 moved; existing names preserved): in per-package batches. Preserve every test name, register each case
  exactly once (root runner, package entry and the workspace-boundary census agree), keep source guards
  non-vacuous, and move shared helpers with their only consumer or into a package's test support.
- [x] **Create `apps/ui/test/`** (freeze narrowed, not re-pinned): with a test entry for UI-only suites. The `ui/` freeze digest hashes every
  tracked file under `apps/ui`: re-pin it once, with the measured diff (tests added, no `src/` byte changed), or
  narrow the freeze to `apps/ui/src` with the same measurement — decide in the batch, record which.
- [x] **Rewrite convenience-assembled tests** — 131 suites moved in all; every retained assembled-application suite has a measured, specific reason in the ledger (303 command/UI surface, 91 cross-package, 14 package-to-core, 18 shared root fixture, 11 repository files, 6 pinned or fixture-shared).
- [x] **Update the readers**: `scripts/test.mjs` / `test-unit.mjs` registration, `test-workspace.mjs`, source-
  directory budgets, accepted-suite ceilings (FF-5311), test-traceability pointers, CI and docs. Re-pins
  carry their reason; no floor is lowered to make a move pass.
- [x] **Double-check the refactor.** Sweep active code, scripts, workflows and docs for retired locations
  (`src/`, `ui/`, `app/desktop`, root `bin/`, `src/bundle`); dead or forward-only files; unused exports and
  dependencies per package; duplicated helpers that should have one home; stale `.gitignore` entries; empty
  shells. Reconcile `TECH_DEBT` entries the migration discharged or created. Review the full
  `main..HEAD` diff once more for behaviour drift (commands, flags, outputs, persisted formats).
- [x] **Clean up**: remove migration-only scratch (ignored `.tmp/workspace-migration/` stays local),
  leftover worktrees and stray build output; confirm the local `aof` link targets `packages/core`.
- [x] The four `work/this-tree-holds-what-is-live` dispositions recorded: link floor repaired, story 141 archived, backlog story contract authored, 142's missing record doc **accepted** with its reason ([09-CLEANUP](09-CLEANUP.md#work-stream-dispositions-and-what-stays-open)).

## Verification and exit

- [~] Every root test file is cross-package or a repository-wide guard, with the ledger as evidence; every
  package and `@aof/ui` runs its own suite green in isolation (`AOF_GLOBAL_HOME` isolated). All 14 workspaces run green in isolation.
  The exceptions are named, not open: 18 single-package suites share a root fixture with suites or guards that stay, and 3 are
  pinned by the delivered 127/05 contract; each moves only together with those dependents.
- [x] Registered-case total is unchanged or explained case by case; no test name lost or duplicated.
- [x] Whole-tree gate from a clean detached worktree, the workspace suites, CLI integration, cargo, the UI
  build and the Windows distribution gate pass with only recorded dispositions — run at `5035a225` ([09-REVIEW](09-REVIEW.md#final-gate--5035a225-2026-10-02)); the only red is the accepted 142 record-doc finding.
- [x] The completion audit and plan index are updated; open platform items stay open.

Move tests in reversible batches; do not change production behaviour to make a test movable.
