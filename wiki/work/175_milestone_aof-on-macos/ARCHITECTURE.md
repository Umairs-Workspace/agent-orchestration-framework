---
doc: architecture
---
# 175 · aof on macOS — Architecture Decisions

The architect's recall `2cf4c82c-8028-4976-be48-bbef339273d0` (`--area architecture`) returned five
records. Three bear on these decisions, and all three are honoured:

- **m126/ADR-007** (autostart is a flag on `install`, reached through one injected runner, and a
  Windows service is refused because session 0 has no login) is **honoured** by ADR-004. The
  macOS LaunchAgent is that flag's darwin branch. A LaunchDaemon is refused on the same grounds:
  it has no Aqua session, so it cannot reach the keychain.
- **m36/ADR-002** (the Job Object sits behind a neutral "reap the supervised tree" seam, and a
  later macOS tray swaps in a process group) is **honoured** by ADR-001. It fills that seam and
  leaves the seam's shape alone.
- **m167/ADR-006** (the desktop guard samples CPU and never kills) is **honoured**. The reap lives
  on the exit path and the stop ladder, never in the guard. The darwin CPU sampler stays `None`,
  and that is out of scope here.

m167/ADR-001 and m164/ADR-004 were also returned. Neither bears on these decisions.

**Graph-derived coupling** (`aof graph build .`, 2026-10-28T18:10:35Z, 20,919 nodes, egress none).
`aof graph impact` finds four islands, and nothing joins them:
- `apps/desktop/crates/app/src/supervisor.rs` has one dependent, `main.rs`, and depends only on the
  desktop core crate.
- `packages/mesh/src/commands/desktop.mjs` has one dependent, its binding
  `packages/core/src/application/bindings/commands/mesh/desktop.mjs`.
- `desktop-preflight.mjs` has likewise one dependent, its own binding.
- `scripts/install-local.mjs` has one dependent, `test/bundle/core-workspace.test.mjs`, and
  imports no `packages/` module.

The breakdown follows those islands. The one new edge is ADR-002's layout module, which the
verbs, the preflight and `install-local` all import. Facts are cited from `RESEARCH.md` as M1–M13.

## ADR-001: On macOS each supervised child leads its own process group, and every exit path reaps the groups (SIGTERM, a bounded grace, then SIGKILL)

**Status:** Accepted
**Date:** 2026-10-28

**Context.** On Windows, the Job Object reaps the whole tree when its handle closes. That covers a
Quit, the supervisor's own crash, and a forcible terminate. Off Windows the seam is empty (M8):
quitting orphans both daemons and everything under them. The daemons already stop cleanly on
SIGTERM (M7). The libc and tokio APIs the reap needs are already locked (M6). macOS has no
parent-death signal (P2).

**Decision.**
1. **Spawn.** On unix, every supervised child (the two daemons and each declaration) is spawned
   with `process_group(0)`, so its pid is its process-group id. This happens beside the existing
   `assign_to_job` call, behind the same neutral seam: the Windows arm keeps the Job Object, and
   the unix arm records the group.
2. **The reap ladder.** The reap is one pure plan in `mesh_desktop_core`, which `cargo test`
   reaches: given the live groups, signal each with SIGTERM, wait up to **5 s** for them to
   exit, then send SIGKILL to each group that survives. The app crate only carries the plan out,
   with `libc::killpg`. There is no `kill` spawn, so the trusted-spawn surface shrinks.
3. **The stop ladder's last rung signals the group.** `tree_kill` on unix becomes
   `killpg(pgid, SIGKILL)`, never a bare pid.
4. **Every exit path reaches the reap.** The reap runs on `RunEvent::Exit`. Three exits pass
   through it: Quit (`app.exit(0)`), SIGTERM, and an OS quit (logout, or a `quit` Apple Event).
   The app installs a SIGTERM handler (tokio `signal` feature, an existing crate) that calls the
   same `app.exit(0)` Quit calls. An OS quit must not be prevented. The window's close still hides
   it to the tray (`prevent_close`), so no window ever closes on its own. The implicit-exit guard
   therefore never needs to block an exit on macOS. The build measures how tao delivers an OS quit
   (RESEARCH Q1) and narrows the guard on darwin to whatever that measurement shows.
