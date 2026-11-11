---
type: story
number: 00
slug: quit-reaps-the-whole-tree-on-macos
title: "Quitting the desktop app on macOS reaps its whole supervised tree, however the quit arrives, and the app lives in the menu bar"
parent: 175
status: done
owner: product-owner
created: 2026-10-28
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-001, wiki/work/175_milestone_aof-on-macos/DESIGN.md, wiki/work/175_milestone_aof-on-macos/RESEARCH.md, apps/desktop/crates/app/src/supervisor.rs, apps/desktop/crates/app/src/main.rs, apps/desktop/crates/app/src/cpu_sample.rs, apps/desktop/crates/core/src/supervision.rs, apps/desktop/crates/core/src/resolve.rs, apps/desktop/crates/core/src/tray_menu.rs, apps/desktop/crates/core/src/lib.rs, apps/desktop/Cargo.toml, packages/mesh/src/commands/serve.mjs, packages/mesh/src/commands/ui.mjs, test/arch/ui/acd-desktop-trusted-spawn.test.mjs, test/arch/ui/acd-desktop-guard-never-kills.test.mjs, test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs]
files: [apps/desktop/crates/app/src/supervisor.rs, apps/desktop/crates/app/src/main.rs, apps/desktop/crates/app/Cargo.toml, apps/desktop/crates/app/Cargo.lock, apps/desktop/crates/core/src/reap.rs, apps/desktop/crates/core/src/lib.rs, test/arch/ui/acd-desktop-reaps-process-groups.test.mjs, test/arch/ui/index.mjs]
---
# 00 · Quit reaps the whole tree on macOS

## User story

As **the operator of a Mac**,
I want **quitting the desktop app, a `stop`, or logging out to take both daemons and everything
they started down with it, while closing the window only hides it**,
so that **a restart never leaves a stale daemon on `:4181` or `:4182` running the old build, and a
logout never leaves `aof` processes behind in a session that has ended.**

## Tasks

- [x] [00 · The reap ladder is pure and lives in core](tasks/00_the-reap-ladder-is-pure-and-in-core.feature)
- [ ] [01 · Every exit path reaps the supervised groups on a real Mac](tasks/01_every-exit-path-reaps-the-groups.feature)
- [ ] [02 · The menu-bar icon opens the menu](tasks/02_the-menu-bar-icon-opens-the-menu.feature)

## Notes

- **The decisions are pure and in core.** The reap ladder (SIGTERM each group, 5 s grace,
  SIGKILL survivors) is a pure function in a new `reap.rs`, which `cargo test` reaches. The
  app crate only carries it out with `libc::killpg`. That is the house shape: `stop_step` and
  `classify_exit` are pure in core too.
- **No new package.** `libc` 0.2.186 and `signal-hook-registry` are already in
  `apps/desktop/crates/app/Cargo.lock`. Declaring `libc` under `cfg(unix)` and adding tokio's
  `signal` feature changes the manifest, not the package set (RESEARCH M6).
- **FF-17501 lands here** (`acd-desktop-reaps-process-groups`), beside m36/ADR-004's
  trusted-spawn control in `test/arch/ui/`.
- **RESEARCH Q1** (how tao delivers an OS quit) is measured by the `@manual` exit-path task, and
  ADR-001 §4's guard is narrowed to what that measurement shows.
- **The build needs Rust on a Mac.** This MacBook had none (RESEARCH M3). The operator chose to
  have it installed at build, on 2026-10-28 (rustup stable, `--no-modify-path`).
- **RESEARCH Q1, measured at build (2026-10-28, this MacBook).**
  - *From the source.* tao 0.35.3 does not override `applicationShouldTerminate`, so AppKit's
    default terminates at once. Its `applicationWillTerminate` raises `LoopDestroyed`, which
    tauri-runtime-wry 2.11.4 delivers as `RunEvent::Exit`. An OS quit (a logout, or a `quit`
    Apple Event) therefore never reaches `RunEvent::ExitRequested`. It arrives as `RunEvent::Exit`,
    which carries no code. The reap runs there.
  - *The guard.* The `prevent_exit` guard is compiled out on macOS. No implicit exit can arise
    there, since the window's close only hides it, and an OS quit must never be prevented.
    Windows keeps the guard unchanged.
  - *Run, E4.* The debug build was run against `~/.aof/bin/aof`. `mesh ui` led its own group
    (pid 45745 = pgid 45745). `kill -TERM <app>` exited with status 0 in 0.08 s, and
    `pgrep -fl "aof mesh"` was empty 3 s later.
  - *An in-flight poll.* One run caught a `mesh status --json` poll in flight. It is unsupervised
    and in the app's own group, so the reap does not signal it. It finished by itself inside 3 s,
    well within E4's 10 s.
  - *Still open for `aof:verify`.* Quit from the menu, the `osascript` quit (it needs story 01's
    bundle id) and a logout were not run here.
