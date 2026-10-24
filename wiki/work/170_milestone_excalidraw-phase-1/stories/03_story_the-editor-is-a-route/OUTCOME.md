# 03 · The editor is a route — Outcome

## Delivered

### `/diagram?ref=&file=`
The editor is a routed surface, listed under no nav item. It is addressed by query, so it survives a reload and can be linked from the board's Edit draft.

### The architect's dock beside the canvas
The surface binds its own dock (`diagram/dock-mount.mjs`, a fourth posture home beside fleet, board and home), so the architect's session sits next to the drawing.

## Assumptions

- **A per-project board origin** — the editor's API is served by the project's own board, not the fleet. Reached from the fleet, it is opened through Open board.
