---
doc: state
---
# 175 · aof on macOS — State

## Progress

- Framed 2026-10-28.
- Refined 2026-10-28 (`aof:refine 175 --autonomous`, solo):
  - RESEARCH, four ADRs with their fitness register (FF-17501–FF-17503) and a DESIGN delta;
  - five stories, each with an example map and a build brief;
  - all five contracts. 00 and 01 were authored after the end review's two answers.
- **Asked at the end review (2026-10-28):**
  - `175/00 Q2`, the menu-bar click: the left-click opens the menu.
  - `175/01 Q1`, the Dock: menu bar only.
  - A macOS mock: none, so the m36 mocks and DESIGN's checklist are the baseline.
- **The refine run was re-minted.** The first mint (`20261028T180342356Z-0000`) took another live
  session's id from the session store (`688b710a…`). It is settled `cancelled`, with that reason,
  and the phase re-minted with `--session fae63f72…`, so the example-map answers anchor to the
  transcript that holds them.

## Notes & decisions in flight

- What was already darwin-aware, as found when framing:
  - `scripts/build-sea.mjs` already runs the codesign step (F8).
  - `discoverDesktopApp` and `findDesktopProcesses` have POSIX branches (an execute bit,
    `pgrep`).
  - `resolve.rs` and `supervisor.rs` have `cfg(not(windows))` arms, but the supervisor's arm
    reaps nothing.
- Hard Windows-only refusals today:
  - `install-local --desktop`;
  - `admitAutostartPlatform`;
  - Tauri `bundle.targets: ["nsis"]`.
- **Default decisions taken at refine** (each is recorded in its ADR):
  - **No Tauri `app` target.** `install-local` assembles the `.app` from the cargo build, using
    one committed `Info.plist` (ADR-002 §1, §7). This departs from the SPEC's wording "a macOS
    bundle target beside `nsis`".
  - **The supervisor runs `~/.aof/bin/aof`,** the payload, never the npm-linked `aof`.
    `ensureOnPath` is deleted, so nothing shadows the link (ADR-002 §6). This answers the SPEC's
    "refine decides".
  - **The reap grace is 5 s; `stop` waits up to 20 s** and never force-kills on darwin (ADR-001
    §2, ADR-003 §3).
  - **Crash containment on macOS is deferred** to a ROADMAP item, with a runbook recovery
    (ADR-001 §5).
  - **`run` over SSH with no LaunchAgent refuses** as `desktop-run-needs-gui-session` (ADR-003 §2).
  - **The LaunchAgent carries the installing shell's PATH,** and `--no-autostart` deletes the
    plist without stopping a loaded job (ADR-004 §1-§2).
  - **The darwin preflight is four extra checks, and a check that does not apply reports `skip`**
    (ADR-004 §4).
- **Diagram not drawn: `diagram-generator-missing`.** ADR-001's `### Diagram` brief is kept. The
  diagram-design plugin is not installed; `aof:add-diagram 175 ADR-001` draws it once it is.
- **The build needs Rust on a Mac.** This MacBook had no `cargo` (RESEARCH M3). On 2026-10-28,
  at the operator's direction during `aof:continue 175/00-02`, rustup installed stable (`cargo
  1.99.1`, x86_64-apple-darwin) into `~/.cargo` with `--no-modify-path`, so no shell profile was
  touched. `~/.cargo/bin` is not on PATH: prefix it to build. The `x86_64-pc-windows-msvc` target
  and `clippy` were added, so the app crate's Windows arm can be type-checked from this Mac.
- **arm64 is unverified.** This laptop (x86_64) is the only Mac this milestone runs on (RESEARCH
  Q3).
- **This laptop is a single-node mesh** (ADR-005, added 2026-10-28 at the operator's direction).
  It is isolated and in no mesh. It is nominated as its own control node in
  `~/.aof/aof.config.json`, so the app starts both daemons. The nomination is story 04's
  first-time setup step, and has not been written yet.
- PO recall `4530edc5-7913-4c64-98ec-0e3aa555bde9` (`--item 175`) returned nothing.

## Feedback (for retro)

- **175/00 · the declared read set was incomplete (build).** RESEARCH Q1 could only be answered from
  the installed `tao` 0.35.3 (`platform_impl/macos/app_delegate.rs`) and `tauri-runtime-wry`
  2.11.4 (`LoopDestroyed → RunEvent::Exit`) sources, and the cargo lane's shape from
  `scripts/test.mjs`. None of them is in `reads:`.
- **175/00 · a Windows-only compile error was caught only by a cross-target check (build).** The
  first `kill_now` took `&Child`, but `start_kill` needs `&mut`. The macOS `cargo check` was green,
  because that arm is `#[cfg(windows)]`. `cargo check --target x86_64-pc-windows-msvc` from the Mac
  needs a check-only `llvm-rc` stub for `tauri-winres`; with one, the Windows arm type-checks. A
  darwin build alone is not evidence for a `cfg(windows)` arm.
