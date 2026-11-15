# 191/04 · A loop starts through the supervisor — Outcome

## Delivered

### A start is a request, never a process started by the caller
`aof work loop <scope> --hand-off-start` writes one start request under `<meshRoot>/loop-starts/` and spawns nothing. It refuses `loop-start-scope`, `loop-start-running` and `loop-start-resumable` by name, and refuses its incompatible companion flags.

### The supervisor starts a fresh supervised loop for it
The declarations producer offers one row per start request, carrying `--supervised` and never `--resume` (FF-19105). The desktop app launches it on its next poll, and the launched loop spends the request.

### A start uses the workspace id the mesh already knows
The start, the spend and the supervisor's standalone fallback all resolve the id with `resolveWorkspaceId`: a pinned `mesh.workspaceId` first, then the id derived from the project root, which `aof mesh repo publish` registers. Only a workspace with neither is refused (`loop-start-no-workspace`), and the refusal says to pin `mesh.workspaceId` (F-14).

## Assumptions

- **The desktop app is running on the control node** — a start request nobody polls starts nothing.
