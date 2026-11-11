# PRD — Memory Engine: one knowledge engine, several corpora, cognee first

> Planning PRD for the memory-engine arc. Upstream of ACD: this document is the seam `aof:shatter`
> consumes to lay out the roadmap. It records the operator session of 2026-10-28 that researched
> [topoteretes/cognee](https://github.com/topoteretes/cognee) and
> [memvid/memvid](https://github.com/memvid/memvid) as alternatives to graphify, and the decisions
> taken in it. The research itself is summarised under *Context & Constraints*; the decisions are the
> *Objective* and *Scope*.

## Addendum 2026-10-28 — cognee declined; the arc is re-shaped

Spike 176 (`cognee-fit-for-aof`, accepted) measured cognee 1.6.5 and found **neither corpus a go**.
For the **code** corpus, cognee's own ingest of this repository timed out, and its best-case
relations do not reproduce `graph impact`. For the **work** corpus, zero egress holds only under
process-level network denial; the work stream's markdown projects to about 37 h to index at a
6 GB+ memory floor, with low agreement with today's recall. The measurements are in
`wiki/work/176_spike_cognee-fit-for-aof/SPIKE.md`. The arc as delivered differs from *Objective*,
*Scope* and *Milestones* below, which are kept as written:

- **`cognee-backend` is removed.** The semantic-ranking question it carried moves to
  `memory-retrieval-precision` as a local-embeddings candidate. cognee's measured recall was
  embedding search, and its entity graph added nothing that recall used.
- **`memory-retrieval-precision` is promoted ahead of the arc** and gates `memory-engine-port`. Its
  keep/merge/retire disposition of the graphify memory backend decides how much the port
  consolidates.
- **`memory-engine-port` and `memory-config-node` stay**, as preparation for a future engine
  rather than for a known one. graphify remains the only backend.
- **`memory-top-level-with-corpora` runs before the port and the config node.** Its planning corpus
  is a parser leaf declared under `memory.sources`, and needs neither.

Delivery order: `memory-retrieval-precision` → `memory-top-level-with-corpora` →
`memory-engine-port` → `memory-config-node`.

## Addendum 2026-10-28 — retrieval measured; two milestones added, graphify memory retired

Spike 177 (`memory-retrieval-precision`, accepted) replayed all 200 recorded recalls against six
retrieval candidates and graded a pooled sample of 127 with an LLM judge (90% agreement with a human
on 40 labels). The measurements are in `wiki/work/177_spike_memory-retrieval-precision/SPIKE.md`
and its `REPLAY.md`. What the arc takes from it:

- **One retrieval change earns its place.** Today's lexical ranker as a 20-record shortlist, with a
  model picking at most 5 from it: 1.67 decision-changing records per block against 1.31, noise
  0.69 against 2.02, and a decision-changing record in the block on 85 of 98 recalls against 74. It
  costs about 9 s per recall, with no new store and no new egress class.
- **Nothing else measured beats today's ranker.** Local embeddings lose on every edge, alone or
  fused with the lexical score, so no embedding engine (cognee or another) is adopted for the work
  corpus. An always-loaded record index is 8–155 k tokens at the edges that recall and ranks below
  the pick.
- **The graphify memory backend is a no-op, and is retired.** Its re-rank changed neither the set
  nor the order on 200 of 200 recalls, because it reorders the ranker's already-truncated top 5 and
  the prose pass puts no markdown into the graph. Every reindex still sends `wiki/work` to a hosted
  model for it. `memory.backend` returns to `local`; graphify stays for the code graph alone.

Two milestones join the arc:

- **`memory-recall-pick`** — `recall --block` ranks a 20-record shortlist and a model picks ≤5 from
  it, empty when nothing applies, and the ledger records what was picked rather than a re-run (the
  pick is not deterministic). `refine-po` becomes a text recall on the item's title, because
  `--item` on an item not yet indexed is empty by construction (12 of 14 recalls). The
  retrospective's two recalls are recorded in the ledger like every other edge. Open, decided at
  refine: whether the pick is a separate cheap model call (as measured) or the recalling agent
  choosing from a 20-card block it already holds (not measured).
- **`retire-graphify-memory-backend`** — the `graphify` memory backend, `.aof/memory-graph/` and
  `aof.memory.graphify.index.json` go; `aof.memory.index.json` is the one index; `aof work update`
  moves a config naming `memory.backend: "graphify"` to `local`; reindex no longer egresses the work
  stream. The three stale citations the spike found (`aof-architect.md:83`'s nonexistent recall
  hook, `loops/retrospective-memory-ingest.md:32`'s retired `brief`, `guard-test-isolation.mjs`'s
  absent auto-memory entry) are fixed in passing.

Effect on the milestones already shattered:

- **`memory-engine-port` shrinks.** Only the code graph and the record backends move behind the
  port; there is no work-stream graph to own. It now depends on `retire-graphify-memory-backend`, so
  the port is drawn over what survives rather than over what is about to go.
- **`memory-config-node` loses `backends.graphify.extractionBackend`** for the work corpus.
- **`memory-top-level-with-corpora` is unaffected.** Planning records are ranked by the same
  shortlist and pick; it does not wait on `memory-recall-pick`.

Delivery order: `memory-top-level-with-corpora` and `memory-recall-pick` (independent) →
`retire-graphify-memory-backend` → `memory-engine-port` → `memory-config-node`.

Corrections to *Context & Constraints* below: the recall ledgers hold 196 queries, not 78. enola
does parse `.mjs`; cognee's per-file loader does not. `cognee-mcp` does expose `code_search`, as one
of 8 operations. `@cognee/cognee-ts` has no Intel macOS prebuilt, its glibc floor excludes Ubuntu
22.04 and Debian 12, and it has no keyless mode.

## Objective

**Objective.** aof's memory becomes one knowledge engine with several corpora instead of two
pathways that do not know each other exist. Today the work-stream memory (`aof work memory`) and the
codebase graph (`aof graph`) each drive graphify separately, write separate artifacts, classify
egress separately and degrade separately, and the memory verbs are namespaced under `work` although
planning already consumes them. The arc delivers, in order: a spike that measures whether cognee fits
aof's two corpora; one engine port behind both existing faces with graphify moved behind it
unchanged; one `memory` config node that holds backend, corpora, graph sharing and per-backend
settings; a cognee backend that serves both corpora, with enola's deterministic code graph behind
`graph impact` and a keyless entity graph re-ranking the work-stream records; and finally memory
lifted out of `work` into a top-level face with a planning corpus and recall reachable over MCP.
Throughout, the record layer aof already has is the asset that is kept: records come from aof's own
parsers with a resolving `path:line`, the index stays a derived artifact, scope stays a hard
pre-filter, and the work stream is never sent to a hosted model by default.

## Context & Constraints

### What graphify does for aof today (measured 2026-10-28)

- Two slots. `graph:build/query/impact/triage/publish/fetch/import/export/prune/serve` drive the
  graphify binary over the codebase and read `graphify-out/graph.json`. The `graphify` memory backend
  spawns graphify a second time over `wiki/work`, into `.aof/memory-graph/graphify-out/`, purely as a
  re-rank signal over records the markdown parsers produce
  (`packages/knowledge/src/memory/graphify-backend.mjs`, milestone 10 ADR-001/002).
- The two artifacts once collided: a memory reindex silently replaced the code graph and
  `graph impact` answered `present: false` over work-item nodes
  (`packages/knowledge/src/graphify.mjs`, "TWO ROOTS, deliberately separable").
- The memory graph has never built on the control node: `.aof/memory-graph/graphify-out/` has been
  empty since 2026-08-06 while every reindex still attempts the extraction (backlog spike
  `memory-retrieval-precision`).
- graphify's prose pass is an LLM hop, so indexing the work stream always egresses it (milestone 10
  RESEARCH §A). Upstream graphify has since moved to Graphify-Labs, gained `GRAPHIFY_BACKEND=none`
  and an MCP extra; aof pins 0.8.44.

### The frozen record layer (the asset)

- A backend is a default export `{ name, recall, reindex, status }` (05/ADR-003). `recall` returns
  `{ query, scope, records[], text }` (05/ADR-004). Every `MemoryRecord.source` is `path:line` and
  resolves to live text (05/ADR-005). Selection is `config.memory.backend`, read in one place
  (05/ADR-002). Scope flags are a hard pre-filter (05/ADR-006).
- Record producers are sibling leaves: `local-indexing.mjs` (lessons, ADRs, capabilities, gaps),
  `episodic-indexing.mjs` (findings, feedback, runs; 157), `claude-auto-memory.mjs` (operator
  entries; 159). Each reads and never writes, and cites its line. Recall accounting (153) records
  every recall and verdict in the item's `FEEDBACK.ndjson`; recurrence (153) is a frozen score.
- The indexer walks work items, the import store and the opt-in auto-memory folder only. Nothing
  under `wiki/planning` is indexed, yet `aof:shatter` recalls while reading a PRD, and every
  hyperagent skill substitutes "code search scoped to the work dir" for recall because the remote
  planner has no CLI.

### cognee (researched 2026-10-28)

- Python 3.10–3.14, Apache-2.0, 32.9k stars, v1.6.5 (2026-10-16), daily commits. API: remember,
  recall, improve, forget over named datasets. 1.6.1 added `dlt` as a core dependency.
- Code graph is deterministic and LLM-free, via enola (Go, Apache-2.0, 20+ languages including
  JavaScript and TypeScript). Nodes: CodeRepository, CodeModule, CodeSymbol, CodeFlow, CodeDocument.
  Operations include impact_analysis, find_path, hubs, neighbors, delta, architecture (Mermaid).
  IDs are content-hashed so re-runs are incremental. Docstrings link to symbols with a `describes`
  edge.
- Loader table claims `.py`, `.js`, `.ts` for the code pipeline and omits `.mjs`; unlisted
  extensions "cannot be remembered by default". aof is almost entirely `.mjs`. Unverified whether
  enola itself handles `.mjs`.
- Markdown goes through a UTF-8 text loader and a paragraph chunker; headings and frontmatter are
  not documented as structure; provenance is chunk-level. So cognee cannot be a record source for
  aof either; it is a ranking and relations signal, as graphify is.
- Keyless mode: GLiNER extraction plus local embeddings on CPU, LLM stages skipped. Zero egress for
  the work corpus is available, which graphify cannot offer for prose.
- Defaults: SQLite, LanceDB, embedded Ladybug (Kuzu-compatible) graph store, documented as
  single-writer with file locking and "not suitable for concurrent use from different agents or
  processes". Neo4j is the recommended production store. The Postgres graph adapter in core is a
  demo; the production adapter is licensed.
- Access from Node: `@cognee/cognee-ts` 0.2.0 (July 2026), a native addon over cognee-rs with
  prebuilt linux/mac/win binaries; the REST API; or the MCP server (remember, recall, forget; the
  README is inconsistent on whether `code_search` is exposed). A Claude Code plugin captures prompts
  and tool traces into a local API on port 8011.

### memvid (researched 2026-10-28; deferred by this PRD)

- Rust single-file `.mv2` store, Apache-2.0, official Node SDK and CLI; BM25 plus HNSW plus a time
  index; local bge-small embeddings or OpenAI; multiple readers, one writer. Not a graph and does not
  parse code. `enrich` yields entity-attribute-value cards. Capacity is enforced inside the core by
  signed tickets issued by memvid.com; the docs disagree on the free cap (50 MB vs 1 GB) and on
  pricing. No official MCP server. Telemetry on by default.
- Verdict recorded here: a candidate records-only upgrade to the `local` backend, not a graphify
  replacement. Out of scope for this arc; a later PRD may add it as a backend behind the same port.

### Constraints the arc must obey

- Records never come from the engine; only ranking and relations do. `path:line` provenance,
  the derived-index invariant and hard scope pre-filters survive every milestone.
- `relations(paths)` stays a structured edge read. `graph query` was already judged a
  similarity-seeded hint, not fact (milestone 11 ADR-007); a central engine must not reopen that.
- Egress is classified per corpus and the work corpus is the sensitive one. Nothing in the new
  config may make shipping `wiki/work` to a hosted model easier than it is today.
- The faces stay. `aof work memory`, `aof graph` and the stdio MCP server are thin registered
  commands; agent prompts change only when memory is lifted out of `work`, and then through an alias.
- The arc amends frozen decisions in milestones 05, 09 and 10 and the fitness tests that guard them
  (`acd-memory-backend-interface`, the graph command bijection). Each amendment is recorded as an
  ADR in the milestone that makes it; none is made by a swap.
- Config mutation follows 127/ADR-005: fill, never re-author. The schema has
  `additionalProperties: false` on `memory` and `graph`, so a shape change needs a migration path.

## Scope

### In scope

- A spike measuring cognee against aof's two corpora: `.mjs` coverage and relations parity with
  `aof graph impact`; a keyless ingest of `wiki/work` with its provenance, cost and egress measured;
  the single-writer process model under the mesh's concurrent workers; the viable access path from
  Node on macOS, Windows and WSL; and incremental re-ingest behaviour.
- One knowledge-engine port behind both faces: `ingest(corpus)`, `recall(query, scope)`,
  `relations(paths)`, `status()`, with a backend declaring the corpora it serves. graphify moves
  behind it as the first backend, behaviour-preserving, with both of its builds and both artifacts
  owned per corpus.
- One `memory` config node: `backend`, `corpora` (absorbing `sources`), `graph` (moved from the
  root), `backends.<name>` (absorbing `memory.graphify`), with the schema, `aof work init` and
  `aof work update` migration, and the UI config editor following.
- A cognee backend behind the port serving the work and code corpora, keyless by default for the
  work corpus, provisioned and doctor-checked like other managed tools, failing soft when absent.
- Memory as a top-level concern: an `aof memory` face with `aof work memory` kept as an alias;
  a planning corpus (PRDs, research notes, findings) as a parser leaf with `path:line` provenance;
  a `--corpus` scope and a `planning:<slug>` item namespace; the recall-accounting rule for a
  planning session written down; memory verbs on the MCP server so a remote planner recalls instead
  of grepping.

### Out of scope

- Retiring graphify. It stays a backend until cognee parity is measured and accepted; retirement is
  a later decision with its own driver.
- memvid, Graphify Cloud, Cognee Cloud, and any hosted store.
- Changing the ranker or the recurrence score. The backlog spike `memory-retrieval-precision` owns
  that question; this arc gives it a single engine to answer against.
- Sharing a cognee store through git refs. The graphify bundle (174) remains the shared code-graph
  artifact until a later driver decides otherwise.
- New record types or a change to the frozen `MemoryRecord` shape.

## Milestones

In delivery order. Each is one driver; the spike gates the two milestones that consume its finding.

1. **Spike — cognee fits aof's two corpora** (`cognee-fit-for-aof`). The measurements above; a
   go/no-go per corpus, the access path and the process model, with numbers.
2. **Milestone — one knowledge engine behind both faces** (`memory-engine-port`). The port,
   capability declaration, graphify as the first backend, artifacts owned per corpus, ADR and
   fitness-test amendments. Depends on the spike for the shape of `relations` and the access path.
3. **Milestone — one memory node in the config** (`memory-config-node`). The consolidated shape,
   schema, migration and faces. Depends on the port for the corpora and capability vocabulary.
4. **Milestone — cognee serves aof memory** (`cognee-backend`). The backend behind the port for
   both corpora. Depends on the spike, the port and the config node.
5. **Milestone — memory is a top-level concern with corpora** (`memory-top-level-with-corpora`).
   The `aof memory` face, the planning corpus, the MCP reach. Depends on the port, the config node
   and the backlog spike `memory-retrieval-precision`, whose finding on homes shapes where a
   planning record lives.

## Sources

- Operator session 2026-10-28 (this document's origin); milestone 09/10 RESEARCH and ARCHITECTURE
  under `wiki/work/archive/`; `wiki/planning/research/RESEARCH-agent-memory-procedure.md`.
- cognee: [README](https://github.com/topoteretes/cognee),
  [code graph guide](https://docs.cognee.ai/guides/code-graph.md),
  [loaders](https://docs.cognee.ai/core-concepts/further-concepts/loaders.md),
  [graph stores](https://docs.cognee.ai/setup-configuration/graph-stores.md),
  [cognee-mcp](https://github.com/topoteretes/cognee/tree/main/cognee-mcp),
  [cognee-integrations](https://github.com/topoteretes/cognee-integrations),
  [enola](https://github.com/enola-labs/enola), `@cognee/cognee-ts` on npm.
- memvid: [README](https://github.com/memvid/memvid),
  [Node SDK](https://docs.memvid.com/node-sdk/overview),
  [capacity and plans](https://docs.memvid.com/concepts/capacity-and-plans.md),
  [tickets](https://docs.memvid.com/cli/tickets-and-capacity.md).
- graphify upstream: [Graphify-Labs/graphify](https://github.com/safishamsi/graphify).