- **175/00 · E1 and E2 together fixed when the reap asks the plan (build).** E1 has no wait step
  when the groups exit inside the grace, and E2 has one. The shell therefore watches the groups
  after the TERM, waking early once they are all gone, and asks the plan only then. `WaitUntil` is
  the plan's guarantee that a KILL never lands inside the grace. It is not the shell's watch.

- **175/00 review close (solo, 2026-10-28): four findings routed.**
  - *Fixed at the close (Important).* A watchdog could spawn after the reap took its snapshot,
    and that child would have been orphaned. `assign_to_job` now reads the exit mark under the
    groups lock, and a spawn that lands after it is killed at once.
  - *Recorded.* A child's exit removes its group from the reap, as PLAN specifies. So when a
    daemon crashes, any grandchildren still alive in its group are not signalled at Quit. This
    is crash-containment-shaped, ADR-001 §5's deferred gap.
  - *Recorded.* A `mesh status --json` poll that is in flight at Quit is not reaped: it is
    unsupervised and in the app's own group. It ends by itself, inside 3 s in the measurement.
  - *Recorded.* On unix a daemon's Stop from the tray now SIGKILLs its whole group, where
    before it SIGKILLed only the daemon. That is R1, but the daemon gets no SIGTERM first: a
    graceful daemon stop would be a story of its own.
  - *Design lane: INCONCLUSIVE.* Surface M1 is a native menu with no `Route`, so nothing can be
    rendered. Task 02's `@manual` check at `aof:verify` is its baseline.

- **175/00 and 175/02 · the declared write sets were incomplete (build).** Each file below was
  edited because a gate named it:
  - `test/arch/testing/acd-source-directory-budget.test.mjs`: the `test/arch/ui` row 38 -> 39
    (FF-17501), `test/arch/mesh` 55 -> 56 (FF-17502), and `packages/mesh/src/commands` 20 -> 22
    (the layout and LaunchAgent modules), each with its reason.
  - `packages/mesh/package.json`: exports for the two new modules.
  - `test/arch/command/acd-cli-entry-executes.test.mjs`: FF-16004's `work find` ceiling
    739 -> 740, for the layout leaf. The plist render is imported lazily, so it costs nothing.
  - `test/bundle/yarn-installation.test.mjs`: the mesh allow-list entries for the two modules.
  - `test/mesh/desktop/mesh-desktop-preflight-heartbeat.test.mjs`: three `mesh:desktop-run`
    invocations pinned to `platform: "win32"`. Discovery now follows the host's platform, so a
    Windows-shaped seed on a Mac host must say so.
- **The whole-tree gate on this Mac is red for reasons outside 175 (verify).** Both stories'
  impacted runs widened to all 1249 suites, because the Rust paths and the new modules are not
  in the graph.
  - About 20 cases fail on macOS: `/var` vs `/private/var` realpaths (yarn-installation,
    distribution-workspaces, FF-5301, work-memory, loops-commands, 171/02), a gpg trustdb lock
    (release-fingerprint-pin), a native-lane git fixture, and timing under load.
  - `81/00` and `autonomous-shell-out` also fail in isolation with HEAD's `desktop.mjs` restored,
    so they are not 175's.
  - `aof:verify`'s regression gate should run on the Windows control node, or read these as the
    Mac baseline.
