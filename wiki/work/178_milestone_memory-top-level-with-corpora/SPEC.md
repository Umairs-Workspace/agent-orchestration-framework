---
type: milestone
number: 178
slug: memory-top-level-with-corpora
title: "Memory is a top-level concern with corpora — aof memory replaces aof work memory, planning documents are a corpus with path:line provenance, and a remote planner recalls over MCP instead of grep"
status: not-started
owner: product-owner
created: 2026-10-28
updated: 2026-10-28
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-memory-engine.md
depends: [177]
---
# 178 · Memory is a top-level concern with corpora

## Objective

Memory is namespaced under `work` because the work stream was its only corpus in milestone 05. It
no longer is: `aof:shatter` recalls while reading a PRD that memory has never indexed, and every
hyperagent skill substitutes a code search for recall because the remote planner has no CLI. After
this milestone memory is its own face, `aof memory <verb>`, with `aof work memory` kept as an alias;
`wiki/planning` is a corpus whose PRDs, research notes and findings become records with `path:line`
provenance; a `--corpus` scope filters by corpus; and the memory verbs are reachable over the same
stdio MCP server the graph uses, so a planner out of process recalls the same records a session in
the repo does. An outsider can verify it by running `aof memory recall --corpus planning` and getting
a line into a PRD, and by watching a hyperagent planning run call recall over MCP.

## Scope

In scope:

- The `aof memory` face: the existing verbs (recall, record-recall, recurrence, ingest, reindex,
  status) re-homed as registered commands under `memory`, with `aof work memory` an alias that
  prints nothing extra. The roughly twenty bundle prompts and skills that cite the old path are
  migrated in the same milestone, through the alias so nothing breaks mid-way.
- The planning corpus as a parser leaf beside `local-indexing.mjs`, `episodic-indexing.mjs` and
  `claude-auto-memory.mjs`: it reads `wiki/planning/**` and never writes, every record cites its
  line, and the item namespace is `planning:<slug>` so a numeric `--item NN` filter never matches it
  (the 159/ADR-002 precedent). The record types reuse the frozen `MemoryRecord` shape. It is
  declared the way `claude-auto-memory` is today, as a `memory.sources` value, so it needs neither
  the engine port nor the new config node. `memory-config-node` later migrates it into `corpora`
  with every other source.
- `--corpus` as a scope flag and a hard pre-filter (05/ADR-006), with `corpus` joining the
  `SCOPE_FIELDS` the fitness test keeps in sync.
- The recall-accounting rule for a planning session written as an ADR: a recall taken with no item
  yet is owned by the first driver the session mints (today's shatter convention), and the ledger
  entry says so.
- Memory verbs on the MCP server, through the same registered-command door as the graph tools, and
  the hyperagent skill assets updated to call recall over MCP instead of the code-search
  substitution.

Out of scope:

- New backends or ranking changes. The planning records are ranked by whatever recall path
  `memory-retrieval-precision` keeps, the same as every other source.
- Indexing `wiki/*.md` beyond `wiki/planning`, transcripts or any other home the retrieval spike
  may name; each is its own corpus later.
- UI.

Recall applied (id `f85f7807-b819-47b6-b974-4df5f4db744e`, owned by `cognee-fit-for-aof`):
13/ADR-003's rule that new knowledge enters by extending the indexer's scan, never by a bespoke
store, is honoured by adding the planning corpus as a parser leaf.

## Stories

To be broken down after promotion; no stories or task contracts are authored in this shatter.

## Dependencies

- `memory-engine-port` and `memory-config-node` were dependencies when cognee was expected to
  serve corpora through the port. They were dropped after 176 declined cognee. Records come from
  parser leaves and a source is declared under `memory.sources`, and both work today, so this
  milestone runs ahead of the refactor. The port and the config node absorb the planning corpus
  when they land.
- `memory-retrieval-precision` — waits on its finding about homes: where each kind of knowledge
  lives decides whether a PRD record is a planning corpus of its own or folds into another home. The
  operator may drop this edge to run the two in parallel; the cost is a possible re-home of planning
  records when the spike reports.
