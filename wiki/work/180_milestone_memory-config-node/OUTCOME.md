# 180 · One memory node in the config — Outcome

## Delivered

### Every memory setting has one home
Backend, corpora, the code graph's sharing and each engine's settings live under the one `memory` node in the schema, the reader, the update, init and the config editor alike (m180/01/the-one-memory-node-in-the-schema, m180/01/the-one-reader, m180/02/the-update-migrates-the-old-shape, m180/03/the-memory-section), and no surface writes the old spelling (m180/02/init-writes-only-the-new-shape-and-selects-local, m180/03/the-editor-never-writes-a-legacy-key).

### A second engine is one block and one enum value
A later engine's settings are one block under `memory.backends`, named by a value of the `backend` enum the schema admits, so adding one creates no root key and needs no second migration.

### Egress is a reported classification, not a key
No key under `memory` configures egress. `aof memory status` and `aof graph build` report it, and a new project's `local` default sends nothing to a hosted model.

## Assumptions

- **No second engine exists** — `backends` holds only `graphify`, so the one-block claim is proven by the schema's shape, not by a second engine (176 declined cognee).

## Gaps

### The operator's own config still uses the old spelling
- **Status:** open
- **Discharge condition:** after `install-local` and a restart put the 180 payload under the daemons, one `aof work update` in this repository migrates its root `graph`.
This repository's `.aof/aof.config.json` keeps a root `graph: { "share": "git-refs" }`, and `aof project doctor` shows one `memory-config-legacy` warning for it.