5. **Crash containment is deferred, and recorded.** If the supervisor is killed with SIGKILL or
   crashes, its groups survive (P2). Containing that needs the daemons to watch their parent,
   which is daemon code and outside this milestone. This is unfinished work, not a design
   defect, so it goes in `ROADMAP.md`'s "Other deferred items", not in TECH_DEBT. Story 04
   records it there, and its runbook gives the recovery.

**Alternatives considered.**
- *`kill -TERM -<pgid>` through `Command`.* Rejected. It adds a non-`aof` spawn per child at
  exit, and it fails exactly when the process table is under pressure.
- *`setsid` per child.* Rejected. A process group is enough to reach a node child's descendants,
  and a new session would also detach the controlling terminal, which buys nothing here.
- *Let launchd reap the job's process group.* Rejected. That covers only a LaunchAgent launch,
  not `run`'s direct spawn, and the children leave the job's group in (1) anyway.
- *A parent-watch inside the daemons (a `ppid` poll).* Deferred, see (5). It is the right fix for
  crash containment, but it is daemon code.

**Consequences.** On macOS, Quit, a `stop` and a logout each leave no `aof` process behind. The
one exception is a pty session that ignores its daemon's shutdown on the SIGKILL rung (P3), and
the runbook names it. A crash still orphans the daemons. The next `run` then meets `:4181` or
`:4182` in use, which the supervisor already reports as a named clean exit.

**Invariant.** On unix, every supervised spawn sets a process group, and the unix tree kill
signals that group, never a bare pid. See FF-17501.

### Diagram

Four exit paths converge on one reap, and the reap is a three-step ladder. That convergence is the
design, and it is easy to break by adding an exit that skips it. View: a flow from the exit
sources into the reap. Components: the tray's Quit, a SIGTERM from `aof mesh desktop stop`, an OS
quit (logout, or a `quit` Apple Event), the window's close (which hides and never exits),
`RunEvent::Exit`, the reap plan (SIGTERM to each group, a 5 s grace, SIGKILL to survivors), and
the supervised process groups (`mesh serve --serve`, `mesh ui`, declarations). Flows: Quit, SIGTERM
and OS quit reach `app.exit(0)`, then `RunEvent::Exit`, then the plan, then the groups. Close goes
to hide only. A supervisor crash reaches nothing, which is the deferred gap.

## ADR-002: The macOS app is an `.app` bundle that `install-local` assembles from the cargo build, described by one committed `Info.plist`; its on-disk names live in one layout module

**Status:** Accepted
**Date:** 2026-10-28

**Context.** On Windows, `install-local --desktop` runs `cargo build --release` and places the raw
exe. The `nsis` bundler output is never used. On macOS a menu-bar app needs a bundle: an
`Info.plist` with `LSUIElement` and a bundle id. Producing one with the Tauri CLI would add a new
build tool. The app finds `aof` from the home directory (M9). Today the names the install and
the verbs share (`aof-mesh-desktop.exe`, the install dir) are spelled twice: `install-local.mjs`
says it "mirrors" `desktop.mjs`, and the graph shows the two files share no import.

**Decision.**
1. **Assembly.** `install-local --desktop` on darwin runs the same `cargo build --release`, then
   assembles `~/.aof/bin/aof-mesh-desktop.app`:
   - `Contents/MacOS/AOF Desktop` (the release binary);
   - `Contents/Info.plist`, copied from the committed `apps/desktop/crates/app/Info.plist`.
   The bundle is ad-hoc signed with `codesign --force --deep --sign -`. `CFBundleIdentifier` is
   `com.aof.mesh.desktop`, the identifier `tauri.conf.json` already declares.
