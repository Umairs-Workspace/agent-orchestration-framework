---
type: story
number: 01
slug: install-local-builds-the-app-on-macos
title: "`install-local` builds the desktop app on macOS and places an ad-hoc-signed `.app` beside `aof`, and never edits a shell profile"
parent: 175
status: in-review
owner: product-owner
created: 2026-10-28
updated: 2026-10-28
schema: 1
aofVersion: 0.1.0
depends: [02]
reads: [wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-002, wiki/work/175_milestone_aof-on-macos/RESEARCH.md, packages/mesh/src/commands/desktop-layout.mjs, scripts/build-sea.mjs, scripts/sea-asset-manifest.mjs, scripts/workspace-paths.mjs, test/bundle/core-workspace.test.mjs, test/testing/build-sea-recipe-guards.test.mjs, apps/desktop/crates/app/tauri.conf.json, apps/desktop/crates/app/Cargo.toml]
files: [scripts/install-local.mjs, apps/desktop/crates/app/Info.plist, test/bundle/install-local-desktop.test.mjs, test/bundle/index.mjs]
---
# 01 · `install-local` builds the app on macOS

## User story

As **the operator, or an agent, deploying from a Mac checkout**,
I want **`node scripts/install-local.mjs --desktop` to build the desktop app and place it beside
`aof`, as it does on Windows**,
so that **the Mac's deploy loop is the documented one (install, then restart), and the npm-linked
`aof` I use at the terminal is never shadowed by the install.**

## Tasks

- [x] [00 · `--desktop` builds and places the app bundle on macOS](tasks/00_desktop-builds-and-places-the-app-bundle.feature)
- [x] [01 · The install leaves the shell alone and names its payload](tasks/01_the-install-leaves-the-shell-alone-and-names-its-payload.feature)
- [ ] [02 · The bundle and the payload on a real Mac](tasks/02_the-bundle-on-a-real-mac.feature)

## Notes

- **The plan is pure, the acts are injected.** Follow `planMacCodesignSteps`
  (`scripts/build-sea.mjs:246`): a pure `planMacAppBundle({ built, installDir, platform })`
  returns the copies, the plist placement and the `codesign` argv. The tests assert the plan on
  any host, and only a real Mac runs it.
- **The `.bak` prune learns directories.** Bundles rotate to `aof-mesh-desktop.app.bak.<ts>`,
  and the prune keeps the newest 3, removing a bundle recursively.
- **`ensureOnPath` is deleted,** not left commented out (ADR-002 §6). The tests pin that no
  profile is written.
- **Imports story 02's layout module** for every darwin name (FF-17502), hence `depends: [02]`.
- **A real build needs Rust on the Mac** (RESEARCH M3). Rust was installed at build
  (2026-10-28).
- **The real `--desktop` path ran once at build (2026-10-28, this MacBook), into an isolated
  install dir.** The command was `node scripts/install-local.mjs --skip-ui --desktop
  --install-dir <scratch>/bin`, with HOME isolated.
  - The release cargo build took about 4 minutes.
  - The bundle was assembled and ad-hoc signed last, and `codesign -v` exits 0.
  - The placed `Contents/Info.plist` carries `com.aof.mesh.desktop` and `LSUIElement` 1, and
    the inner executable is mode 755. The staging dir was removed.
  - The isolated HOME gained no profile.
  - The live `~/.aof/bin` was not touched. Task 02's `@manual` run against it is
    `aof:verify`'s.
- **tauri embeds `Info.plist` into a debug macOS build** (`tauri-codegen` 2.6.3,
  `context.rs:301`). So the committed file also makes a raw debug binary menu-bar only. A
  release binary takes it from the bundle.
