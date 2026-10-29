---
type: story
number: 02
slug: the-desktop-verbs-run-the-app-on-macos
title: "The desktop verbs install, run and stop the app on macOS, and register its login autostart"
parent: 175
status: in-review
owner: product-owner
created: 2026-10-28
updated: 2026-10-28
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-002, wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-003, wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-004, wiki/work/175_milestone_aof-on-macos/RESEARCH.md, packages/mesh/src/commands/desktop.mjs, packages/mesh/src/commands/face-shared.mjs, packages/mesh/src/commands/desktop-preflight.mjs, packages/core/src/application/bindings/commands/mesh/desktop.mjs, test/support/source-slice.mjs, test/mesh/desktop/index.mjs, test/mesh/desktop/mesh-desktop-dispatch.test.mjs, test/arch/mesh/acd-mesh-command-cli-bijection.test.mjs, test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs, apps/desktop/crates/app/tauri.conf.json]
files: [packages/mesh/src/commands/desktop.mjs, packages/mesh/src/commands/desktop-layout.mjs, packages/mesh/src/commands/desktop-launch-agent.mjs, test/mesh/desktop/mesh-desktop-install.test.mjs, test/mesh/desktop/mesh-desktop-run.test.mjs, test/mesh/desktop/mesh-desktop-stop.test.mjs, test/mesh/desktop/mesh-desktop-autostart.test.mjs, test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs, test/arch/mesh/acd-desktop-layout-one-home.test.mjs, test/arch/mesh/index.mjs]
---
# 02 · The desktop verbs install, run and stop the app on macOS, and register its login autostart

## User story

As **the operator of a Mac**,
I want **`aof mesh desktop install`, `run` and `stop` to work on my Mac the way they work on the
Windows control node, with `--autostart` registering the app to start at login**,
so that **I can restart the supervisor with two commands, from SSH included, and the daemons it
starts are always in my login session, where `claude` is signed in.**

## Tasks

- [x] [00 · `install` places the app bundle on macOS, with no bootstrapper](tasks/00_install-places-the-app-bundle-on-macos.feature)
- [x] [01 · `run` starts the app in the login session](tasks/01_run-starts-the-app-in-the-login-session.feature)
- [x] [02 · `stop` asks the app to quit and waits for it](tasks/02_stop-asks-the-app-to-quit-and-waits.feature)
- [x] [03 · `--autostart` registers a LaunchAgent on macOS](tasks/03_autostart-registers-a-launch-agent.feature)
- [ ] [04 · The verbs on a real Mac](tasks/04_the-verbs-on-a-real-mac.feature)

## Notes

- **The layout module comes first.** `desktop-layout.mjs` (ADR-002 §5) is pure and does no I/O.
  `DESKTOP_APP_EXE` and the install-dir derivation move into it, and `desktop.mjs` keeps
  re-exporting them, so the binding's `commandTools` shape does not change. Stories 01 and 03
  import the layout module and `desktop-launch-agent.mjs` (the pure plist render and its PATH
  read).
- **FF-17502 lands here** and sweeps `scripts/install-local.mjs` and `Info.plist` too, which are
  story 01's files. It passes now, because neither spells a darwin name yet.
- **FF-17503 widens FF-12607** to cover `launchctl` and `pgrep`, and asserts the darwin stop path
  sends no SIGKILL.
- **The platform is an input everywhere** (`ctx.platform ?? process.platform` at the boundary),
  so every darwin leg runs on any host, the Windows control node included.
- **RESEARCH Q2** (whether `launchctl` from SSH starts the job in the Aqua session) is measured by
  task 04, the real-Mac task.
