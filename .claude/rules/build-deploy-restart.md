# Build, deploy & restart (this machine = Windows control node)

`aof.exe` is a **payload-first launcher** (TECH_DEBT item 1, shipped 2026-07-26): it loads the CLI
from `~/.aof/bin/src/cli.mjs` when present and only falls back to its embedded bundle
(`AOF_SEA_EMBEDDED=1`, or a release single-file install). The program is the payload, not the binary.

## The deploy loop (any `packages/` or `apps/ui/` change)

```
node scripts/install-local.mjs        # payload file-copy — NO SEA build (~seconds)
# then restart the desktop app (see below)
```

- `--skip-ui` when `apps/ui/` didn't change.
- `--sea` ONLY when `scripts/sea-entry.mjs` (the launcher bootstrap) changed or for a release
  artefact — this is the 88 MB SEA rebuild; it is never needed for ordinary `src/` changes.
- `--desktop` ONLY when the Rust app (`apps/desktop/`) changed (cargo build, Windows only).
- `--wsl` to ALSO push the tree to the WSL worker node (below).
- The installer stamps `BUILD_ID.json`, prunes `.bak` binaries to the newest 3, and tolerates a
  locked `node-pty` under a running daemon (skip-with-warning; stop the daemon to update it).

## Restart = restart the desktop app

`aof-mesh-desktop.exe` supervises both daemons — `aof.exe mesh serve --serve` and `aof.exe mesh ui`
run as its children and die with it. Do not start daemons by hand from an agent shell; relaunch the
supervisor and let it spawn them in its own environment (a hand-spawned daemon inherits the wrong
cwd/env — workspace identity is still partly cwd-derived, TECH_DEBT item 4).

The restart flow (operator, 2026-07-27): QUIT the desktop app (its own UI — a graceful exit, never
`Stop-Process -Force`), then relaunch through the CLI verb:

```
aof mesh desktop run
```

Agents: only do this when the operator explicitly asks for a restart; otherwise install and hand
back ("restart to pick this up"). Never force-kill the process.

## Verify at the source — never assume the deploy landed

- `~/.aof/bin/aof.exe --version` → `0.1.0 (payload <buildId>)`. `embedded` or a stale buildId means
  the payload didn't land or the launcher fell back.
- Both daemons print a `Build: payload <buildId>` line at startup.
- Fleet is `http://127.0.0.1:4181/?mode=fleet` (fixed port); the control stream/serve is `:4182`.
  The board is a separate per-workspace server on an EPHEMERAL port — never hand out a board port.

## The Mac worker (umamis-mac-mini)

`aof` there is an npm symlink into `~/Source/personal/agent-orchestration-framework` — deploy is
`git pull` + the operator restarting the worker daemon. Never start/restart it over SSH (an
SSH-spawned daemon has no login session → unauthenticated `claude`, burned runs). Reading state over
SSH is fine.

## The WSL worker node (the local second machine)

A WSL2 distro is a full mesh node — own kernel, IP, filesystem and aof identity — which makes it the
cheapest way to test cross-machine behaviour without the Mac. It runs `fabric: "direct"` (no
overlay); the Windows control node is reachable from the guest on **every** IPv4 the host owns
(measured 2026-07-27: the WSL switch gateway, the LAN address, and even the Tailscale address, since
NAT routes to the host which owns it locally). No firewall rule is needed — the Hyper-V
`DefaultInboundAction = Block` governs traffic INTO the WSL VM, not the host↔guest NAT path.

Deploy (from the Windows repo):

```
node scripts/install-local.mjs --wsl --skip-ui     # ~5s on the incremental path
```

- The distro keeps its **own clone** (`~/source/aof`, `npm link`ed, `origin` = this repo) — it can
  neither run the Windows payload nor share this tree. Two hard reasons, both measured:
  **(a)** node-pty ships prebuilds for `darwin-*`/`win32-*` only — no `linux-x64` — so the distro
  must compile it; this repo's `node_modules` holds a win32 binary Linux cannot load. **(b)** Node
  resolves symlinks *before* `node_modules`, so symlinking the distro's `src/` at this one would make
  `import "ws"` resolve from the win32 tree and fail. The copy is what keeps resolution native.
