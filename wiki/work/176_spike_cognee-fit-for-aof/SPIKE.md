---
type: spike
number: 176
slug: cognee-fit-for-aof
title: "Does cognee fit aof's two corpora — a deterministic code graph over .mjs that matches graph impact, and a keyless work-stream ingest that egresses nothing?"
status: done
owner: architect
created: 2026-10-28
updated: 2026-10-28
origin: wiki/planning/PRD-memory-engine.md
depends: []
timebox: 2d
schema: 1
aofVersion: 0.1.0
---
# 176 · Does cognee fit aof's two corpora

## Question

The research of 2026-10-28 (PRD §Context) read cognee's docs and found it is the only candidate that
can serve both of aof's corpora from one store: enola's deterministic, LLM-free code graph for the
codebase, and a keyless GLiNER-plus-local-embeddings entity graph for the work stream. Every claim
there is desk research. Five of them decide whether a backend is worth building, and each has a
measurable answer:

1. **Code corpus coverage.** cognee's loader table claims `.py`, `.js` and `.ts` for the code
   pipeline and omits `.mjs`; unlisted extensions "cannot be remembered by default". aof is almost
   entirely `.mjs`. Over this repository, what fraction of `packages/*/src/**/*.mjs` modules appear as
   `CodeModule` nodes, and does enola itself resolve `.mjs` when driven directly?
2. **Relations parity.** For a sample of twenty files spanning the packages, do cognee's relations
   operations (impact_analysis, neighbors, dependencies) reproduce the `dependencies[]` and
   `dependents[]` that `aof graph impact` reads from graphify's `graph.json` edges? Report the
   per-file agreement and every edge one side has that the other lacks.
3. **Work corpus, keyless.** Ingest `wiki/work` with no LLM key. What does `recall` return for the
   78 queries already recorded in the recall ledgers (153), at what provenance (chunk, file, line),
   and what did it cost in wall time, CPU, disk and model downloads? Confirm with a network capture
   that nothing left the machine.
4. **Process model.** The default Ladybug store is documented single-writer with file locking and
   "not suitable for concurrent use from different agents or processes". With a control daemon and
   two mesh workers performing reindex and recall concurrently against one project, what fails, and
   does a per-workspace cognee API process (as the Claude Code plugin runs on port 8011) remove the
   failure? Who would supervise that process on each node type?
5. **Access path from Node.** Which of `@cognee/cognee-ts` 0.2.0 (native addon), the REST API, and
   the MCP server works on macOS, Windows and WSL, and with what install footprint (Python 3.10–3.14,
   the `dlt` dependency, GLiNER and embedding model sizes)? Does a re-ingest of an unchanged
   `wiki/work` add no nodes, and does a changed RETROSPECTIVE replace only its own chunks?

**Is cognee a go for the code corpus, a go for the work corpus, or neither, and through which access
path and process model?**

## Timebox

- Box: `2d`. At the boundary, stop and record the best finding available for each of the five
  questions, with a stated confidence; a question without a measurement is recorded as unanswered,
  never as a guess. Extending the timebox requires explicit re-scoping.
- Stop condition: each question has a measured answer or an explicit "not measured", and the finding
  states go/no-go per corpus plus the access path and process model the backend milestone should
  assume.
- Throwaway code only, in a scratch dir with its own Python environment. No change to `packages/`,
  no write under `~/.aof`, and no live `aof` command against the global store. Any cognee process
  started for the measurement is stopped at the end.

## Investigation

Run 2026-10-28, inside the `2d` box. Throwaway code only, in the session scratchpad with its own
Python environments; nothing under `packages/`, nothing under `~/.aof`, and no `aof` command against
the global store. The control machine for the run is an **Intel** MacBook Pro (darwin x86_64, 12
cores, 32 GB). cognee 1.6.5 cannot be installed natively on it (M5), so every cognee measurement ran
in a Linux x86_64 container (`python:3.12-slim`, Docker Desktop VM with 7.6 GB of memory), with the
stores on a Docker volume — a macOS bind mount slowed graph writes and would have inflated the cost.
The code corpus was `git archive HEAD` at `e2eba906`, the commit `graphify-out/graph.json` was built
at. Every measured ingest and recall ran with `--network none`. Docker was quit at the end and no
cognee, enola or uvicorn process remains.

