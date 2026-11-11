---
doc: research
---
# 175 · aof on macOS — Research

What refine measured before deciding, and the three questions that only the build can answer.
Measured 2026-10-28 on `MacBookPro` (x86_64, macOS 15.7.9, a GUI login), read-only.

## Measured

- **M1 · The payload loop already runs on darwin x64.** `~/.aof/bin/aof` is a Mach-O x86_64 with
  `Signature=adhoc` (`codesign -dv`), and `--version` answers `0.1.0 (payload a816d6d.20261020T104310)`.
  So `install-local`'s payload copy, the SEA build and its codesign step around postject
  (`scripts/build-sea.mjs:246-252`) all work on this machine today. arm64 is not measured (see Q3).
- **M2 · Nothing shadows the npm link today.** The global `aof` is
  `~/.nvm/versions/node/v24.14.1/bin/aof → lib/node_modules/aof → <checkout>/packages/core`.
  `~/.aof/bin` is not on PATH. `ensureOnPath` still exists in `scripts/install-local.mjs`, but its
  call in `main()` is commented out, so it is dead code.
- **M3 · This Mac has no Rust toolchain.** `cargo` and `rustc` are not found. Xcode is at
  `/Applications/Xcode.app/Contents/Developer`. `claude` is not on this shell's PATH either.
- **M4 · `pgrep -x aof-mesh-desktop` finds a process by that executable name.** Measured with a
  copy of `/bin/sleep` named `aof-mesh-desktop`. That name is 16 characters, exactly macOS's
  `MAXCOMLEN`, so a longer name would not match.
- **M5 · This terminal is in the GUI domain.** `launchctl managername` answers `Aqua`, and
  `launchctl print gui/501` answers `type = login`.
- **M6 · The crates the reap needs are already locked.** `apps/desktop/crates/app/Cargo.lock`
  holds tokio 1.52.3 (it has `Command::process_group` on unix), libc 0.2.186 (a transitive
  dependency), tauri 2.11.5 and tao 0.35.3. Declaring `libc` under `cfg(unix)` adds no package,
  in the same way `windows-sys` was declared (167/ADR-006).
- **M7 · Both daemons stop cleanly on SIGTERM.** `packages/mesh/src/commands/serve.mjs:114-115` and
  `packages/mesh/src/commands/ui.mjs:158-159` trap SIGINT and SIGTERM.
- **M8 · The non-Windows supervisor reaps nothing.** `create_job` answers `None`, `assign_to_job`
  does nothing (`apps/desktop/crates/app/src/supervisor.rs:403-410`), and `tree_kill` sends
  `kill -KILL <pid>` to the direct child only (`:1104-1110`). Children are spawned with no process
  group of their own.
- **M9 · The app finds `aof` from the home directory, not from its own location.** `install_dir`
  is `home_dir()/.aof/bin` (`apps/desktop/crates/app/src/main.rs:418-422`). An `.app` bundle
  therefore resolves `~/.aof/bin/aof` wherever the bundle sits.
- **M10 · `stop` already sends SIGTERM off Windows, and does not wait.**
  `packages/mesh/src/commands/desktop.mjs:463-465`. Today a `stop` then `run` would race a
  supervisor that is still exiting.
- **M11 · No shell spawn is allowed in the Rust app.** m36/ADR-004's trusted-spawn control
  (`test/arch/ui/acd-desktop-trusted-spawn.test.mjs`) forbids `Command::new("sh"|"bash"|…)` under
  `apps/desktop`. So the app cannot ask a login shell for its PATH.
- **M12 · The verbs' OS reach is one injected runner.** FF-12607
  (`test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs`) holds `reg`, `tasklist` and
  `taskkill` to that runner, and it admits exactly `win32` for autostart.

- **M13 · This laptop is in no mesh, so the app would start `mesh ui` only.**
  - `aof mesh status --json` answers `isControlNode: false` with no nodes, from the checkout and
    from `~` alike.
  - `aof mesh relay --json` answers `nodeId: "node-6eb3"`, `controlNode: null`,
    `nominated: false`.
  - `~/.aof/aof.config.json`, the global workspace's config (`packages/core/src/workspace.mjs:38`),
    does not exist.
  - `isControlNode` is `config.mesh.relay.controlNode === config.mesh.nodeId`
    (`packages/mesh/src/registry.mjs:67-71`).
  - The app starts `mesh serve --serve` only once that answers true
    (`apps/desktop/crates/app/src/supervisor.rs:491`).
  - No `aof mesh` verb writes the nomination. It is a config key.

## Prior art

- **P1 · launchd and GUI apps.** A per-user LaunchAgent loaded into `gui/<uid>` with
  `LimitLoadToSessionType: Aqua` runs inside the user's login session, where the login keychain
  is unlocked. Processes that launchd or LaunchServices start get
  `PATH=/usr/bin:/bin:/usr/sbin:/sbin`, not the shell's PATH. Editors launched from the Dock resolve
  the shell environment for the same reason.
- **P2 · macOS has no parent-death signal.** There is no `PR_SET_PDEATHSIG`. A process group
  outlives a parent that crashes, unless something signals it.
- **P3 · node-pty sessions leave the process group.** A pty child is forked into a session of its
  own (`forkpty`), so it is not in its daemon's process group. The daemon's SIGTERM shutdown is
  what ends those sessions (M7).
- **P4 · Claude Code keeps its credentials in the login keychain on macOS.** That is why a
  daemon started over SSH, outside the Aqua session, is unauthenticated.

## Open — measured by the build, not blocking refine

- **Q1 · How does an OS quit reach the app?** When the OS quits the app (logout, or a `quit` Apple
  Event), does tao 0.35 / tauri 2.11 deliver `RunEvent::ExitRequested`, and with what `code`?
  Today's handler prevents every request whose `code` is `None` (`main.rs:536-543`). ADR-001 §4
  covers either answer. Story 00 measures it.
- **Q2 · Does `launchctl` from SSH start the job in the GUI session?** As the same, logged-in user,
  `launchctl kickstart gui/<uid>/<label>` (or `bootstrap`) run from SSH should start the job inside
  the Aqua session. Story 02 measures it, and story 04's UAT relies on it. If launchd refuses, `run`
  over SSH refuses the same way it does when no LaunchAgent is registered (ADR-003 §2).
- **Q3 · arm64.** This laptop is x86_64, and it is the only Mac this milestone runs on. The
  arm64 build and install are therefore not verified here. Each Mac builds for its own
  architecture (ADR-002 §4), and the node-pty prebuild for `darwin-arm64` ships in the package.
- **Q4 · Does the cwd-less `mesh status` read the global config?** The supervisor spawns
  `mesh status --json` with no working directory (`form_mesh_status_spawn`). From a launchd
  start that directory is `/`. M13 shows that from `~` the command answers from the global
  workspace. Story 04's UAT confirms the nomination is read from `/` as well.