- It carries **uncommitted** work — the point of a local test node, and the one thing the Mac's
  `git pull` flow cannot do. (`git fetch origin` inside `~/source/aof` pulls committed state instead.)
- `scripts/deploy-wsl.sh` is the distro-side half, and is runnable by hand. It reinstalls natively
  ONLY when `package-lock.json`'s sha changes (stamped in `.aof-wsl-deploy`) — a src-only sync after
  a dependency bump would otherwise leave a stale native binary that fails at daemon start, far from
  its cause.
- `--wsl <distro>` targets a named distro; `--wsl-dir` overrides `~/source/aof`.
- A restart is still required — modules load once at daemon start.

### The distro is deliberately SELF-CONTAINED (`/etc/wsl.conf`, 2026-07-27)

WSL appends the entire Windows PATH into every Linux shell by default, which dragged
`C:\Program Files\nodejs` (Windows node + npm, plus a stray `aof` shim from a host `npm link`) and
`AppData\Roaming\nvm` (**nvm-windows**) ahead of the Linux toolchain. Symptoms it caused: a bare
`npm ci` in the distro ran *Windows* npm against the Linux tree and failed with a bogus
`Invalid: lock file's @aof/ui@0.1.0 does not satisfy @aof/ui@`; and `nvm use 22` executed
nvm-**windows**, silently leaving `node` unresolvable. `/etc/wsl.conf` now pins:

```ini
[boot]
systemd=true                  # PRE-EXISTING — Docker Desktop integration + any systemd unit
[interop]
enabled = true
appendWindowsPath = false     # the fix — /mnt/c stays mounted, exes callable by full path
[network]
hostname = aof-wsl            # a guest otherwise INHERITS the Windows hostname
[user]
default = umami
```

plus `/usr/local/bin/{node,npm,npx,aof,claude}` symlinked, so the toolchain wins in **every** shell
type — including the non-login, non-interactive environment a worker daemon gets, which otherwise
has no Linux Node and no `claude` at all (the same class as the Mac's SSH/no-login-session failure
that burned runs). `claude` installs to `~/.local/bin` and is put on PATH only by `~/.bashrc`, which
Ubuntu's own rc early-returns out of for non-interactive shells — so it MUST be linked too:

```bash
wsl -d Ubuntu-22.04 -u root -- ln -sfn /home/umami/.local/bin/claude /usr/local/bin/claude
```

Re-run the node/npm/npx/aof links after a Node version bump; they pin a version dir. (The `claude`
link points at `~/.local/bin/claude`, itself a symlink into the installer's share dir, so Claude
Code self-updates are followed automatically.)

**Verify auth, not just resolution.** A resolvable-but-unauthenticated `claude` is exactly what
burned the Mac's runs: the binary is found, the run starts, then dies on auth. Probe the DAEMON's
environment, not your terminal's:

```bash
wsl -d Ubuntu-22.04 -- bash -c 'env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$HOME \
  bash -c "claude -p \"Reply with exactly: MESH_AUTH_OK\""'
```

Apply changes with `wsl --terminate Ubuntu-22.04` — **not** `wsl --shutdown`, which also kills the
`docker-desktop` distro.

Gotchas that bite:

- `wsl.exe` **re-serialises its argument vector**, so a multi-line script passed as one argv element
  arrives mangled (it gets echoed rather than executed). Invoke a script FILE by its `/mnt/…` path —
  that is why `deploy-wsl.sh` exists.
- `wsl -u root` runs as root with no password — the way to edit `/etc/wsl.conf` when the default
  user has no passwordless sudo (this one does not). `sudo` from a non-interactive shell just hangs
  on the password prompt.
