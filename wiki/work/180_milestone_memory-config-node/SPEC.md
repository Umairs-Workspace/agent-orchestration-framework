---
type: milestone
number: 180
slug: memory-config-node
title: "One memory node in the config — backend, corpora, graph and per-backend settings live under memory, and the old shape is migrated by aof work update"
status: not-started
owner: product-owner
created: 2026-10-28
updated: 2026-10-28
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-memory-engine.md
depends: [179]
---
# 180 · One memory node in the config

## Objective

Today the memory keys are split with no principle behind the split: `memory.backend` selects the
engine, `memory.sources` names one extra corpus, `memory.graphify.extractionBackend` is one engine's
private setting at the memory root, and `graph.share` / `graph.remote` sit at the top level although
they govern the code corpus's artifact. Adding a second engine under that shape means another root
sibling each time. After this milestone one `memory` node holds it all:

```json
"memory": {
  "backend": "graphify",
  "corpora": ["work", "code"],
  "graph": { "share": "git-refs", "remote": "origin" },
  "backends": { "graphify": { "extractionBackend": "claude-cli" } }
}
```

An outsider can verify it by validating a config against the schema, by running `aof work update`
over a project with the old shape and reading the rewritten file, and by seeing the config editor
offer the new shape.

No second engine is planned: 176 measured cognee and declined it. The shape is laid now as
preparation, so a future engine arrives as one block under `backends` and one enum value, with no
new root key and no second migration.

## Scope

In scope:

- The shape above in `schemas/aof.schema.json`: `backend` keeps its name and its single read site
  (05/ADR-002); `corpora` replaces `sources` and names the corpora the port knows; `graph` moves
  under `memory` with its two keys unchanged; `backends.<name>` holds each engine's settings, with
  `memory.graphify.extractionBackend` moving to `backends.graphify.extractionBackend`. Inactive
  engine blocks are still validated, as today.
- Migration. Both shapes are read for one release; the old one is accepted with a warning that names
  the new key. `aof work update` rewrites the old shape to the new one following 127/ADR-005 (fill,
  never re-author; every foreign section survives byte-intact). `aof work init` writes only the new
  shape. The schema's existing rule that the work graph and index are never shared survives, scoped
  to the code corpus.
- The faces follow: config-inspect and the memory `status` face print the new paths; the UI config
  editor edits the new node; the tool doctor reports engine settings from `backends.<name>`.
- Egress stays visible. The milestone's ARCHITECTURE decides whether egress is a per-corpus setting
  or stays a reported classification; either way the work corpus cannot be sent to a hosted model
  by default, and no new key makes that easier than it is today.
- `AOF_GRAPHIFY_TIMEOUT_MS` and the other operational env knobs stay env, not config.

Out of scope:

- Any new engine's settings. `backends` is the slot a later engine's block goes in; this milestone
  defines only `backends.graphify`.
- Planning as a corpus is not added here. `memory-top-level-with-corpora` is scheduled ahead of this
  milestone and declares `planning` under today's `memory.sources`; this migration carries it
  into `corpora` like any other source.
- Changing what any existing key means.

Recall applied (id `f85f7807-b819-47b6-b974-4df5f4db744e`, owned by `cognee-fit-for-aof`):
10/ADR-003's rule that selection is one reviewable touchpoint in the `$defs/memory` enum is
honoured; the `backend` key keeps its name and its single read so that invariant and its fitness
test move unchanged.

## Stories

To be broken down after promotion; no stories or task contracts are authored in this shatter.

## Dependencies

- `memory-engine-port` — the `corpora` vocabulary and the capability declaration a backend makes
  are the port's; the config can only name what the port knows.
