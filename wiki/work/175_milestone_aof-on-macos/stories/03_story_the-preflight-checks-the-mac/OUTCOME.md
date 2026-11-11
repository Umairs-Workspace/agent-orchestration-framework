# 03 · The preflight checks the Mac — Outcome

## Delivered

### The darwin preflight
On macOS the preflight adds `macos-command-line-tools`, `rust-toolchain`, `app-not-quarantined` and `daemon-claude-authenticated`, and a check with nothing to probe reports `--`.

### The daemons' claude is probed in their environment
`daemon-claude-authenticated` runs `claude auth status` with the LaunchAgent's PATH and launchd's `HOME`, `USER` and `LOGNAME` alone, so it answers as a supervised run would (FF-12607).