- nvm defines `node`/`npm` as shell functions in `~/.bashrc`, which Ubuntu's own rc early-returns
  out of for non-interactive shells — hence the `/usr/local/bin` links above. nvm is also not
  `set -u` clean.
- The guest hostname collision is ALSO handled at the aof layer, and both belt and braces are
  wanted: register with `aof mesh identity --name aof-wsl --address <guest-ip>`, pinned in the
  identity sidecar so the load-time self-heal never churns it back.
- The guest's NAT IP changes when the distro restarts. That does **not** break the stream —
  admission is by enrollment credential, not remote address. It only affects roster display.

## This MacBook — a standalone single-node mesh (macOS, milestone 175)

This laptop is isolated and in no mesh: it is its own control node, and nothing below assumes any
other machine (175/ADR-005). The desktop app supervises both daemons exactly as on Windows,
from an ad-hoc-signed `~/.aof/bin/aof-mesh-desktop.app` that lives in the menu bar, with no Dock
tile. Only x86_64 is verified; arm64 builds the same way but is unmeasured (175 RESEARCH Q3).

**Two halves of one deploy loop.** The `aof` you type is the npm link into this checkout, so a
`packages/` change reaches the CLI live and needs no install. The daemons run the PAYLOAD, through
`~/.aof/bin/aof` (the supervisor never runs the npm-linked `aof`, 175/ADR-002 §6), so they need
`install-local` and a restart, exactly as on Windows.

### First-time setup, in this order