2. **The executable name is `AOF Desktop`,** 11 characters, inside `MAXCOMLEN`, so `pgrep -x`
   matches it (M4). The FF-17502 sweep includes this name.
   *Amended at verify, 2026-10-29 (175/F-05).* It was `aof-mesh-desktop`. Login Items lists an
   ad-hoc-signed app's LaunchAgent as a "legacy agent" named after its executable, and
   `AssociatedBundleIdentifiers` is honoured only under a Developer Team ID. So the executable
   is the one name the operator sees. The bundle directory, bundle id and label are unchanged.
   Linux keeps `aof-mesh-desktop` as its `pgrep` name.
3. **Re-install and prune.** A re-install renames the live bundle to
   `aof-mesh-desktop.app.bak.<ts>` and then places the new one; a running app keeps its mapped
   image. Bundles are pruned to the newest 3, as binaries are. A bundle is a directory, so the
   prune removes it recursively.
4. **Host architecture only.** Each Mac builds for its own architecture, and there is no
   universal binary. This milestone verifies x64 only (RESEARCH Q3).
5. **One home for the layout.** `packages/mesh/src/commands/desktop-layout.mjs` is a pure module
   with no I/O. It holds the per-platform app names (the Windows exe, the bundle, its inner
   executable), the bundle id, the LaunchAgent label and the plist's path. `desktop.mjs`, the
   preflight and `install-local` import it, and none of them spells those names itself
   (FF-17502). The Windows constants move into it unchanged.
6. **The supervisor runs `~/.aof/bin/aof`, the payload launcher.** It never runs the npm-linked
   `aof`: m36/ADR-004's trusted co-located spawn stands. On the Mac, a code change reaches the
   CLI live through the npm link and reaches the daemons through `install-local` plus a restart.
   `install-local` never edits a shell profile, so `ensureOnPath` (dead code, M2) is deleted.
7. **`tauri.conf.json` gains no `app` target.** This departs from the SPEC's wording. Nothing
   runs the Tauri bundler, on either platform. The committed `Info.plist` sits where the Tauri
   bundler would merge it, so a later release milestone that adopts the bundler starts from the
   same file.

**Alternatives considered.**
- *`cargo tauri build --bundles app`.* Rejected. It needs `@tauri-apps/cli` or `cargo install
  tauri-cli`, a new supply-chain dependency, to produce one plist and a directory.
- *Place the raw binary, as Windows does.* Rejected. Without `LSUIElement` the app shows a Dock
  tile and an app menu, and without a bundle id it has no stable identity for the OS to quit it by.
- *Run the npm-linked `aof` from the supervisor.* Rejected. It is a PATH lookup, which m36/ADR-004
  forbids, and the payload's buildId is how a deploy is verified at the source.

**Consequences.** One file describes the bundle, and one module names it. The Mac deploy loop is
the Windows one: `install-local`, then a restart. Signing for distribution stays out of scope.

**Invariant.** The bundle, executable, bundle-id and LaunchAgent names are spelled only in the
layout module, `Info.plist` and `tauri.conf.json`. See FF-17502.

## ADR-003: On macOS, `run` starts the app through launchd when its LaunchAgent is registered, and otherwise spawns it directly, but not from SSH; `stop` asks it to quit and waits, and never force-kills

**Status:** Accepted
**Date:** 2026-10-28

**Context.** A process started over SSH sits outside the Aqua session, so it has no keychain and
no authenticated `claude` (P4). A process started from a terminal in the GUI session inherits
that shell's PATH. A process launchd starts gets the plist's environment (P1). Today `stop` sends
SIGTERM without waiting (M10), so a `stop` followed by `run` would hand off to a dying instance
through the single-instance plugin, and nothing would be left running. The verbs reach the OS only
through injected runners (M12).

**Decision.**
1. **`install`** on darwin places the `.app` from `--app-artifact`, a directory, by the same
   stage-then-swap. It needs no bootstrapper: the bootstrapper artifact is a win32-only
   requirement. `discover` checks for the bundle's inner executable and its execute bit.