**M1 — code corpus coverage: enola parses `.mjs`; cognee has no file-level module, and its own
ingest of this repository fails.**

- **enola 0.4.30, driven directly**, claims `.mjs` with its TypeScript extractor (`.mts` and `.cjs`
  are in its excluded kinds; `.mjs` is not). Offline, 28 s, 57,220 facts. **680 of the 687**
  `packages/*/src/**/*.mjs` modules in `HEAD` carry symbol facts. Five are skipped as
  "minified/bundled": `packages/core/src/cli.mjs`, `application/assemble.mjs`,
  `application/bindings/command-core.mjs`, `bindings/mesh/launcher.mjs`,
  `bindings/mesh/worker-execution.mjs` — the CLI entry and its composition root.
- **cognee's `CodeModule` is enola's `module` fact, which is a directory** (97 under `packages/`).
  So **0 of 687** source modules are `CodeModule` nodes. Files surface as `CodeFileReference`
  (**664 of 687**); 682 have at least one node of some type.
- The loader table's omission of `.mjs` is real (`SUPPORTED_CODE_EXTENSIONS` lists `js`, `ts`, …,
  not `mjs`). It bites the per-file `add()` route — a lone `.mjs` is not recognised as code — and not
  the repository route, where enola walks the tree itself.
- **`remember("/corpus/aof", content_type="code")` failed.** It wrote all 44,288 nodes in under a
  minute, then each 2,000-edge MERGE batch took longer than the last (≈3 min, rising) until one
  exceeded cognee's own 300 s subprocess deadline at 14–16 k of 44,287 structural edges, 41 minutes
  in (`TimeoutError: Subprocess call exceeded 300.0s deadline`). The typed relation edges had not
  started. The default Ladybug store cannot hold this repository's code graph.

**M2 — relations parity: cognee does not reproduce `graph impact`.** Because the store failed,
cognee's answer was computed with cognee's own code over the same facts: `map_facts_to_data_points`
and `build_code_graph_edges` into its retriever's `_CodeGraphSnapshot`, then `CodeRetriever`'s
`neighbors` and `impact_analysis`. That is exactly what the store would hand the retriever, so it is
cognee's best case. Sample: 20 files, `random.Random(176)`, round-robin over the 17 packages. Reference:
`computeImpact` replicated over `graph.json`, plus an independent parse of the files' import statements
(relative and `@aof/*` export-map specifiers). There is no `dependencies` operation; `neighbors` and
`impact_analysis` are the nearest.

| reading | dependencies vs graph impact | dependents vs graph impact | exact files (deps / dependents) |
|---|---|---|---|
| `neighbors`, file anchor | no other file returned | no other file returned | 0 / 0 |
| `impact_analysis`, depth 1 | — | no other file returned | — / 0 |
| every edge in cognee's graph, read as `computeImpact` reads | 0.26 mean Jaccard | 0.55 | 0 / 4 |
| enola's raw facts, no cognee | 0.59 | 0.27 | — |

- Against the parsed imports, graph impact scores 0.78 on imports and **0.89 on importers**; enola's
  raw facts 0.82 and **0.25**. enola resolves relative specifiers but not `@aof/*` workspace export
  maps, so it misses most cross-package importers and nearly every test file.
- In cognee's graph, edges graph impact has and cognee lacks: **45 dependents, 41 of them real
  importers**. Edges only cognee has: **16 dependents, none of them a real importer**; 29 dependencies,
  6 of them real imports graph impact misses (all six relative imports of
  `integration-hyperagent/src/commands.mjs`), the rest the file's own directory module.
- Two mapping losses explain the gap. cognee skipped **74,537** relations it could not resolve, and
  its node identity `(repo, kind, name)` collapses **13,854 dependency facts into 5,272 nodes**: an
  import is named `<importer directory> -> <target>`, so two importers in one directory become one
  node that keeps only the first importer's file.