- **175/02 review close (solo, 2026-10-28): four findings routed.**
  - *Fixed at the close (Important).* `moveBundleInPlace` renamed the live bundle aside before
    moving the new one in, so a failed move left no app installed. It now restores the backup.
  - *Recorded.* The `stop` wait now applies to every non-Windows platform, linux included,
    where the contract names darwin. On linux the effect is a bounded wait for a pid that has
    already had SIGTERM.
  - *Recorded.* `install --autostart` from a shell whose PATH is empty writes an empty PATH into
    the plist. 175/03's `daemon-claude-authenticated` check is what notices it.
  - *Recorded.* RESEARCH Q2 (whether `launchctl` from SSH starts the job in the Aqua session) is
    unmeasured. It needs story 01's bundle, and it is task 04, `@manual`, at `aof:verify`.
  - *Design lane.* None: 02 has no UI surface.

- **175/01 review close (solo, 2026-10-28): three findings routed, none fixed at the close.**
  - *Recorded.* The Windows plan's `cargo build` no longer passes `--target-dir`. That is
    equivalent: `crates/app` is excluded from the desktop workspace, so it already builds into
    its own `target/`. The Windows control node confirms it at `aof:verify`, since a Mac cannot
    run that build.
  - *Recorded, from the build.* The undeclared-files list grows by two:
    `test/arch/testing/acd-source-directory-budget.test.mjs` (`test/bundle` 24 -> 25) and
    `test/arch/mesh/acd-desktop-layout-one-home.test.mjs`. The latter is FF-17502, widened over
    install-local's Windows names now that the script takes them from the layout.
    The audit ledger `scripts/workspace-runtime-audit.json` is a third. Its four `install-local`
    child-process entries are keyed on the whole file's digest, so an edit to the script makes
    them stale. They were re-reviewed and re-stamped: the expressions are unchanged, and the
    reason now names the macOS codesign step.
  - *Design lane: INCONCLUSIVE.* `LSUIElement` has no route to render. Task 02's `@manual`
    "no Dock tile" check is the baseline.

- **175/03 · the declared write set was incomplete (build).** Each file below was edited because
  a gate named it, or because the change would otherwise have widened what it reaches:
  - `test/mesh/desktop/mesh-desktop-preflight-heartbeat.test.mjs`: `probes()` pinned to
    `platform: "win32"`, or "exactly four" fails on a Mac host and real darwin probes run. Its
    copy of the "both verbs forward one list" assertion is widened like FF-12607's.
  - `test/mesh/desktop/mesh-desktop-autostart.test.mjs`: its darwin rows hand an inert runner,
    or their preflight spawns the real `xcode-select`, `cargo`, `xattr` and `claude`.
  - `packages/mesh/src/commands/desktop.mjs`: the review close's fix (below).
  - `scripts/workspace-runtime-audit.json`: the preflight's one `spawn` gained an optional
    `env`, so its child-process entry was stale. It was re-reviewed (it still runs only the file
    and argv it is handed, with no shell) and re-stamped with that reason.
- **175/03 · `files:` named a new suite file, and FF-11904 refused it (build).**
  `test/mesh/desktop` is at its ceiling of 7, and the row's reason, from 126/06, says the
  preflight already got its one file and that the next file is a case on an existing suite. So
  the darwin cases live in `mesh-desktop-preflight-heartbeat.test.mjs`, the preflight's own
  suite, as a second exported array. `mesh-desktop-preflight-macos.test.mjs` does not exist.
  Refine should name that file next time.
- **175/03 · FF-16004 caught an eager import (build).** Importing the plist reader at the top
  of the preflight put `desktop-launch-agent.mjs` on `aof work find`'s load path: 741 modules
  against a ceiling of 740. It is now loaded on the one path that reads a plist, as the
  autostart act loads its render.
