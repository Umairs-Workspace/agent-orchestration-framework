# 209/04 · Daemon board access

## Mechanism

Add a sixth check, `board-access`, to `PREFLIGHT_CHECKS` after `control-relay-loopback`. It runs on every platform inside the same `guarded` wrapper. It walks the roster `resolveRoster` already returns and selects the workspaces whose config sets a `work.store` manifest. A roster with none answers `skip` and starts nothing.

For each board workspace the check asks the existing `runner` seam to start the installed `aof` with `work board-access --json`, with that workspace's project root as its working directory. On darwin the environment is the LaunchAgent's PATH plus HOME, USER and LOGNAME, read the way `checkDaemonClaudeAuthenticated` reads it. With no LaunchAgent registered there is nothing to probe, so the check skips. On Windows and WSL the supervisor inherits the environment `mesh desktop run` starts from, so the check uses the current one.

`aof work board-access` is a small read-only verb registered beside `publish-board`. It resolves the workspace store and loads the definition. It calls the optional `accessProbe` capability and answers `{ stage, ok, code, message }`. The stage is `definition`, `sign-in` or `board`. Classifying `sign-in` versus `board` is generic: the adapter's error code or HTTP status decides it, and the verb never names Azure. The Azure adapter keeps its `az` call. Messages pass through one redaction step that strips bearer tokens and authorization headers before they leave the verb.

Several board workspaces fold into one check line. It fails if any workspace fails and names each failing one.

## Verification step

On this MacBook with a LaunchAgent registered, sign `az` out in a scratch HOME that the plist's environment points at. Confirm that `aof mesh desktop run` shows `board-access FAIL` at sign-in while the terminal's `aof work board-access --json` passes. Point a fixture adapter's probe at a refused read for the 403 case. Run the preflight on a file-only workspace and watch for no spawned probe.

## Out of scope

The Azure HTTP and credential command belong to story 01. A failing check does not refuse `install` or `run`, and does not gate dispatch.
