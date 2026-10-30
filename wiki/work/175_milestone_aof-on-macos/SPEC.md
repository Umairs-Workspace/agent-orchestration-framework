---
type: milestone
number: 175
slug: aof-on-macos
title: "aof on macOS — built, installed, supervised by the desktop app and started at login"
status: done
owner: product-owner
created: 2026-10-28
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
---
# 175 · aof on macOS — built, installed, supervised by the desktop app and started at login

## Objective

An operator on a Mac gets the same product the Windows control node has today. They can build and
install aof from the checkout, and run the desktop supervisor in the menu bar. The supervisor
starts both daemons (`mesh serve --serve`, `mesh ui`) and ends their whole process tree when it
quits. It starts again at login with no terminal open. Because the daemons run inside the user's
login session, `claude` is authenticated and a run does not die on auth.

To show it was met, a fresh Mac goes from clone to a working fleet (`:4181`), with the tray
showing both daemons healthy, using only documented commands. Quitting the app leaves no `aof`
process running. Logging out and back in brings the fleet back.

## Scope

In scope:
- **The build and install loop on darwin.**
  - `node scripts/install-local.mjs` installs the payload and the SEA launcher on macOS:
    - covers arm64 and x64;
    - keeps the existing ad-hoc codesign step around postject;
    - `--version` reports `payload <buildId>`.
  - `--desktop` on darwin is no longer refused. It builds the Tauri app and places it next to
    `aof`.
- **The desktop app on macOS.**
  - A macOS bundle target (`.app`) beside today's `nsis` target. It uses the system WKWebView,
    so there is no WebView2 bootstrapper.
  - A menu-bar tray.
  - It supervises both daemons. A process-group seam takes the place of the Windows Job Object in
    `supervisor.rs`, so quitting reaps the tree, which `cfg(not(windows))` does not do today.
- **The `aof mesh desktop` verbs on darwin.**
  - `install`, `run` and `stop` find, launch and gracefully stop the `.app` by an absolute
    co-located path. `stop` sends a graceful quit and never force-kills.
  - The preflight states the macOS prerequisites: Xcode command-line tools, Rust, and Gatekeeper
    or quarantine on a locally built app.
- **The background service.**
  - Login autostart through a per-user LaunchAgent in `~/Library/LaunchAgents`, the macOS
    counterpart of the `HKCU\…\Run` key. Today `admitAutostartPlatform` refuses every platform
    except win32.
  - The supervised daemons run in the GUI (Aqua) session, so `claude`'s keychain-backed auth is
    available. A daemon started over SSH sits outside that session, so its `claude` is
    unauthenticated.
  - A documented restart path that does not need a login shell.
- **Operator documentation.**
  - A macOS section in `.claude/rules/build-deploy-restart.md`: deploy, restart, verify at the
    source.
- **This laptop as a single-node mesh.** It is isolated, not part of any mesh. It is nominated as
  its own control node, so the desktop app's existing role rule starts both daemons.

Out of scope:
- **Developer ID signing, notarisation, a `.dmg` and a release pipeline.** A locally built app with
  ad-hoc signing is the bar here. Distributing to other people's Macs is a release milestone.
- **Linux desktop tray or systemd units.** The WSL node stays a hand-run worker. The process-group
  seam should be portable, but a Linux tray is not delivered here.
- **Replacing the Mac's npm-linked `aof`.** The global `aof` on PATH stays an `npm link` into the
  checkout, so code changes are live without a rebuild. The install must not shadow it.
  `ensureOnPath` currently appends `~/.aof/bin` to the shell profiles; refine decides whether
  darwin skips that, and which `aof` the supervisor runs.
- **Workspace identity's cwd dependence (TECH_DEBT item 4).** A supervisor-spawned daemon gets
  the supervisor's environment, as it does on Windows. Fixing that root cause is its own item.

## Stories

- [x] [00 · Quit reaps the whole tree on macOS](stories/00_story_quit-reaps-the-whole-tree-on-macos/STORY.md) (ADR-001)
- [x] [01 · `install-local` builds the app on macOS](stories/01_story_install-local-builds-the-app-on-macos/STORY.md) (ADR-002; after 02)
- [x] [02 · The desktop verbs run the app on macOS](stories/02_story_the-desktop-verbs-run-the-app-on-macos/STORY.md) (ADR-002 §5, ADR-003, ADR-004 §1-§3)
- [x] [03 · The preflight checks the Mac](stories/03_story_the-preflight-checks-the-mac/STORY.md) (ADR-004 §4; after 02)
- [x] [04 · The Mac runbook and acceptance](stories/04_story_the-mac-runbook-and-acceptance/STORY.md) (ADR-005; after 00-03; the milestone's `@uat`)

Waves: 00 ∥ 02, then 01 ∥ 03, then 04.
- 00 is Rust-only and shares nothing with the rest; the graph shows `supervisor.rs` reached only
  from `main.rs`.
- 02 lands the one new shared edge, the layout module, which 01 and 03 import.
- 03 also follows 02 because the two amend the same two preflight-pinning suites.
- 04 documents and accepts what the four built.

## Dependencies

- **m36 (desktop supervisor) and m28 (SEA installer).** These are the Windows-first designs being
  extended. m36/ADR-001's portable-core posture is the seam this milestone fills in.
- **The payload-first launcher (TECH_DEBT item 1).** Install on darwin uses the same payload
  loop, not a per-change SEA rebuild.
- **A Mac with a GUI login to verify on: this laptop.** Autostart, keychain
  auth and the tray cannot be verified headless or over SSH. Expect `@uat` scenarios.