- **175/03 · a near-miss in the build: an inert seam spread AFTER a row's own seam replaces it.**
  The first cut put an inert `runner` into the autostart suite's `inertPreflightCtx`. Every win32
  row spreads that helper after its registry runner, so the fake registry was silently swapped
  out. One row went red, and the rest would have passed vacuously. The darwin rows now name
  their inert runner explicitly, and the helper carries none.
- **175/03 · a real-Mac smoke of the darwin checks (build, read-only).** It ran with the darwin
  probes on their real defaults: tools `ok`, Rust `FAIL` (RESEARCH M3), the bundle `FAIL` (none
  installed under a temp home), and the daemon check `--` (no LaunchAgent). It matches this Mac.
  Task 02's `@manual` run at `aof:verify` still needs an installed app and a registered agent.
- **175/03 review close (solo, 2026-10-29): three findings routed.**
  - *Fixed at the close (Important).* The preflight never saw `--install-dir`. It arrives on
    the verb's input, and both verbs forwarded `ctx` alone, so on darwin `app-not-quarantined`
    probed the default bundle, not the one just installed or launched. Each verb now hands the
    preflight the install dir it resolved. FF-12607's face assertion (and the heartbeat suite's
    copy) admit exactly that one override, and an install row proves the placed bundle is
    the one `xattr` is asked about.
  - *Recorded (Nit).* `PREFLIGHT_CHECKS_DARWIN` is exported from the package module and
    returned by its factory, but the core binding does not pass it through to `commandTools`.
    The new suite imports it from `@aof/mesh/commands/desktop-preflight`.
  - *Recorded (Nit).* The routed-face install row (`mesh-desktop-install/01`) takes no ctx, so
    on a Mac host its preflight now also runs the real darwin probes and reads the real
    LaunchAgent. It is read-only, and the row already spawned the real `claude`. It is the same
    class as before, a little wider.
  - *Design lane.* None: 03 has no UI surface.

- **175/04 build (solo, 2026-10-29): the runbook is written; both tasks are `aof:verify`'s.**
  - `.claude/rules/build-deploy-restart.md` gains "This MacBook — a standalone single-node mesh",
    beside the other node sections, which are unchanged. It covers the first-time setup in the
    PLAN's order, deploy, the restart, verification at the source, and the gotchas, including
    the crash recovery.
  - `apps/desktop/README.md` names the macOS prerequisites and the `.app`. `ROADMAP.md`'s
    deferred items gain macOS crash containment, citing 175/ADR-001 §5.
  - Measured before it was written down: `plutil -extract EnvironmentVariables.PATH raw` reads
    the PATH out of a plist rendered by `renderLaunchAgent` (`plutil -lint` OK), and
    `env -i PATH=… HOME=…` resolves a command on exactly that PATH. Every refusal code, flag and
    `Build:` line the section names exists in the code.
  - Tests: no `@executable` scenario. The story-scoped run widened to all 1250 suites (no doc is
    in the graph) and hit its 2 h deadline, so it gave no verdict. The six suites that read these
    docs were run by file instead: four green. Two red, both in the `/private/var` realpath class
    of the Mac baseline above: `work/archive-is-a-move 00` and `work/this-tree-holds-what-is-live 00`.
  - The daemon auth probe is to be run from a terminal at the laptop. Over SSH the login keychain
    is out of reach (RESEARCH P4), so a FAIL there says nothing about the daemons. E6's UAT wording
    ("the probe … prints MESH_AUTH_OK" after an `ssh localhost` restart) should run it at the
    laptop, or read the preflight's `daemon-claude-authenticated` from the `run` output.
- **175/04 review close (solo, 2026-10-29): one finding, recorded (Nit).** The deploy rules'
  title line still frames the file as "this machine = Windows control node", and its Tests
  section says never to run the full suite "on this machine". The Mac section scopes itself, and
  the contract leaves the other sections unchanged, but a reader on this laptop meets that
  framing first.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off
- [ ] `@uat` — clone to fleet on a Mac; quit leaves no process; login brings the fleet back
