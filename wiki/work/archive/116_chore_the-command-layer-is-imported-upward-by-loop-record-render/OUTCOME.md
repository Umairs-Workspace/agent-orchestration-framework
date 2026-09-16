# 116 · The command layer is imported upward by loop-record-render — Outcome

## Delivered

### The shared glyph table lives below the command layer
`KIND_SHAPES` lives in `src/loop-graph-shapes.mjs`; `src/commands/loops-graph.mjs` imports and
re-exports it, and `src/loop-record-render.mjs` imports it downward. No src-root module imports
`src/commands/*`, and the `commands/loop-record.mjs → loop-record-render.mjs → commands/loops-graph.mjs`
cycle is closed.

### Two contradictory controls are jointly satisfiable
78/FF-7802 (the glyph table is imported, never restated) and m42 wave (d)
(`acd-command-layer-imports-downward`) are both green at once, which they had not been since the
renderer landed.
