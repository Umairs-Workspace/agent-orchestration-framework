# 02 · graphify serves the code corpus behind the port, and aof graph build and impact answer through it unchanged — Outcome

## Delivered

### graphify serves the code corpus
`packages/knowledge/src/graphify-code-backend.mjs` declares `code: ["ingest", "relations", "status"]` and is the one module that drives graphify for, and reads the edges of, `graphify-out/graph.json`.

### graph build is ingest("code")
`aof graph build` answers the same `BuildResult` through the port's `ingest("code")`, keeps 174's share around it, and writes a self-ignoring `graphify-out/.gitignore` (`*`) on every build, so the built graph leaves nothing untracked.

### graph impact is relations(paths)
`aof graph impact` answers byte for byte as before through the port's `relations`, reading the edges once per call, and an artifact that does not parse refuses with a coded `graph-unreadable` 424 instead of escaping as a raw `SyntaxError`.

### One degrade path for the code corpus
With the graphify binary absent `graph build` answers `graphify-missing` and creates no `graphify-out/`, and with the artifact absent `graph impact` answers `no-graph`, both from the code backend.

## Assumptions

- **Share decides "current" before the spawn** — 174's fetch-on-miss reaches into ingest through `input.onMiss`, so a later code engine that ignores that hook still builds correctly but stops taking the published graph.
- **The graphify memory backend still rides `ingest("code")`** — its `.aof/memory-graph/` build goes through the code corpus until `retire-graphify-memory-backend` deletes that caller.

## Gaps

### Share's hook inside the engine's input
- **Status:** open
- **Discharge condition:** an ADR decides who settles "current" before the spawn, so share wraps ingest with no callback inside the engine's input — taken when a second code engine is plugged in.
`input.onMiss` is a face's transport callback carried into the code backend's ingest.

### The work graph's ignore wording on the code graph
- **Status:** open
- **Discharge condition:** `retire-graphify-memory-backend` deletes the other ignore writer.
The code graph's ignore file carries the work-stream graph's header line ("rebuilt from the .md stream"), and where the graphify memory backend wrote the ignore first its self-documenting variant stays, leaving that ignore file untracked.
