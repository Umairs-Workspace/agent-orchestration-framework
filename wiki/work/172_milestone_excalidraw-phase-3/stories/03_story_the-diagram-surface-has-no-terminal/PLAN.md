# 03 · The diagram surface has no terminal — build plan

## Mechanism

**Delete what has no caller, then let every control that listed it say so.**

- Grep first, from the repo root, for every importer of `diagram/dock-mount`, `diagramDockMount`,
  `DELIVERY_*`, `deliveryPlan`, `laterInputs`, `onLaterInput`, `onSessionReady`,
  `flushLaterInputs`, `LaterInput` and `LaterInputReport`. Story 02 already left
  `DiagramSurface.tsx` importing none of them; anything else found is a contract gap — report it
  rather than widen the cut silently.
- Remove `apps/ui/src/diagram/dock-mount.mjs` and `.d.mts`. The diagram directory keeps
  `DiagramSurface.tsx` and the address vocabulary.
- In `TerminalControl.tsx` remove the three props and the `typed.current` later-input fields and
  effect; keep the mount command's typing and its readiness gate (the board's dock and the home
  grid use them). In `input-policy.mjs` remove `flushLaterInputs` and the later-input rule and
  types; their suite cases go with them, and the socket suite's later-input cases.
- The surface table in `acd-fleet-terminal-input-constrained` loses its fourth row (the diagram
  dock); `invariant-4-amended`'s posture-home sweep expects no diagram entry; both directory budgets
  drop the dock-mount pair from the `diagram/` description and lower any ceiling the deletion
  lowers; `acd-loop-state-rides-the-run-record` re-pins the `apps/ui/src` digest with the diff.

## Verification step

The terminal suites (`terminal-core-input-policy`, `terminal-control-opens-its-socket`) and every
arch test in `files:` via `node scripts/test.mjs --only`, then the importer sweep: every suite that
imports `TerminalControl.tsx` or `input-policy.mjs` (171 RETROSPECTIVE R2). The browser smoke's
`.xterm` check from story 02 still holds.

## Out of scope

- The board's own dock, the home grid and the fleet's terminal view — unchanged.
