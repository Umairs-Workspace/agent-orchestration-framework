# 04 · A node checks board access in its own daemon environment — Outcome

## Delivered

### `aof work board-access` reports which stage of board access failed
The read-only verb runs the selected definition's `accessProbe` and reports the definition, sign-in or board-read stage as ok or failed, with an exit code. It skips in local file mode and for a definition that declares no probe. It ends a probe that runs past 60 seconds and reports that. No credential appears in its output.

### The desktop preflight runs the check in the daemon's own environment
On macOS the check runs in the LaunchAgent's environment, not the terminal's. Only workspaces with a board are probed, a file-only node skips without probing, and the check reuses the identity check's config read, one read per workspace.
