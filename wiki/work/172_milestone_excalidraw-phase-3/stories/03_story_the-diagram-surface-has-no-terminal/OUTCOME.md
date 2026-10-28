
# 03 · The diagram surface has no terminal — Outcome

## Delivered

### The terminal control carries no diagram seam
`apps/ui/src/diagram/dock-mount.mjs` is gone, and the terminal control no longer takes `laterInputs`, `onLaterInput` or `onSessionReady`; the mount command's own readiness typing (`typeCommand`, the outbox) stays for the board's dock.

### The surface table lists only surfaces that render a terminal
The fleet's terminal-input census no longer carries a diagram dock row, and every control that counted the removed lanes and lines reads the smaller tree.
