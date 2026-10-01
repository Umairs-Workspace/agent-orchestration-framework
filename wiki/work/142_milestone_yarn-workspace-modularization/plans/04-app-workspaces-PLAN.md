# Plan 04 — Relocate UI and desktop applications

Status: complete 2026-10-01 except the live desktop-app run (operator-gated, open). Evidence: [04-APPS.md](04-APPS.md). Depends on the core/path contract from [Plan 03](03-core-workspace-PLAN.md).
Coordinate packaging changes with [Plan 05](05-distribution-and-tooling-PLAN.md).

## Objective

Move `ui/` to `apps/ui/` and `app/desktop/` to `apps/desktop/`. Keep the React/Vite application
and the desktop application's own frontend distinct; this is a layout and ownership migration.

## Work

- [x] Move tracked UI source/configuration into `apps/ui` and retain workspace name `@aof/ui`.
  Update workspace globs, Vite/TypeScript paths, root UI scripts and `scripts/ui-build.mjs`.
- [x] Keep browser imports limited to browser-safe contracts and UI dependencies. Access configured
  operations through HTTP/WebSocket; do not pull Node service implementations into the browser bundle.
- [x] Move tracked desktop Cargo manifests/lockfiles, Rust crates, assets and its `ui/` frontend into
  `apps/desktop`. Leave generated `target/` build output out of the move/commit.
- [x] Add a private desktop workspace manifest with useful build/test entry scripts wrapping Cargo.
  Cargo remains authoritative for Rust dependencies; no new JavaScript build stack is needed.
- [x] Preserve the desktop Cargo split: the pure `crates/core` workspace excludes `crates/app`.
  Keep Tauri checks explicit so ordinary Rust core tests do not unexpectedly require native GUI tooling.
- [x] Check `crates/app/tauri.conf.json` frontend resources (currently `../../ui`), icons and bundle
  configuration after relocation. Preserve identifiers and user data locations.
- [x] Update mesh desktop command/preflight paths, executable discovery, supervisor process invocation,
  test fixtures and release staging. Desktop consumes the installed AOF process/API.
- [x] Update server static asset locations for the React build through injected paths. Source layout
  must not force a change to existing installed UI sidecar locations or routes.
- [x] Search active scripts, workflows and documentation for `ui/` and `app/desktop/` assumptions.
  Classify installed paths and historical references before replacing strings.

## Verification and exit

- [x] Run the UI workspace build and relevant server/static/board/fleet/terminal tests after the move.
  Check the built UI contains its assets and still reaches the correct backend routes.
- [x] Run `cargo test --locked --manifest-path apps/desktop/crates/core/Cargo.toml`.
  On a supported native host, run `cargo check --locked --manifest-path apps/desktop/crates/app/Cargo.toml`
  and the existing desktop build/package path with its prerequisites.
- [ ] Verify desktop resource inclusion, process launch, supervision/shutdown and terminal connection
  in the real desktop application. (Resource inclusion verified in a release build; launch/supervision NOT run — the operator's app is running and single-instance.) Record missing native toolchains as unverified checks.
- [x] Confirm the CLI-only distribution remains usable without either app build.
- [x] No active build/test/release consumer requires the old source directories. Both applications
  have discoverable workspace scripts and documented prerequisites.

Move each app and all its path consumers as one reversible batch. Do not redesign screens or
change desktop supervision behavior as part of relocation.
