# Plan 08 evidence — final verification and handover

Verified revision: `2cd5d915` (branch `refactor/yarn-workspace-modularization`, 2026-10-01). The whole-tree gate
ran from a **detached sibling worktree** (`git worktree add --detach`, clean tree, no shared `node_modules`).
Receipts: `.tmp/workspace-migration/plan08/` (ignored; reproduction commands below are tracked here).

## Environment

| Item | Value |
| --- | --- |
| Host | Windows 11 x64 (win32), Git Bash / PowerShell, autocrlf checkout |
| Node / Yarn | 22.22.2 / 4.18.1 (checked-in release), `enableScripts: false` |
| Rust | cargo/rustc 1.93.1 |
| Install mode | `node scripts/prepare-worktree.mjs` (immutable, `--mode=skip-build`), then `yarn install --immutable --mode=skip-build` |
| Worktree state | clean at `2cd5d915` (the full run began at `b0221661`; the three fixes in `2cd5d915` were re-run, below) |

## Results

| Gate | Command | Result |
| --- | --- | --- |
| Supply chain | `node scripts/supply-chain-audit.mjs` | passes, 0 warnings |
| Immutable install | `node .yarn/releases/yarn-4.18.1.cjs install --immutable --mode=skip-build` | passes; lockfile unchanged |
| UI production build | `node scripts/ui-build.mjs` | passes (`apps/ui/dist`) |
| Package suites | `node scripts/test-workspace.mjs --all` | all 13 workspaces: 0 failures |
| Root suite (units, arch, BDD, bundle) | `AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs` | **11,537 cases, 12 failures** — dispositions below |
| CLI integration | lane of the same run | 134 cases, 0 failures |
| Rust core | `cargo test --locked` over `apps/desktop` | 118 passed |
| Tauri shell | `cargo check --locked` / `cargo build --locked --release` (`crates/app`) | pass; release `mesh-desktop-app.exe` (9.3 MB) embeds the desktop frontend |
| Native Windows distribution | `build-sea.mjs` → `stage-release-assets.mjs` → `verify-distribution.mjs --os windows --arch x64` | all 8 checks pass: extracted installer layout and update, source help parity, work-init assets, isolated module loading, SEA audit census, bundled audit children, built UI, real SEA PTY input/output (embedded build `2cd5d915.20261001T135320`) |

## The 12 root-suite failures

| Failure | Class | Disposition |
| --- | --- | --- |
| FF-11904 ×5 (source-directory budget) and `138/00 task01` | **Migration regression** — a helper file I added put `packages/core/src` one over its delivered-count budget | Fixed in `2cd5d915` (resolver folded into the existing work-loops binding). Re-run on the fixed revision: green. |
| `workspace-boundaries/all actual owners…` | **Migration regression / environment** — the runtime-audit source digest differed between LF and CRLF checkouts | Fixed in `2cd5d915` (digest normalizes line endings; no digest changed on LF). Re-run: green. |
| `129/04 task05` wave collider ordering | Documented full-run/isolated discrepancy (also seen as `129/04 task02`, `131/03 task02` in other aggregates): wave/lane suites go red under aggregate load and pass in isolation | Passes alone and in the 76-case re-run. Not a proven baseline failure or diagnosed cause; assertions untouched. |
| `work/this-tree-holds-what-is-live` ×4 (validate/doctor "no redder", root-holds-only-live, archive validate ratchet, link ratchet) | **Pre-existing**, reproduced on the pre-142 baseline `6a04b43` (`baseline-live-tree.log`) | See below. Not a migration regression; not waived. |

Disposition of the four: three are repository work-record expectations that this milestone deliberately does not
change — `142/SPEC.md` is ordinary project notes with no managed frontmatter (the milestone runs outside AOF),
a backlog story lacks its context contract, and completed story 141 still sits at the stream root. The link
ratchet counts relative links in `wiki/work/**` (1,394 resolving vs a 2,317 floor): the historical records
cite files the migration moved, and delivered records are immutable, so the floor cannot be met without
rewriting history. Resolving these needs operator decisions about work-item state (archive 141, give 142 a
managed record or exempt it, re-measure the floor); none was changed to quiet a test.

Two tests that failed at the previous plan's close are repaired: `FF-5311` pins re-stamped with stated
reasons (a `scripts/test.mjs` path literal; a suite-path spelling for the moved work-graph suite) and
`FF-11902` (two member-census assertions restated as floor-plus-every).

## Audits against the baseline

- **Commands/skills:** 117 command descriptors (frozen inventory fixture) unchanged; representative continue/
  verify/refine/loop-adjacent operations run in a fixture project from an unrelated cwd with no UI
  (`07-ASSETS.md`); `aof work update` reports 0 drift here and in a fresh fixture.
- **Persisted formats / effects:** run-record, mesh, journal and cache suites (execution, mesh, effects
  packages and the root arch/BDD lanes) pass; no persisted format changed; effect ordering/replay and
  acknowledgement suites pass.
- **Generated assets:** manifest regenerated; fixture rendering parity green; checked-in copies refreshed only
  inside the operator's explicit approvals (35 files + hashes, plus `wiki/work/loops.md`).
- **Optional integration isolation:** `@aof/integration-notion` has its own suite; CLI-only copied payload and
  SEA run with no `apps/ui` or `apps/desktop` build (distribution gate above).
- **Regressions found and fixed in this plan:** loop groundedness reported six stale anchors; tune provenance
  could not follow moved files; plus the budget/digest items above.

## Still open (not verified here; not marked passed)

- **Real desktop application**: launch, supervision/shutdown and terminal connection of a freshly built
  `mesh-desktop-app.exe`. The operator's desktop app is running and is single-instance; starting or restarting
  it is the operator's act (`aof mesh desktop run` after quitting the app, then `node scripts/install-local.mjs --desktop`
  to install the release build).
- **Linux/WSL native leg on this revision.** Plan 05 proved a disposable Ubuntu 22.04 clone at `23676ce5`;
  the apps move does not change that path (UI staging already followed the locked `@aof/ui` owner) but it was not
  re-run on `2cd5d915`.
- **macOS, arm64 and the hosted CI release matrix; signing and publishing.** Unavailable here; nothing was
  signed, published or deployed.
- **The Mac worker** is deployed by `git pull` and an operator restart; not touched.

## Reproduce

```text
git worktree add --detach ../aof-gate <rev> && cd ../aof-gate
node scripts/prepare-worktree.mjs
node scripts/supply-chain-audit.mjs && node scripts/ui-build.mjs
AOF_GLOBAL_HOME="$(mktemp -d)" node scripts/test.mjs            # whole tree, ~1 h serial
node scripts/test-workspace.mjs --all
node scripts/build-sea.mjs --out <tmp>/build
node scripts/release/stage-release-assets.mjs --sea-out <tmp>/build --stage-dir <tmp>/stage --os windows --arch x64
node scripts/release/verify-distribution.mjs --stage-dir <tmp>/stage --os windows --arch x64
cargo test --locked --manifest-path apps/desktop/Cargo.toml
cargo build --locked --release --manifest-path apps/desktop/crates/app/Cargo.toml
```