- One sampled file (`work-graph/src/shapes.mjs`) has no node at all and cannot be used as a seed.
- Per-file agreement and every one-sided edge: [RELATIONS-PARITY.md](RELATIONS-PARITY.md).

**M3 — work corpus, keyless: zero egress is achievable; the cost and the memory floor are not
reindex-shaped.**

- Routing confirmed: with no key, `GRAPH_EXTRACTOR=auto` resolves to `gliner_demo`
  (`fastino/gliner2.5-base-v1`) and embeddings to fastembed `BAAI/bge-small-en-v1.5` (chunks capped at
  510 tokens). The text loader takes `md` but not `.feature` or `.ndjson`, so 10.5 MB of `.feature`
  under `wiki/work` is not ingestible by default.
- **Memory floor.** At default settings the run is killed on a 7.6 GB VM. The per-document schema
  probe runs one unchunked extraction over a sketch of up to 12,000 characters against the whole
  label bank: a 45 KB `ARCHITECTURE.md` drove RSS from 2.3 GB past 5.3 GB in two seconds and was
  killed at 6.5 GB. One document per batch, a window batch of 4, and two torch threads each still
  died; a 6.7 KB retrospective alone peaked at 6.0 GB. To measure at all, the throwaway harness
  capped the probe sketch at 6,000 characters. That is a deviation from defaults: it can change which
  entity types a document keeps, not its chunks or embeddings.
- **The full corpus does not fit the box**, so a defined subset was measured: 12 of the 51 near-miss
  recalls (seeded), every retrospective their 50 recorded lessons cite (39 files), and 15 seeded
  distractors — 54 files, 359 KB.

| cost of the 54-file, 359 KB ingest | measured |
|---|---|
| wall (add 11 s + cognify) | 2,333 s |
| CPU | 20,944 s (about 9 of 12 cores busy) |
| peak memory | 6.1 GB |
| store on disk | 70 MB |
| model download, one-off | 812 MB |
| projected, all retrospectives (1.28 MB) | about 2.3 h |
| projected, all `wiki/work` markdown (20.6 MB) | about 37 h |

- The graph: 2,504 nodes — 229 chunks, 229 summaries, 1,937 entities of 21 generic types (person,
  organisation, …) — and only **72 entity-to-entity relations**.
- **Recall.** All 196 recorded recall queries (the ledgers now hold 196, 195 distinct; the PRD's "78"
  is stale) ran as `CHUNKS` search, top 10: no errors, p50 0.32 s, p95 0.41 s. Keyless `recall()`
  returns the same chunk hits and no completion, at 0.3–0.5 s.
- **Provenance is chunk-level.** A hit carries the chunk text, `chunk_index`, a `document_id`, a
  `document_name` that is the file stem (`RETROSPECTIVE` for every retrospective), and the file URI in
  `external_metadata._cognee.source_uri`. No line. Searching the chunk text back in its file placed
  100 of 100 hits on a line span, so `path:line` is recoverable by aof, never supplied by cognee.
- **Agreement with aof's recall** on the 12 sampled queries:

| of the lessons aof's recall returned | in cognee's top 5 | in top 10 |
|---|---|---|
| all 50 | 8 | 11 |
| the 18 an operator marked `honoured` | 3 | 5 |

  Seven of the ten scorable queries got at least one in the top 5; two queries had returned nothing in
  aof and score nothing. The reference is aof's lexical recall, not a relevance judgement, so this
  says cognee does not reproduce today's recall — not that it ranks worse.
- **Egress.** The measured ingests and recalls completed with `--network none` (loopback only), so
  nothing left the machine for them. With networking available, a tcpdump in the container showed the
  first run fetching 812 MB of models from `huggingface.co` / `*.hf.co`, and **every later run still
  contacting `huggingface.co`** (a revision check, unless `HF_HUB_OFFLINE=1`) **and
  `raw.githubusercontent.com`** (litellm fetching config at import; `LITELLM_LOCAL_MODEL_COST_MAP=True`
  did not stop it). Read from source, not captured: telemetry is on unless `TELEMETRY_DISABLED` is
  set (endpoint `test.prometh.ai`; disabled in every run here), and without the `gliner` extra
  installed, cognify installs CPU torch from `download.pytorch.org` at run time
  (`gliner_auto_install` defaults to true).