2. **`run`** on darwin:
   - If the LaunchAgent is loaded in `gui/<uid>`, run `launchctl kickstart gui/<uid>/<label>`.
   - Else, if its plist exists, run `launchctl bootstrap gui/<uid> <plist>`.
   - Else, spawn the inner executable detached, as today.
   - A direct spawn from an SSH session (`SSH_CONNECTION` set) is refused as
     `desktop-run-needs-gui-session`. The message names `install --autostart` as the way to start
     the app from SSH.
   launchd starts the app inside the Aqua session, so the restart path needs no login shell
   (RESEARCH Q2).
3. **`stop`** on darwin sends SIGTERM to each supervisor pid. That is a graceful Quit (ADR-001 §4).
   It then waits for each pid to exit, polling for up to **20 s**: the 5 s reap grace plus
   headroom. If a pid outlives the wait, the verb refuses with `desktop-stop-timeout`, names the pid
   and leaves it running. Nothing on the darwin path sends SIGKILL (FF-17503).
4. **Windows is unchanged.** Its `stop` stays the forcible terminate that the Job Object makes
   safe (130/ADR-004, TECH_DEBT 20(b)).
5. **One runner.** `launchctl`, `kill`, `pgrep` and the pid poll go through the one injected
   runner, and `--dry-run` covers each verb as it does today. FF-12607's sweep widens to cover them.

**Alternatives considered.**
- *`open -a <bundle>`.* Rejected. LaunchServices passes no shell environment, and from SSH it
  either fails or launches outside the user's control.
- *`osascript -e 'quit app id …'` for `stop`.* Rejected. It depends on how tao delivers an Apple
  Event quit (RESEARCH Q1), while SIGTERM is under the app's own control.
- *Let `run` over SSH spawn anyway, with a warning.* Rejected: a daemon started that way runs
  `claude` unauthenticated, and that burns runs.

**Consequences.** On the Mac, `aof mesh desktop stop && aof mesh desktop run` is a scriptable
restart, from SSH included, once autostart is registered. A `stop` that returns means the app
has gone.

**Invariant.** The darwin `stop` path sends no SIGKILL. See FF-17503.

## ADR-004: Login autostart on macOS is a per-user LaunchAgent in the Aqua session, carrying the installing shell's PATH, and the preflight probes the daemons' environment and the macOS prerequisites

**Status:** Accepted
**Date:** 2026-10-28

**Context.** `admitAutostartPlatform` admits only `win32`. The SPEC calls for a login autostart
with no terminal open, in the session that holds the keychain. Processes launchd starts get a
minimal PATH (P1), but `claude` is spawned by name, so without a real PATH every supervised run
would die on "claude not found". The app cannot ask a login shell for its PATH (M11). On WSL the
lesson was to probe the daemon's environment, not the terminal's (`.claude/rules/build-deploy-restart.md`).

**Decision.**
1. **`--autostart` on darwin writes `~/Library/LaunchAgents/com.aof.mesh.desktop.plist`.** The
   plist is a pure render, written as XML text with no spawn. It carries:
   - `Label` and `ProgramArguments`: the absolute inner executable;
   - `RunAtLoad: true`, `LimitLoadToSessionType: Aqua`, `ProcessType: Interactive`;
   - `KeepAlive: false`, so Quit stays quit, as with the Windows Run key;
   - `EnvironmentVariables.PATH`: the PATH of the shell that ran `install`.
   A rewrite is idempotent, and the write never starts or stops the app.
2. **`--no-autostart` deletes the plist,** and an absent plist is a success (`alreadyAbsent`). It
   does not bootout a loaded job, because that would stop a running app. The removal takes effect
   at the next login.
3. **`admitAutostartPlatform` admits `win32` and `darwin`, exactly.** Every other value is
   refused by name, as today.
4. **The preflight's darwin checks.** On darwin the preflight adds checks after the four existing
   ones, each reached through the one injected runner:
   - `macos-command-line-tools`: `xcode-select -p` resolves;
   - `rust-toolchain`: `cargo --version`. This one and the one above are needed only to build the
     app, and their messages say so;
   - `app-not-quarantined`: `xattr -p com.apple.quarantine` on the bundle finds nothing;
   - `daemon-claude-authenticated`: `claude auth status` run with the plist's PATH, `HOME`, `USER` and `LOGNAME` (amended at verify, 175/F-09: `claude` finds its keychain sign-in under `USER`), and
     nothing else, reports `loggedIn: true`. With no plist registered, it reports that the check
     does not apply.
   Windows reports the same four checks it does today. The platform is an input, as in the
   autostart act.

