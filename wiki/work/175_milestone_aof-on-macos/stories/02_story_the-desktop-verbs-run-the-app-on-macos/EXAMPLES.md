# 175/02 · The desktop verbs run the app on macOS — example map

## R1 · On macOS, install places the app bundle and needs no bootstrapper
- E1 · `install --app-artifact <dir>/aof-mesh-desktop.app` on darwin with no `--bootstrapper-artifact`: the bundle is placed at `<installDir>/aof-mesh-desktop.app`, and `run` then finds its `Contents/MacOS/aof-mesh-desktop` [proposed]
- E2 · On darwin, an `--app-artifact` directory with no `Contents/MacOS/aof-mesh-desktop` inside: refused `app-artifact-missing`, and the install dir holds what it held before [proposed]
- E3 · On win32 with no `--bootstrapper-artifact`: still refused `bootstrapper-artifact-missing` [proposed]

## R2 · run starts the app in the login session
- E4 · The LaunchAgent `com.aof.mesh.desktop` is loaded in `gui/501`: run asks the runner for `launchctl kickstart gui/501/com.aof.mesh.desktop`, and spawns nothing [proposed]
- E5 · The plist is on disk but not loaded: run asks for `launchctl bootstrap gui/501 <home>/Library/LaunchAgents/com.aof.mesh.desktop.plist` [proposed]
- E6 · No plist, from a GUI terminal: run spawns `<installDir>/aof-mesh-desktop.app/Contents/MacOS/aof-mesh-desktop` detached [proposed]
- E7 · No plist, with `SSH_CONNECTION` set: refused `desktop-run-needs-gui-session`, the message names `install --autostart`, and nothing is spawned [proposed]

## R3 · stop asks the app to quit, waits for it, and never force-kills it
- E8 · Supervisor pid 812 is gone 2 s after SIGTERM: the answer is `stopped: [812]`, and no SIGKILL was asked for [proposed]
- E9 · Pid 812 is still alive after 20 s: refused `desktop-stop-timeout` naming 812, and still no SIGKILL [proposed]
- E10 · No supervisor is running: success with `alreadyStopped: true` [proposed]

## R4 · --autostart registers a LaunchAgent on macOS
- E11 · `install --autostart` on darwin with PATH `/Users/u/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin`: the plist carries that PATH, `RunAtLoad` true, `LimitLoadToSessionType` Aqua and `KeepAlive` false, and no `launchctl` call is made [proposed]
- E12 · `install --no-autostart` on darwin with no plist: success with `alreadyAbsent: true` [proposed]
- E13 · `install --autostart` on linux: refused `autostart-unsupported-platform` naming `linux`, and nothing is placed [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-003 · How long does stop wait? 20 s: the 5 s reap grace plus headroom, polled.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-004 · Which PATH does the LaunchAgent carry? The installing shell's PATH, captured at install time.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-004 · Does --no-autostart stop a loaded job? No. It deletes the plist, and the change takes effect at the next login.
