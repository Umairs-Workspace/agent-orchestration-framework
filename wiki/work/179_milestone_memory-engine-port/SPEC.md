---
type: milestone
number: 179
slug: memory-engine-port
title: "One knowledge engine behind both memory faces — graphify moves behind the port unchanged, and a backend declares which corpora it serves"
status: done
owner: product-owner
created: 2026-10-28
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-memory-engine.md
depends: [177]
---
# 179 · One knowledge engine behind both memory faces

## Objective

`aof work memory` and `aof graph` stop being two pathways that each drive graphify, write their own
artifact, classify egress on their own and degrade on their own. One knowledge-engine port sits
behind both faces: `ingest(corpus)`, `recall(query, scope)`, `relations(paths)` and `status()`, with a
backend declaring the corpora it serves. graphify becomes the first backend behind that port with no
change in behaviour, so the existing suites prove the refactor. An outsider can verify it by reading
the knowledge package: one engine seam, two faces that reach the graph and the records only through
it, and `graph impact` answering from `relations` rather than from its own artifact read.

No second backend is planned. 176 measured cognee against both corpora and found neither a go
(176, `## Finding`), so the port is built as the seam a future engine plugs into, not for a known
tenant. That changes two things. The capability declaration is shaped by aof's corpora rather
than by any one engine's model. And `relations(paths)` is graphify's structured edge read,
formalised; 176 found no candidate that reproduces it.

## Scope

In scope:

- The port and its capability declaration. A backend states the corpora it serves (`work`, `code`,
  `operator`, `imports` today); a verb asked for a corpus the backend cannot serve reports that fact
  the way `graph impact` reports `present: false`, never a fuzzy answer. `relations(paths)` is a
  structured edge read and nothing else.
- graphify behind the port, behaviour-preserving. Both of today's builds, the codebase graph under
  `graphify-out/` and the work-stream graph under `.aof/memory-graph/`, keep their artifacts; the
  port owns which artifact belongs to which corpus and the ignore policy for each (the 149 gap
  "graphify-out ignore on the codebase graph build" is discharged here). If
  `memory-retrieval-precision` retires the graphify memory backend, the work corpus is served by the
  `local` backend through the port. The work-stream graph build then leaves rather than moves
  behind the seam, and the refactor narrows to the code corpus plus the record backends.
- The faces unchanged. `aof work memory`, `aof graph` and the stdio MCP server remain thin registered
  commands over the port; no agent prompt changes.
- Records never come from the engine. The parser leaves stay the only record source, every
  `source` stays a resolving `path:line`, scope stays a hard pre-filter, and the index stays a derived
  artifact (05/ADR-001, 005, 006).
- Binary-absent and graph-absent degrade through one path per corpus, with the structured
  `graphify-missing` and `no-graph` misses preserved.
- The amendments to frozen decisions recorded as ADRs here: 05/ADR-003's four-method interface,
  09/ADR-001 and ADR-002's command-only door, 10/ADR-001 and ADR-002's two-half composition. The
  fitness tests that guard them (`acd-memory-backend-interface`, the graph command bijection) are
  amended in the same stories, never deleted.

Out of scope:

- Any new backend. cognee was measured and declined (176); memvid is deferred by the PRD. The port
  is the place a later driver adds one.
- The config shape — `memory-config-node`; this milestone reads today's keys.
- New corpora or the `aof memory` face — `memory-top-level-with-corpora`.
- Changing the ranker, the recurrence score, or retiring graphify.

Recall applied (id `f85f7807-b819-47b6-b974-4df5f4db744e`, owned by `cognee-fit-for-aof`):
10/ADR-002 (one door, through registered commands) and 10/ADR-005 (records and graph both
rebuildable from source) are honoured as the port's two invariants; 13/ADR-003's rule that new
knowledge extends the indexer rather than adding a store is honoured by keeping the parser leaves
the only record source.

## Stories

Three waves. 01 first; 02 and 03 in parallel (no shared file); 04 after 02.

- [x] `stories/01_story_the-port-and-its-capability-declaration` — the port's four verbs, the corpus vocabulary, the declaration check and the `corpus-unserved` miss (ADR-001, FF-17901)
- [x] `stories/02_story_graphify-serves-the-code-corpus-behind-the-port` — `graph build` is `ingest("code")` and `graph impact` is `relations`, unchanged; the nested ignore written on every build discharges 149's gap (ADR-002, FF-17903)
- [x] `stories/03_story_the-record-corpora-sit-behind-the-port` — every record backend declares work, operator and imports; every `aof memory` verb dispatches through the port, byte for byte (ADR-003, FF-17902)
- [x] `stories/04_story_every-code-graph-reader-asks-relations` — test selection, contract derivation and seam liveness ask `relations`; the code graph has one reader (ADR-004, FF-17904)

## Dependencies

- `memory-retrieval-precision` — waits on its disposition of today's pieces. Whether the graphify
  memory backend is kept, merged or retired decides how many pathways the port consolidates, and
  so how big this milestone is. Refining before that finding risks building a seam for a pathway
  that is about to be deleted.
- `cognee-fit-for-aof` (176, done) — no longer gating. Its finding settled `relations(paths)`: it
  stays graphify's structured edge read. It also gave the measured shape for any future
  out-of-process engine: one supervised REST process per node workspace, with the adapter tracking
  a `data_id` per file and recovering `path:line` itself.