1. **The build prerequisites.** These are needed only to BUILD the app, never to run it:
   - the Xcode command-line tools: `xcode-select --install`, or Xcode itself; `xcode-select -p`
     must resolve;
   - Rust through `rustup` (https://rustup.rs), then a new shell so `cargo` is on PATH.
2. **Build and place everything:** `node scripts/install-local.mjs --desktop`. This builds the
   payload and the release app, assembles and ad-hoc signs the `.app`, and places both in
   `~/.aof/bin`. It never edits a shell profile.
3. **Nominate this laptop as its own control node** (175/ADR-005). Without it, `mesh status`
   answers `isControlNode: false` and the app starts `mesh ui` only. Read the id, never type it
   from memory:
   ```
   aof mesh relay --json          # → "nodeId": "<id>"
   ```
   then set it in the GLOBAL config `~/.aof/aof.config.json`, the one the supervisor's cwd-less
   `mesh status` reads. Merge it into the file if one exists:
   ```json
   { "mesh": { "relay": { "controlNode": "<id>" } } }
   ```
   `aof mesh status --json` must now answer `isControlNode: true`. There is no verb for this. It
   is a config key, as on the Windows control node.
4. **Install the app and register login autostart**, from a shell whose PATH resolves `claude`.
   The LaunchAgent captures THIS shell's PATH, and the daemons spawn `claude` by name:
   ```
   aof mesh desktop install --app-artifact ~/.aof/bin/aof-mesh-desktop.app --autostart
   ```
   This writes `~/Library/LaunchAgents/com.aof.mesh.desktop.plist` (`RunAtLoad`, Aqua session,
   `KeepAlive` false). It starts nothing.
5. **Start it:** `aof mesh desktop run`. With the LaunchAgent registered, launchd starts it, in
   the login session.

Read the preflight both verbs print. On a Mac it adds `macos-command-line-tools`,
`rust-toolchain`, `app-not-quarantined` and `daemon-claude-authenticated`. The last one asks
`claude` in the LaunchAgent's own environment. `--` means no LaunchAgent is registered, so there
was nothing to probe.

### Deploy

```
node scripts/install-local.mjs --skip-ui             # a packages/ change (add nothing for the CLI)
node scripts/install-local.mjs --skip-ui --desktop   # ALSO when apps/desktop/ changed
```

Drop `--skip-ui` when `apps/ui/` changed. Then restart. Modules load once at daemon start.

### Restart: the one restart that is legal over SSH

```
aof mesh desktop stop && aof mesh desktop run
```

- `stop` sends the app a SIGTERM (a graceful Quit that reaps both daemons' process groups). It
  then waits until the app has gone, and never force-kills. If it times out, it names the pid and
  leaves it alone.
- `run` then starts the app THROUGH LAUNCHD, inside the login session. That is what makes this
  pair legal from `ssh` as well as from a terminal at the laptop, but ONLY with the LaunchAgent
  registered. Without one, `run` over SSH refuses with `desktop-run-needs-gui-session`.
- Starting a daemon (or the app's executable) by hand over SSH is still forbidden. An SSH session
  is outside the Aqua login session, so it has no login keychain, which is where `claude` keeps
  its credentials on macOS. The daemon would run, and every supervised run would die on auth.

### Verify at the source

- `~/.aof/bin/aof --version` answers `0.1.0 (payload <buildId>)`, with the buildId in
  `~/.aof/bin/BUILD_ID.json`. `embedded`, or a stale id, means the payload did not land.
- Both daemons print `Build: payload <buildId>` at startup.
- `aof mesh status --json` answers `isControlNode: true`. `http://127.0.0.1:4181/?mode=fleet`
  lists one node, this one.
- **Verify auth in the DAEMONS' environment, not the terminal's.** launchd hands the app the
  plist's PATH and nothing of your shell. Run `claude` with exactly that PATH and HOME, from a
  terminal at the laptop:
  ```bash
  P="$(plutil -extract EnvironmentVariables.PATH raw -o - ~/Library/LaunchAgents/com.aof.mesh.desktop.plist)"
  env -i PATH="$P" HOME="$HOME" claude -p "Reply with exactly: MESH_AUTH_OK"
  ```
  The preflight's `daemon-claude-authenticated` asks the same question with `claude auth status`,
  which spends no tokens.

### Gotchas

- **A Node version bump makes the captured PATH stale.** The plist still names the old nvm
  `bin`, so `claude` and `node` stop resolving for the daemons. `daemon-claude-authenticated`
  turns FAIL while your terminal's `claude-authenticated` stays ok. The fix is to re-run
  `aof mesh desktop install --app-artifact ~/.aof/bin/aof-mesh-desktop.app --autostart` from the
  new shell, then restart.
- **The process name is `aof-mesh-desktop`,** exactly 16 characters, macOS's `MAXCOMLEN`. That is
  why `pgrep -x aof-mesh-desktop` finds it. A longer name would silently stop matching.
- **Quarantine.** A locally built app is not quarantined. One that arrived by download is, and
  macOS refuses to open it. `app-not-quarantined` names the fix:
  `xattr -dr com.apple.quarantine ~/.aof/bin/aof-mesh-desktop.app`.
- **Recovery after a supervisor crash.** Quit, `stop` and a logout reap everything. But if the app
  is killed with SIGKILL or crashes, its daemons survive: macOS has no parent-death signal, and
  containment is deferred (`wiki/work/ROADMAP.md`, 175/ADR-001 §5). The next `run` then meets
  `:4181`/`:4182` in use. Recover by hand:
  ```
  pgrep -fl "aof mesh"              # the orphaned daemons
  kill -TERM <pid> ...              # SIGTERM each: they shut down cleanly on it
  aof mesh desktop run
  ```
  This is a recovery, not part of the restart. A pty session that ignores its daemon's shutdown
  can outlive even a clean Quit's SIGKILL rung. `pgrep -fl "aof mesh"` finds it the same way.

## Tests (hook-enforced, but know why)

Never run aof tests without `AOF_GLOBAL_HOME=$(mktemp -d)` — unisolated runs write fixtures into the
real `~/.aof` (config AND mesh stores) and pollute the live soak. Never run the full suite on this
machine — `global-work-propagation.test.mjs` binds `:4182`, which the live control daemon holds; run
focused suites via test-array imports instead.
