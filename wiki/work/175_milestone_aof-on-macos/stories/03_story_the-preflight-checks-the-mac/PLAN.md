# 03 · The preflight checks the Mac — build plan

## Mechanism

**One more guarded list, chosen by platform.** `runPreflight` already returns the four checks,
each inside `guarded(code, run)`, through injected seams (`claudeFn`, `buildInfoFn`, …). Add a
frozen `PREFLIGHT_CHECKS_DARWIN` beside `PREFLIGHT_CHECKS`. When the `platform` seam is
`darwin`, append four guarded checks in that order. Each one reaches its tool through an injected
runner, as `checkClaudeAuthenticated` reaches `claude`.

The daemon probe is the one with a new shape. It reads the plist (an injected file reader; the path
comes from story 02's layout module) and takes the PATH with story 02's reader. It then runs
`claude auth status` through the runner, with an env of exactly `{ PATH, HOME }`. Reuse
`checkClaudeAuthenticated`'s `loggedIn` parse rather than writing a second one, and pass the env
through the runner's options. The default runner must therefore accept an `env`.

`renderPreflight` maps `pass` to `ok`, `skip` to `--` and anything else to `FAIL`. Both verbs
already share it.

## Verification step

On this Mac, before and after `install --autostart`:
1. Run `aof mesh desktop run --json` with no LaunchAgent. It shows eight checks, and
   `daemon-claude-authenticated` is `skip`.
2. Register the agent from a shell whose PATH lacks `claude`. Run it again: the check now fails,
   although `claude-authenticated` (the terminal's own) may pass.

If the two checks agree in that second run, the probe used the terminal's environment, which is
exactly the trap this story exists to close.

## Out of scope

- Repairing anything: the preflight reports, as m126/ADR-007 §4 says.
- A Linux preflight. Linux reports the four, as today.

## Known traps

- `claude auth status` exits 0 whether or not you are signed in. Read `loggedIn` (m126/ADR-007
  amendment §5).
- A fixture-free test run on a Mac host would otherwise reach the real `xcode-select`. Every
  darwin probe takes the injected runner, and the suites always pass one in.
