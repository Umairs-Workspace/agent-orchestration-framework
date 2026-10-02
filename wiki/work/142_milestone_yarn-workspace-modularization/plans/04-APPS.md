# Plan 04 evidence — UI and desktop applications

Completed 2026-10-01 on branch `refactor/yarn-workspace-modularization` (code commit `ada86aef`, plus
follow-ups recorded below).

## What moved

| From | To | Notes |
| --- | --- | --- |
| `ui/` | `apps/ui/` | Workspace name `@aof/ui` retained; `git mv`, history kept. |
| `app/desktop/` (Cargo workspace, `crates/core`, `crates/app`, `ui/`) | `apps/desktop/` | `Cargo.lock` files stay committed; `target/` and Tauri `gen/` are ignored build output. |

New: `apps/desktop/package.json` (`@aof/desktop`, private) wrapping Cargo — `test` (`cargo test --locked`
over the pure core workspace), `check` (`cargo check --locked` of the Tauri shell), `build` (release shell
build). `crates/app` stays excluded from the core Cargo workspace, so core tests need no GUI toolchain.
`tauri.conf.json` `frontendDist` (`../../ui`) still resolves to `apps/desktop/ui`; identifier, product
name and user-data locations are unchanged. Root `package.json` workspaces are now `apps/*`, `packages/*`;
`yarn.lock` gained the `@aof/desktop` locator and `@aof/ui@workspace:apps/ui` (no resolution changed).

## Consumers updated

- Source asset resolution for an injected repo root: `apps/ui/dist` (`board-serve.mjs`, `ui-serve.mjs`). The
  default path still resolves through `assetBase("ui")` → the locked `@aof/ui` workspace, and **installed
  payloads / release archives keep `ui/dist`** (unchanged routes and sidecar layout).
- `install-local.mjs --desktop` cargo manifest/target, `scripts/test.mjs` cargo lane, `.gitignore`, the
  deploy rule, README ("Applications"), `apps/desktop/README.md`, and ~220 source/test files that cited the
  old paths. A rewrite of `@aof/ui/vite-cli` into `@aof/apps/ui/vite-cli` made by the bulk edit was caught by
  the assets-UI launcher check and reverted (`packages/core/.../assets/ui.mjs`, `build-sea.mjs`,
  `workspace-runtime-audit.json`).
- Build advice printed to humans is now `yarn ui:build` (was `npm --prefix ui run build`); tests that
  spawned `tsc -b ui` / `npm --prefix ui` follow the new location.
- The `ui/` freeze digest (`acd-loop-state-rides-the-run-record`) is **re-pinned with the measurement**:
  paths are part of the digest, the non-comment diff is empty apart from two developer-facing citations in
  `shell-layout.mjs` refusal text, and the config editor's example placeholder `ui/src` was left alone on
  purpose. No behaviour, route or copy a user sees moved. The UI's own README was deliberately **not**
  placed under `apps/ui/` (it would change the frozen tree); the UI is documented in the root README.

## Verification (this host: Windows x64, Node 22.22.2, Yarn 4.18.1, cargo/rustc 1.93.1)

- `yarn ui:build` from `apps/ui`: 1,669 modules, `dist/index.html` + hashed assets present.
- `node scripts/test.mjs --only <136 touched suites>`: 1,893 cases; remaining failures are the four
  baseline `work/this-tree-holds-what-is-live` ratchets (reproduced on `6a04b43`, see Plan 08) and the
  digest/regex fixes made afterwards; a second run of every affected suite is green.
- `yarn test:workspaces`: all package suites pass (0 failures).
- `cargo test --locked --manifest-path apps/desktop/Cargo.toml`: 118 passed. `cargo test --locked
  --manifest-path apps/desktop/crates/core/Cargo.toml` passes (via `yarn workspace @aof/desktop test`).
- `cargo check --locked --manifest-path apps/desktop/crates/app/Cargo.toml`: passes after clearing the
  stale, absolute-path build cache that the move invalidated (`cargo clean` of the ignored `target/`).
- Supply-chain audit passes; `yarn install --immutable --mode=skip-build` passes on the committed tree.

## Not verified here

~~Real desktop application launch/supervision/shutdown and terminal connection were not exercised.~~

**Verified 2026-10-02 on the real app, built from `0366a4fa`** (`node scripts/install-local.mjs --sea --desktop`, payload
`0366a4fa.20261002T103106`):

- **Launch.** The app was started with `aof mesh desktop run` from the repository root.
- **Supervision.** `aof-mesh-desktop.exe` parents `aof.exe mesh ui` (owns `:4181`; logs `daemon-started … build payload 0366a4fa`)
  and `aof.exe mesh serve --serve` (owns `:4182`). The fleet returns HTTP 200. The terminal-view socket accepts a
  `(nodeId, sessionId)` tuple and refuses anything else.
- **Shutdown.** Quitting from the tray left no `aof.exe` or desktop process and freed both ports. This was checked once on the
  old build and once on the new build.
- **Terminal.** The operator opened a session from Terminals → New session, and it ran.

Found along the way, outside 142's code:

- **The fleet was flooded with dead registrations.** Leaked test fixtures and dead dispatch lanes added 352 records to
  `~/.aof/mesh/workspaces`. One more record was created by launching from the home folder, because identity is
  derived from the current directory. All were moved to `~/.aof/mesh/workspaces-pruned-*`, and their projection rows
  were removed after a backup.
- **Four repositories have no pinned `mesh.workspaceId`,** so the `workspace-identity-pinned` preflight fails. This is captured
  as backlog story `every-command-runs-over-a-valid-config`.
