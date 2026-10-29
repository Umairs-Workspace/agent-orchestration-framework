# 02 · The desktop verbs run the app on macOS — build plan

## Mechanism

**Two pure leaves, then the platform branches.** Start with `desktop-layout.mjs`: per-platform
names and paths, as functions of `{ platform, installDir, home }`. Then `desktop-launch-agent.mjs`:
`renderLaunchAgent({ executable, path })` returns the plist XML, and `readLaunchAgentPath(xml)`
returns the PATH back out (story 03 reads it). Neither does I/O, so FF-12607's sweep stays quiet
over both.

`desktop.mjs` then branches on the platform it is handed:
- `installDesktopApp` stages the bundle directory (a recursive copy) instead of two files on
  darwin, and keeps `moveInPlace`'s rename-aside for a running app.
- `discoverDesktopApp` checks the inner executable and its execute bit.
- `launchDesktopApp` takes a `launchctl` runner beside `spawnFn`. It asks
  `launchctl print gui/<uid>/<label>`, then kickstarts, bootstraps or spawns, in that order.
- `stopDesktopApp` keeps `kill -TERM`, then polls `kill -0 <pid>` through the same runner until
  each pid is gone or 20 s pass.
- `applyAutostart` writes or removes the plist file on darwin, through an injected file seam.
  It never calls `launchctl` on that path.

Look at `stopDesktopApp` and `applyAutostart` today. Every OS reach is a call on an injected
runner, and the tests hand in a fake that models the OS state. Follow that, and model `launchctl`
the way `mesh-desktop-autostart.test.mjs` models the registry key.

## Verification step

On this Mac, from the GUI terminal:
1. Build the app (story 01), then run `aof mesh desktop install --app-artifact <built .app>
   --autostart`.
2. `plutil -p ~/Library/LaunchAgents/com.aof.mesh.desktop.plist` shows the shell's PATH.
3. `aof mesh desktop run` starts the app. `launchctl print gui/$(id -u)/com.aof.mesh.desktop`
   shows it running.
4. `aof mesh desktop stop` returns only once `pgrep -x aof-mesh-desktop` is empty.
5. Repeat steps 3 and 4 from `ssh localhost`.

A `stop` that returns while the pid is still alive means the poll is not wired. A `run` over SSH
that starts the app without `launchctl` means the order is wrong.

## Out of scope

- The preflight's darwin checks — story 03.
- Building or assembling the bundle — story 01. Tests here use a fixture bundle directory.
- The app's own handling of SIGTERM — story 00. Here, `stop` only sends SIGTERM and waits.

## Known traps

- `parseSpecArgv` has no `--no-` negation, so `noAutostart` is its own boolean, as today.
- `acd-mesh-command-cli-bijection` spawns every mesh verb with `--json`. On a Mac with autostart
  registered, that probe must not kickstart the real app. The plist lives under the real
  `~/Library`, not under `AOF_GLOBAL_HOME`. So `run` discovers the bundle in the install dir
  FIRST, and the isolated home's `desktop-not-installed` refusal comes before any `launchctl`
  call. Keep that order. Tests hand the layout an injected `home`.
