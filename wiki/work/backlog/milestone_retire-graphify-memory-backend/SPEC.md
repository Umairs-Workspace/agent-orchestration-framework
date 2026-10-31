---
type: milestone
number:
slug: retire-graphify-memory-backend
title: "The work stream is served by the local index alone — the graphify memory backend is retired, reindex sends nothing to a hosted model, and graphify stays for the code graph"
status: not-started
owner: product-owner
created: 2026-10-28
updated: 2026-10-28
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-memory-engine.md
depends: [177]
---
# The work stream is served by the local index alone

## Objective

The graphify memory backend goes. 177 measured that its re-rank changed neither the set nor the
order on 200 of 200 recalls: it reorders the lexical ranker's already-truncated top 5, and its prose
pass puts no markdown into the graph. On the control node the graph has never built at all. Yet
every reindex still runs `graphify extract wiki/work --backend claude-cli`, sending the work stream
to a hosted model for no effect on recall. After this milestone `memory.backend` is `local`,
`aof.memory.index.json` is the one index, and a reindex makes no network call. graphify stays
exactly as it is for the codebase graph. An outsider can verify it by running a reindex with egress
denied and seeing it succeed. They can also check that `graph build`/`impact` behave as before, and
that `.aof/memory-graph/` is no longer written.

## Scope

In scope:

- Remove the `graphify` memory backend (`packages/knowledge/src/memory/graphify-backend.mjs`), its
  work-stream build into `.aof/memory-graph/`, and `aof.memory.graphify.index.json`. `local` serves
  the work, imports and operator records, from the same parser leaves.
- Migration. `aof work update` moves a config naming `memory.backend: "graphify"` to `local` and
  drops `memory.graphify.extractionBackend`, filling rather than re-authoring (127/ADR-005). A
  config that still names `graphify` after that is reported, not silently accepted.
- The amendments recorded as ADRs here, with the fitness tests that guard them amended in the
  same stories rather than deleted. 10/ADR-001–004 are superseded for the memory slot. 10/ADR-003's
  `graphify` enum entry in `$defs/memory` and its `claude-cli` extraction default go.
- Leftover artifacts. A node's existing `.aof/memory-graph/` and graphify index file are left
  alone or cleaned up, and doctor says which.
- The three stale citations 177 found, fixed in passing: `aof-architect.md:83`'s nonexistent
  memory-recall hook, `loops/retrospective-memory-ingest.md:32`'s retired `brief`, and the
  auto-memory entry `guard-test-isolation.mjs` cites but this node lacks.

Out of scope:

- The codebase graph. `aof graph` and its graphify build, artifacts and 174's shared bundle are
  unchanged (176).
- The ranker and the pick — `memory-recall-pick`.
- The engine port — `memory-engine-port`, which is drawn over what survives this milestone.

Recall applied (shatter-po, id `0f3b1f6e-5d0a-4c2b-9a8e-6b7d1c2e4a91`, owned by
`memory-recall-pick`): 10/ADR-003 (graphify in the memory enum, `claude-cli` by default) is departed
from, and the departure is this milestone. 10/ADR-004's degrade to the local index is honoured: it
becomes the only path. 13/ADR-003 is honoured: imported knowledge keeps feeding the same indexer,
through `local`. 05/ADR-001's derived local index is honoured as the one index.

## Stories

To be broken down after promotion; no stories or task contracts are authored in this shatter.

## Dependencies

- `memory-retrieval-precision` (177, done) — its disposition is the decision: 0 of 200 recalls
  changed, and every reindex egresses the work stream.
- `memory-engine-port` (179, already in the stream) should wait on this milestone, not the other
  way round. A stream item cannot carry a slug edge to a backlog item, so that edge is added to 179's
  `depends:` when this milestone is promoted.
