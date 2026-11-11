# 02 · The desktop verbs install, run and stop the app on macOS — Outcome

## Delivered

### The desktop verbs on darwin
`install` places the `.app`. `run` starts it through launchd in the login session, reloading a loaded-but-stopped job from its plist and refusing over SSH when no LaunchAgent exists. `stop` sends SIGTERM and waits up to 20 s, never force-killing.

### Login autostart
`install --autostart` writes the LaunchAgent `com.aof.mesh.desktop` (`RunAtLoad`, Aqua session, `KeepAlive` false, the installing shell's PATH), and Login Items lists it as "AOF Desktop".

## Assumptions

- **The LaunchAgent's PATH is the installing shell's** — a Node version bump leaves it stale until `install --autostart` is re-run.

## Gaps

### `stop` finds the app by name
- **Status:** open
- **Discharge condition:** `stop` matches the installed bundle's executable path.
`stop` identifies the app with `pgrep -x`, so any process with the same name is signalled too (F-06).