**Alternatives considered.**
- *A LaunchDaemon.* Refused on m126/ADR-007 §5's basis: it runs as root, outside any login
  session, with no keychain.
- *SMAppService or a Login Item.* Rejected. It needs a signed app and a Swift API, and
  Developer ID signing is out of scope.
- *Have the supervisor resolve the login shell's PATH.* Rejected: it is a shell spawn from Rust
  (M11).
- *Symlink `claude` into `/usr/local/bin`, as on WSL.* Rejected. `/usr/local/bin` is not on
  launchd's PATH either.

**Consequences.** After a Node version change the captured PATH goes stale. The remedy is to re-run
`install --autostart`, and `daemon-claude-authenticated` is the check that notices. The preflight
reports and never repairs, as before.

## ADR-005: This laptop is a single-node mesh, nominated as its own control node in the global config; the desktop app's role rule stays as it is

**Status:** Accepted
**Date:** 2026-10-28

**Context.** This laptop is isolated and part of no mesh. Its `mesh status` answers
`isControlNode: false`. The app starts `mesh serve --serve` only on a control node, so it would
start only `mesh ui` here (RESEARCH M13), and the SPEC's "both daemons healthy" would not hold.
A node is the control node when `mesh.relay.controlNode` equals its own `mesh.nodeId`, which is
`node-6eb3` here. No verb sets that; it is a config key.

**Decision.**
1. **The laptop is nominated as its own control node.** `~/.aof/aof.config.json`, the global
   workspace config that the supervisor's cwd-less `mesh status` reads, gets
   `"mesh": { "relay": { "controlNode": "<this node's id>" } }`. The node id is read with
   `aof mesh relay --json`, never typed from memory. The result is a mesh of one node, and the
   app's existing role latch starts both daemons.
2. **The role rule in the desktop core does not change.** An un-nominated node is still a
   worker. "Not in a mesh" is not made to mean "control", because that would make every fresh
   install an enrollment authority nobody chose.
3. **The runbook's first-time setup names the nomination as a step,** between installing the
   app and the first `run` (story 04). The step is a documented config edit, as on the Windows
   control node. There is no new verb.

**Alternatives considered.**
- *Treat a node with no mesh config as its own control node.* Rejected. It changes the role
  rule for every install, and silently turns a fresh worker into an enrollment authority.
- *A `mesh relay --nominate` verb.* Deferred. It is a real convenience, but one config key on one
  machine does not need a new verb in this milestone.

**Consequences.** On this laptop the menu shows Start/Stop mesh, the fleet view lists one
node, and `aof mesh invite` would work if a node were ever added. The laptop stands alone.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-17501 | On unix every supervised spawn in `apps/desktop/crates/app/src/supervisor.rs` sets `process_group(0)`, and the unix tree kill reaches `killpg`, never a bare-pid signal or a `kill` spawn | `test/arch/ui/acd-desktop-reaps-process-groups.test.mjs` (pending) | ADR-001 |
| FF-17502 | `aof-mesh-desktop.app`, the `aof-mesh-desktop` executable, `com.aof.mesh.desktop` and the LaunchAgent plist name are spelled only in `packages/mesh/src/commands/desktop-layout.mjs`, `apps/desktop/crates/app/Info.plist` and `apps/desktop/crates/app/tauri.conf.json`, among `packages/`, `scripts/` and `apps/desktop/` | `test/arch/mesh/acd-desktop-layout-one-home.test.mjs` (pending) | ADR-002 |
| FF-17503 | `stopDesktopApp`'s darwin path sends no SIGKILL (`-KILL`, `-9`, `SIGKILL`), and every `launchctl`, `pgrep` and `kill` in `desktop.mjs` and `desktop-preflight.mjs` is an argument to the injected runner | `test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs`, legs widened by story 02 | ADR-003, ADR-004 |