**M4 — process model: two processes on one store fail, readers included; one API process removes
the failure.** cognee's own code fixture, one store on one volume, separate processes standing in for the daemons (no aof daemon was run, per the box's no-live-command rule):

| scenario | result |
|---|---|
| direct SDK: 1 writer + 2 readers, one dataset | writer 0/3, one reader 140 ok, the other 0/9 — `Could not set lock on file … .lbug` |
| direct SDK: 2 writers + 1 reader, one dataset | both writers 0/3; the reader that won the lock ok |
| direct SDK: 2 writers, two datasets | 3/3 each |
| direct SDK: 3 readers only | one ok, two fail on the lock |
| one cognee API process (uvicorn, port 8011): 2 writers + 2 readers over REST | 6/6 writes, 95/95 reads, no errors |
| API process up, plus an SDK process opening the same store | SDK reader 0/3, SDK writer 0/1 (lock); REST reader 58/58 |

- The Ladybug lock is exclusive per process on the dataset's `.lbug` file, **for reads too**. Each
  dataset is its own file (access control is on by default), so separate datasets do not contend.
- The API process must be the only door: anything that opens the store beside it fails. It cold-starts
  in 51 s and idles at about 400 MB, and with access control on it forces authentication
  (`DEFAULT_USER_PASSWORD` was needed to log in).
- In aof the contention is per node, not across the mesh: each node has its own checkout and
  filesystem. The colliding processes are parallel lanes' `aof work memory recall` and a reindex on
  the same node. **Supervision was not measured.** The fit is: the desktop supervisor on the control
  node, which already owns both daemons; the worker daemon on the Mac and WSL workers; and nothing on
  a CLI-only checkout, which has no long-lived process to own it.

**M5 — access path from Node: only REST to a Python cognee process works.**

| path | Intel macOS (here) | arm64 macOS | Linux x64 | Windows | WSL (Ubuntu 22.04) |
|---|---|---|---|---|---|
| Python cognee 1.6.5 | ✗ measured: lancedb 0.39 has no x86_64 macOS wheel; uv falls back to 1.6.2, whose cbor2 needs a Rust compiler | wheels exist — not measured | ✓ measured: 17 s, 1.3 GB, 174 packages, enola bundled | lancedb has a win_amd64 wheel — not measured | ✓ measured on `ubuntu:22.04`, system Python 3.10: 20 s, 1.3 GB |
| `@cognee/cognee-ts` 0.2.0 | ✗ measured: `no precompiled module found for darwin-x64` | prebuilt exists — not measured | ✗ Debian 12 and Ubuntu 22.04 (needs `GLIBCXX_3.4.31`); loads on Ubuntu 24.04 | prebuilt exists — not measured | ✗ measured on `ubuntu:22.04` |

- The `gliner` extra grows the Linux environment from 1.3 GB to **6.4 GB**: PyPI's torch wheel
  bundles CUDA. Plus 812 MB of models.
- **cognee-ts cannot serve either corpus.** Where it loads, every call — `pruneData` included — fails
  with `llm_api_key must be configured`; it has no keyless mode, and its search types have no `CODE`.
  Its 323 MB native addon ships with a `postinstall` script.
- **REST** (`/api/v1/search`, `/api/v1/recall`) takes the structured `code_query` and was exercised in
  M4. `/api/v1/remember` with `content_type=code` takes a server-local path once
  `ACCEPT_LOCAL_FILE_PATH` is set.
- **MCP** (`cognee-mcp` 0.5.7, a separate package pulling `cognee[docs,neo4j,postgres-binary]`), read
  from the wheel, not run: it does expose `code_search`, settling the README's inconsistency, but only
  8 operations — no `neighbors` — and it returns text, not a structured edge list.
