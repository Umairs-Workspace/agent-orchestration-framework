# 01 · The memory node holds backend, corpora, graph and per-engine settings, and one module reads it in either spelling — Outcome

## Delivered

### The one memory node in the schema
`$defs/memory` in `schemas/aof.schema.json` declares `backend`, `corpora` (items enum equal to `KNOWLEDGE_CORPORA`, with `work`, `imports` and `code` required), `graph` (the code corpus's `share` and `remote`, with the never-shared sentence), and `backends.graphify.extractionBackend` (enum equal to `GRAPHIFY_BACKENDS`), and no `egress` property at any depth (FF-18002).

### The one reader
`readMemoryConfig(config)` in `packages/knowledge/src/memory-config.mjs` is the only module that reads `corpora`, `sources`, `graphify`, `backends` or `graph` off the memory node, or `graph` off the root config (FF-18001). It answers the new spelling or the old, lists each old key with its replacement under `legacy`, and refuses a setting spelled both ways with `memory-config-conflict`.

### Corpora absent means today's set
An absent `memory.corpora` serves `work`, `imports` and `code`, and `operator` is the only corpus a project can add. A list that omits an always-served corpus is refused with `invalid-memory-corpora`.

### The faces print the new paths
`aof memory status` prints a `corpora:` line and one `legacy:` line per old key, `config-inspect` reports the memory node under its new paths, and `aof project doctor` shows one `memory-config-legacy` warning row whenever an old key is present.

## Assumptions

- **The installed payload is redeployed before a project migrates** — a daemon running a pre-180 payload reads only the root `graph`, so a migrated config turns graph sharing off there.

## Gaps

### The pre-180 spellings still read
- **Status:** open
- **Discharge condition:** release 0.2.0 drops the legacy branches from `readMemoryConfig` (TECH_DEBT item 93).
`memory.sources`, `memory.graphify` and a root `graph` are still read for one release, so every memory setting has two admitted spellings.
