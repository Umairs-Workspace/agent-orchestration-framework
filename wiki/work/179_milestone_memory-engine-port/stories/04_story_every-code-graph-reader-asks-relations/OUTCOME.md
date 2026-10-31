# 04 · Test selection, contract derivation and seam liveness ask relations instead of parsing the graph — Outcome

## Delivered

### The three readers ask relations
Impacted-test selection, story-contract derivation and the seam-liveness audit each take a `relations` function bound in core (`bindings/code-relations.mjs`) and report the same widenings, limits and refusals as before, with `selectSuites` and `deriveStoryContract` now async.

### The code graph has one reader
Across `packages/*/src`, `readGraph`, `normalizeGraph` and `computeImpact` are imported only by the graphify code backend, their own modules, `graphify.mjs` and the graphify memory backend, and FF-17904 refuses any other importer.

### A driver-free relations port
`createCodeRelations` composes `relations` over the code backend's read half alone, so the audit family's construction reaches no graphify driver and no process-starting tool store.

## Assumptions

- **The graphify memory backend is a named exception** — it reads its own `.aof/memory-graph/` artifact, and FF-17904 names it by exact path until `retire-graphify-memory-backend` deletes it.