- **Re-ingest**, on the 54-file store. Unchanged re-add + cognify: 27.7 s, 2,504 → 2,504 nodes, 6,096
  edges, chunk ids identical. One retrospective changed (a line edited, a lesson appended):
  `add()` refuses the **whole batch** with `DocumentUpdateRequiredError` naming the file's
  `data_id`; `cognee.update(data_id, …)` is the path, and it is incremental — 64.6 s, 2 of that
  document's 3 chunks replaced, 1 kept, the other 53 documents' 227 chunks untouched.

## Finding

**Neither corpus is a go for cognee 1.6.5, and the code corpus is a firm no.**

| question | answer | confidence |
|---|---|---|
| 1 · code coverage | enola parses 680 of 687 `.mjs` modules; cognee makes 0 of them `CodeModule` (its module is a directory) and its own ingest of the repository times out | high — measured |
| 2 · relations parity | no: file-anchored operations return no other file; the best-case read agrees 0.26 / 0.55 and loses 41 real importers in 20 files | high — measured over cognee's own mapping, not its store |
| 3 · work corpus, keyless | zero egress only under network isolation; about 6.5 s per KB on 12 cores and a 6 GB+ memory floor; chunk-level provenance; low agreement with today's recall | high on cost and egress; low on ranking quality (one 54-file subset, lexical reference) |
| 4 · process model | two processes on one store fail, readers included; one API process per node workspace removes the failure | high on the failure and the fix; supervision not measured |
| 5 · access path | REST to a supervised Python cognee process. cognee-ts and MCP do not fit | high where measured; arm64 macOS and Windows not measured |

- **Code corpus: no-go.** cognee cannot store this repository's graph at default settings. Even its
  own mapping, read in memory, does not reproduce `relations(paths)`: no file-level node, importers
  merged by directory, nearly half of all relations unresolved. Raw enola does not either: it misses
  `@aof/*` importers. graphify stays the code-graph engine.
- **Work corpus: no-go as an always-on reindex.** The egress constraint can be met, but only with the
  network denied at the process level and `HF_HUB_OFFLINE`/`TELEMETRY_DISABLED` pinned — environment
  variables alone still leave litellm's fetch. The binding cost is compute: about 37 hours for the
  work stream's markdown on this machine, and a memory floor above what a worker VM may have. The
  incremental `update` path (about a minute per changed document) is sound once an initial index exists.
  What remains plausible is a scoped, opt-in ranking signal over a bounded corpus such as the
  retrospectives (about 2.3 h to build), and only after a relevance study.
- **If any cognee backend is built**, the measured shape is one cognee API process per workspace on
  each node. The adapter talks REST, tracks a `data_id` per file so a changed file goes through
  `update`, and recovers `path:line` itself from the chunk text.

## Outcome / Next

- `memory-engine-port` waited on questions 2, 4 and 5. **2:** `relations(paths)` has no cognee
  adapter to shape; it stays graphify's structured edge read. **4 and 5:** any non-graphify backend
  behind the port is a REST client of a supervised per-node process, with `data_id` tracking for
  updates. The port can still be refined as a refactor in its own right, but cognee is not its first tenant.
- `cognee-backend` waited on all five, and this spike narrows it to nothing as specified: the code
  corpus is out, and the work corpus fails as an always-on reindex. It is the operator's call whether
  to retire it or re-scope it to an opt-in, lessons-only ranking experiment gated on a relevance study.
- PRD statements this corrects: "78 queries" (196 now); "unverified whether enola handles `.mjs`"
  (it does; cognee's per-file loader does not); "README inconsistent on `code_search`" (MCP exposes it,
  8 operations); "`cognee-ts` prebuilt linux/mac/win" (no Intel macOS, and its glibc floor excludes
  Ubuntu 22.04 and Debian 12).
- Recall taken for this shatter (id `f85f7807-b819-47b6-b974-4df5f4db744e`, owned by this spike)
  surfaced milestone 10's ADRs; none changed this spike's framing. The build recall of this run
  surfaced 11/R4 ("verify a wrapped tool against its actual arg-mapping and corpus shape"), which is
  the method this spike followed.
