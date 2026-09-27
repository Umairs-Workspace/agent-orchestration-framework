# RESEARCH — TencentDB Agent Memory as a memory solution (and a graphify replacement?)

**2026-09-12.** Subject: whether [TencentCloud/TencentDB-Agent-Memory](https://github.com/TencentCloud/tencentdb-agent-memory)
is a viable memory solution for aof, and whether any part of it could replace graphify
(milestones 09–11, [PRD-graphify-integration.md](./PRD-graphify-integration.md)).

Method: a shallow clone of the default branch at `0468a2a` (2026-09-11), read module by module —
READMEs, the four API docs, the deploy scripts, the proxy handlers, the knowledge engines, the
memory prompts, the SDK — plus the GitHub API for repo/issue/release facts and Docker Hub for image
facts. **Nothing was run.** No container was started, no repo was indexed, no benchmark was
reproduced. Every "measured" figure below is a count over the checked-in tree or a number the API
returned; every behavioural claim cites the file it was read from.

---

## 0 · The headline

**Not a memory solution for aof as shipped, and not a graphify replacement — but it points at one.**

Four findings carry the verdict:

1. **The only sanctioned integration path is a transparent LLM proxy that owns the model
   connection.** Claude Code is wired by rerouting `ANTHROPIC_BASE_URL` to the proxy and handing it
   an `sk-mem-…` key; the proxy then forwards upstream with **its own API key**. A Claude
   subscription (OAuth login session) cannot pass through it. That is exactly the auth shape every
   agent on this machine and the WSL/Mac workers runs on, and it is an open, unanswered upstream
   issue (#1352, filed 2026-09-11).
2. **The code-graph asset is not theirs.** "CodeGraph" is
   [`@colbymchenry/codegraph`](https://github.com/colbymchenry/codegraph) — a third-party
   Rust/tree-sitter indexer with its own CLI and MCP server, MIT, Windows builds — wrapped behind an
   HTTP service. The wrapper **only accepts public HTTPS git URLs**, bans loopback/private hosts,
   and has no local-path fetcher (a TODO comment; the request to add one was closed *not planned*).
   The wrapper is useless for a working tree. The tool it wraps is directly usable and is the one
   genuinely interesting graphify alternative this investigation surfaced.
3. **Its memory is LLM-authored, server-side, and accretive.** Conversations become L1 "atoms",
   L2 scene files and an L3 persona through LLM extraction; documents become an LLM-rewritten wiki.
   aof's memory is a **derived index** rebuilt from the work-stream markdown with a resolving
   `source:line` on every record (05/ADR-001, ADR-005). The two are different kinds of thing, and
   the derived-index invariant is the one aof has chosen and enforced.
4. **The public tree ships zero tests**, its deploy scripts are bash-and-Docker for macOS/Linux
   only, its prompts and half its documentation are Chinese-first, and it requires a paid
   OpenAI-compatible LLM key for extraction regardless of what the coding agent uses.

What it *does* have that aof lacks: memory of what agents said and decided across sessions,
automatic skill extraction from finished work, and a shared team store with ACLs. Those are real
gaps in aof (§5.3). This repo is a reference for them, not the component.

---

## 1 · What it is

### 1.1 Provenance and scale (GitHub API, 2026-09-12)

| Fact | Value |
|---|---|
| Repo | `TencentCloud/TencentDB-Agent-Memory`, created **2026-04-07**, last push 2026-09-11 |
| Stars / forks | 26,463 / 2,490 |
| Default branch | `feat/server_team` (not `main`) |
| License | MIT with a Tencent copyright header (GitHub reports `NOASSERTION`) |
| Contributors | 16 listed; 14 distinct authors across the 21 commits from 2026-08-15 to 2026-09-11 |
| Issues | 148 closed; `open_issues_count` 757 but that counts PRs — the 40 most recent "issues" held only **3** real issues; the rest were PRs |
| Releases | v0.2.2 (2026-05-12) → v1.0.0 (06-11) → v2.0.0 (08-03) → v2.0.1 (08-25) → **v2.0.2-beta.1 (09-07)**; a separate `v1.0.2` (09-08) line is the OpenClaw plugin package |
| Tree | 1,102 files; ~224k lines of TS/TSX/MJS/Py (Core 110k · Proxy 51k · Panel 42k · Knowledge 12k · SDK 9k) |
| Tests shipped | **0** (`find` for `*.test.ts`/`__tests__` finds nothing; `vitest.config.ts` includes `__tests__/**` which is absent; `.npmignore` excludes tests; CI = `npm pack` + manifest check + a "skill queue isolation" grep) |

The repo reads as a source drop of an internal product: an internal image registry
(`mirrors.tencent.com`) is in `.env.example`, a TCVDB (Tencent Cloud Vector DB) backend and COS
(Tencent object storage) paths run through Core and Proxy, and the changelog is Chinese-only.
Release cadence is roughly fortnightly and the PR volume is high, so it is alive; the shape of the
public tree is not the shape of a project you can run its own tests against.

### 1.2 Four services, four ports

| Service | Port | What it is | Image (Docker Hub `agentmemory/*`, 2026-09-07) |
|---|---|---|---|
| **MemoryCore** | 8420 | The kernel: L0–L3 memory, Skill module, and the *meta plane* (users, teams, agents, tasks, assets, ACLs). SQLite + local files by default; MongoDB experimental (off); TCVDB optional. **108** `/v3/*` endpoints, all `POST`. | `memory-core` 238 MB |
| **MemoryKnowledge** | 8421 (8424 in the stack) | Wiki engine + CodeGraph wrapper + a 12-tool MCP stdio server that forwards to its own HTTP API. **37** endpoints. | inside `memory-hub` 390 MB |
| **MemoryProxy** | 8096 | Transparent LLM proxy: Anthropic `/v1/messages`, OpenAI chat, OpenAI Responses. Session init, injection, write-back, auth, billing. Redis by default. | `memory-proxy` 190 MB |
| **MemoryPanel** | 8125 | Hono + React control panel ("Memory Hub"). | inside `memory-hub` |

Deployment is `deploy/global-images/start-all.sh` — interactive bash that probes two LLM endpoints
(a **memory group** for extraction/wiki, a **proxy group** for the coding agent's upstream), writes
`.env`, boots the three containers, mints an admin `sk-mem-` key, and prints a `claude` launch
line. The deploy README states the environment as **"macOS / Linux"**; Windows appears nowhere in
the repo except as a figure of speech.

### 1.3 Language

The four L1/L2/L3 prompts (`MemoryCore/src/core/prompts/*.ts`, 236–572 lines each) are written
in Chinese with an instruction to produce free text in the user's language. The BM25 path
pre-segments text with jieba (`MemoryCore/src/core/store/tokenize.ts`); English falls through to a
Unicode-regex split. README, INSTALL, CONTRIBUTING and the MemoryCore/MemoryProxy READMEs are in
English; the agents guide, the deploy README, the Knowledge README, the changelog and all four API
reference documents are Chinese-only. Nothing here is a blocker for an English corpus, but it is
a maintenance-language signal.

---

## 2 · The memory model

### 2.1 Four layers

| Layer | What it stores | How it is made | How the agent gets it |
|---|---|---|---|
| **L0** conversation | Raw turns | Written by the proxy after each human turn (`/v3/conversation/add`) | Tool call (`conversation/search`, `conversation/query`) |
| **L1** atoms | Extracted facts | LLM extraction every N conversations (`pipeline.everyNConversations: 5`, idle timeout 600 s), then an LLM dedup/merge pass against a candidate pool | Tool call (`atomic/search` — BM25, or BM25+embedding with RRF) |
| **L2** scenes | Markdown "scene block" files, ≤15 | An LLM with `read/write/edit` file tools rewrites the scene directory (`scene-extraction.ts`) | **Index injected** into the system prompt; body via `scenario/read` |
| **L3** persona / doctrine | One `persona.md` | An LLM with file tools rewrites it every 50 memories (`persona.triggerEveryN`) | **Injected whole** into the system prompt |

Two prompt families switch on `MEMORY_PROMPT_MODE`. `chat` extracts `persona / episodic /
instruction` atoms and a ≤2,000-char persona. `code` (the deploy default) extracts `work_fact /
work_task / work_method / work_artifact` and rewrites L3 as a ≤1,200-char **"Team Operating
Doctrine"** — principles, reusable SOPs, prohibitions. That is the closest thing in the repo to
aof's lessons, and it is a lossy LLM summary regenerated in place rather than a record with a source.

Retrieval defaults (`tdai-gateway.standalone.yaml`, `auto-recall.ts`): `maxResults 5`,
`scoreThreshold 0.3`, `strategy hybrid`, `timeoutMs 5000`, `embedding.provider none` — so **BM25 only
unless an embedding endpoint is configured**. The design note in the proxy's memory-tools injector is
explicit about why L0/L1 are tools rather than injected: per-turn injection "breaks the KV / prompt
cache", so the system prompt is kept stable and the model is told to `curl` for facts.

### 2.2 Skills

`/v3/skill/*` (17 endpoints): create, version, attach resource files, search, and **extract from a
conversation** — the proxy archives the turn slice to `skill/conversation/add` and a background
extractor decides whether it is a reusable how-to. Attribution says the skill code is lifted from
Hermes Agent. Private by default, shareable to a team after review.

### 2.3 Wiki

`MemoryKnowledge/src/engines/wiki/` — "inspired by Karpathy's LLM wiki". Upload raw files
(`raw/write`: **≤10 files per call, ≤512 KB per file, ≤5 MB per call**), then `ingest`: each
source is chunked at 28,000 chars, sent through a **two-stage LLM pass** (an analysis prompt that
plans entities/concepts, then a generation prompt that emits `<<<FILE path=…>>>` blocks), and each
candidate page is **merged into the existing page by another LLM call**. Pages carry
frontmatter (`type`, `title`, `sources`, `[[wikilinks]]`), the link graph is stored in SQLite with
FTS5 for BM25 (title ×5), and `graphology-communities-louvain` computes communities. Search supports
multi-hop expansion over wikilinks (`hop ≤ 5`, `decay 0.5`, `minScore 0.1`, `maxNodes 200`).

### 2.4 CodeGraph

`MemoryKnowledge/src/engines/code/bridge.ts` is a 200-line adapter over
`@colbymchenry/codegraph`: it resolves the platform package
(`@colbymchenry/codegraph-<platform>/lib/dist/mcp/tools.js`), calls `CodeGraph.init/open/sync`,
and forwards tool calls to codegraph's own `ToolHandler`. The nine exposed tools are codegraph's:
`get_info · search · explore · callers · callees · impact · node · status · files`. The engine adds
nothing to the graph; what it adds is a git clone, a build queue, a sync scheduler, and tenancy.

The source fetcher (`source-fetcher/git-fetcher.ts:58-61`) rejects anything that is not
`https://`, and its SSRF blocklist (`:26`) rejects `localhost`, `127.*`, `10.*`, `172.16-31.*`,
`192.168.*`, `169.254.*`, `::1`. `registry.ts:16` carries `// 未来：LocalSourceFetcher` (future).
Issue #1109 "CodeGraph supports local repositories" (with PR #1093 implementing a
`LocalSourceFetcher`) was **closed as not planned** on 2026-08-21.

---

## 3 · The integration model — and why it does not fit this machine

### 3.1 How Claude Code is wired

From `INSTALL.md` and `agents/claude-code/README.md`:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8096/claude-code/default
export ANTHROPIC_AUTH_TOKEN='sk-mem-<32 chars>'      # the panel-issued user key
claude --model <PROXY_UPSTREAM_MODEL>
```

The proxy pipeline per request (`MemoryProxy/README.md`, confirmed in `anthropicHandler.ts`):
`auth` (the `sk-mem` key → `user_id` via Core) → `sessionInit` (first turn: a synthetic
`AskUserQuestion` tool_use walks the user through team → agent → task; paginated 3+1 because the
tool caps at 4 options) → `injection` (skills, knowledge tool recipes, L3 persona, L2 index,
`<tdai_memory_tools>` curl recipes appended to the system prompt) → forward → async L0 write-back
and skill archival.

### 3.2 The auth shape

`anthropicHandler.ts:1240-1242` resolves the upstream key as the per-agent `apiKey` or the global
`upstream.apiKey`, and `:357-358` sets it as `x-api-key` and **deletes the incoming
`authorization` header**. The only passthrough mode forwards the client's own header — which is the
`sk-mem` key, which Anthropic would reject. So the upstream is always API-key-authenticated. A Claude
Pro/Max login session (OAuth) has no path through the proxy.

That is the auth every agent run here uses: the daemons launch `claude` on a login session
(`.claude/rules/build-deploy-restart.md` — "an SSH-spawned daemon has no login session →
unauthenticated `claude`, burned runs"). Routing those through the proxy would either fail or move
every run onto pay-per-token API billing.

Upstream knows. **#1352** (2026-09-11, open, no maintainer reply): *"I want memory access and model
access to be independent — connecting memory must not require changing the native model endpoint."*
**#1132** (closed 2026-08-23): "the upstream-injection approach is too heavy", asks for a hook-based
path. The roadmap's next items are Cursor support and `mem:` commands; no MCP-first or hook-first
adapter is planned.

### 3.3 The paths that do not need the proxy

| Path | What it gives | What it costs |
|---|---|---|
| **MemoryCore HTTP / SDK** (`@tencentdb-agent-memory/memory-sdk-ts-v2`, 19 data-plane methods + skill + meta clients) | Direct read/write of L0–L3 and skills from aof code; no model rerouting | A running Core (Docker or `node --import tsx src/gateway/server.ts` with native `sqlite-vec` + `@node-rs/jieba`), plus an OpenAI-compatible key for the extraction pipeline |
| **MemoryKnowledge MCP** (`knowledge-mcp`, stdio → HTTP, 12 read tools) | Wiki search/read/graph and the 8 codegraph tools inside Claude Code | A running Knowledge service; the codegraph tools are only useful for public HTTPS repos |
| OpenClaw / Hermes / Pi plugins | Hook-based capture + recall | Not our runtimes |
| `agents/asset-import.ts --source claude-code` | Imports `~/.claude/skills/*` and `~/.claude/projects/*/*.jsonl` sessions into the hub as skills + L0 | A one-shot batch, not a loop |

Only the first two are relevant to aof, and neither gives the thing the proxy is built for —
automatic capture of every agent turn.

---

## 4 · graphify vs TencentDB — three roles, three answers

graphify plays three roles in aof today, and each has to be answered separately.

| # | Role in aof | Where | TencentDB's answer |
|---|---|---|---|
| 1 | **Codebase graph**: `aof graph build / query / triage / impact`; `graph impact` is the deterministic file-anchored coupling `refine` and `code-review` consume; `graph_build/query/triage` are the rendered MCP tools | `src/commands/graph/*.mjs`, `src/graphify.mjs` (sole spawn site), `src/graph-mcp-server.mjs` | **CodeGraph — but only the wrapped tool, not the wrapper** (§4.1) |
| 2 | **Work-stream graph** as a re-rank signal in the memory backend: `reindex` builds a second graph over `wiki/work` via `claude-cli` extraction under `.aof/memory-graph/` | `src/memory/graphify-backend.mjs` | **No equivalent.** The wiki engine ingests markdown but re-authors it (§4.2) |
| 3 | **Rendered faces**: a `graphify` skill + MCP entry that route through aof commands | `src/graph-faces.mjs` | Same shape is possible over any provider; not a differentiator |

### 4.1 Role 1: CodeGraph is the real candidate, and it is not TencentDB

| Dimension | graphify (pinned 0.9.5) | `@colbymchenry/codegraph` (direct) | TencentDB CodeGraph (wrapped) |
|---|---|---|---|
| Parser | tree-sitter (Python tool) + LLM-inferred edges | **Rust kernel, tree-sitter grammars, 20 languages** (TS/JS/Py/Go/Rust/Java/C#/… plus Svelte/Vue/Astro) | same engine |
| Edge semantics | imports/calls + INFERRED cross-doc edges with confidence, hyperedges | Deterministic call graph incl. dynamic-dispatch hops; callers/callees/impact with depth | same |
| LLM required | Code-only build: no. Docs extraction: yes (`claude-cli`) | **No** | No for the graph; yes for the service's wiki |
| Egress | `docs-media` for the work graph; none for code | **None** | The repo is cloned onto the service host; tool results traverse HTTP |
| Indexes a local working tree | Yes (cwd) | Yes (`codegraph init` in the tree) | **No** — public HTTPS git only, private hosts blocked |
| `impact` verb | `graph impact <files>` → dependents/dependencies from edges (aof-computed) | `codegraph_impact <symbol> depth` (native) | same, over HTTP |
| NL query | `graph query` (fuzzy, markdown-only output, RESEARCH §C) | `explore` returns grouped verbatim source per file — the tool its README calls the one to use | same |
| PR triage | `graph triage` (markdown, no `--json`) | none | none |
| Windows | PyPI wheel; store-provisioned (`aof project provision graphify`) | **Self-contained x64/arm64 builds**, `install.ps1`; bundles its own Node | Docker only |
| Install shape | PyPI `graphifyy`, daily releases (the pin/PATH drift 09 documents) | npm `@colbymchenry/codegraph` + platform package, or the standalone binary; `codegraph upgrade` | three containers |
| License / traction | MIT (star count not recorded in 09 RESEARCH) | MIT; 70.6k stars, 4.5k forks | MIT |

The thing `refine.md:163-184` actually wants — "the exact dependents + dependencies of each from
the graph's edges (deterministic — not the fuzzy similarity-seeded `graph query`)" — is what
CodeGraph does natively and graphify does only after aof computes it from `graph.json`. CodeGraph
also removes two of graphify's documented pains: the `claude-cli` extraction that can hang
(`graphify-backend.mjs` carries a spawn-guard for exactly that) and the version drift of a
daily-shipping PyPI package. What it does not have is graphify's LLM-inferred cross-document edges
and hyperedges — which only role 2 uses.

**Unmeasured, and the spike-worthy question:** index time and `impact` fidelity on this repo
(325 `.mjs` modules under `src/`; the graphify driver comment records a 617-file corpus for the whole tree), and whether CodeGraph's JS import resolution handles aof's
`import … from "./x.mjs"` and dynamic `import()` seams (`work/memory.mjs`'s lazy backend registry
is a dynamic import; graphify's static graph misses those edges too, so the comparison is fair).

### 4.2 Role 2: the work-stream graph has no equivalent here

The wiki engine could ingest `wiki/work/**/*.md` — 1,046 files, 16.1 MB, none over the 512 KB cap
— but at ≥105 `raw/write` calls, and every file then costs two LLM calls plus one merge call per
page it touches. The result is an **LLM-paraphrased second corpus** with its own page identities,
stored in the service's SQLite and volume. That is the "authoritative second copy" the
derived-index invariant (05/ADR-001) exists to refuse, and it is not rebuildable
deterministically: two ingests of the same source produce different pages.

The one piece worth borrowing is small and needs no service: the wikilink multi-hop expansion
(`graph-search.ts`, 91 lines of BFS with decay) is a cleaner formulation of the "graph as re-rank
signal" that 10/01 stubbed into `graphify-backend.mjs`.

---

## 5 · The memory seam vs TencentDB memory

### 5.1 What aof's memory is

`aof work memory {recall, brief, ingest, reindex, status}` over a frozen backend interface
`{name, recall, reindex, status}` (05/ADR-003), with **one** selection read
(`config.memory.backend`, 05/ADR-002). Records are parsed out of the work stream — `R<n>`
retrospective entries → `lesson`, `ADR-NNN` blocks → `adr`, OUTCOME headings → `capability`/`gap`
— each with a `source: path:line` that must resolve to live text. Live here today: backend
`graphify`, **2,341 records**, 3.76 MB index at `.aof/aof.memory.graphify.index.json`, rebuilt
2026-09-12 17:56 UTC, work graph 371 KB. The index is git-ignored and **never on the mesh**
(`acd-memory-index-never-on-mesh`).

### 5.2 Where the two models collide

| aof invariant | TencentDB | Verdict |
|---|---|---|
| Derived, rebuildable from source; nothing accretes (05/ADR-001) | L1–L3 are LLM outputs that accumulate and are merged by further LLM calls; the wiki is LLM-authored | **Incompatible as a store of aof's records**; compatible only as a *cache* aof could rebuild by re-pushing |
| Every record resolves to `source:line` (ADR-005) | Atoms carry `source_message_ids` back to L0 turns; wiki pages carry `sources: [filename]` | Provenance exists but at message/file granularity, not line |
| Selection in one place; backend behind the 4-method interface | Every op is an HTTP `POST` returning `{code, message, data}` | **A `tencentdb` backend is mechanically feasible** in the same one-line registry slot `graphify` took |
| Index never on the mesh | The whole point is a shared server | A different design, not a violation — but it would need its own ruling |
| Egress is declared and minimal (`egress: docs-media` for the work graph; code never leaves) | Every captured turn, every ingested doc, every extraction prompt goes to the configured LLM endpoint, and everything is stored on the service host | Must be surfaced honestly if ever adopted |
| CLI-as-contract; faces are thin (08) | Agents are told to `curl` bridge URLs from Bash, with identity headers baked into the prompt | Would have to be re-fronted as `aof` commands; the injected curl recipes are the opposite of the 08 rule |

### 5.3 What TencentDB has that aof does not

These are the gaps this investigation is actually useful for, independent of whether the component
is adopted:

- **Conversation memory across runs.** aof observes transcripts after the fact
  (`aof work observe`, `~/.claude/projects` JSONL) but keeps no memory of what an agent concluded.
  TencentDB's L0 capture → L1 `work_fact` / `work_task` / `work_method` extraction is a working
  design for that, including the dedup/merge prompt (`l1-dedup.ts`) that decides `store | update |
  skip | merge` against a candidate pool.
- **Skill extraction.** "After completing complex work, extract a reusable skill" is a loop aof's
  retrospective → memory ingest approximates for *lessons*, not for *procedures*.
- **Team scoping and loadout.** Per-agent asset binding with `private / team / restricted / agent`
  visibility. aof's mesh has workspace identity and enrollment but no per-agent memory scope.
- **The L2/L3 split as a token strategy.** Inject the small stable thing (doctrine), index the
  medium thing (scenes), tool-call the large thing (atoms, turns). RESEARCH-agent-loop-economics §0
  measured aof paying 3.6 MB of cache-write per spawn; this is one answer to that.

---

## 6 · Operational fit for this machine

| Concern | Finding |
|---|---|
| OS | Deploy scripts are bash + Docker, documented for macOS/Linux. Docker Desktop on Windows would run the three images; the WSL node (`aof-wsl`, own IP and identity) is the natural host. |
| Ports | 8420 / 8125 / 8424 / 8096 — no clash with fleet `:4181` / control `:4182`. |
| Keys | Two LLM groups. The **memory group** (extraction, wiki, skill) must be an OpenAI-compatible API key — the Claude subscription cannot be used for it. The proxy group is the model-rerouting path (§3). |
| State | Redis by default for the proxy (`storage.backend: sqlite` is the no-Redis alternative); SQLite volumes for Core and Knowledge; MongoDB experimental and non-migrating. |
| No-Docker run | Core: `node --import tsx src/gateway/server.ts` with `sqlite-vec 0.1.7-alpha.2` and `@node-rs/jieba` natives. Knowledge: `better-sqlite3` + the codegraph platform package. Untested on Windows anywhere in the repo. |
| Multi-tenant model | Every data-plane call requires `team_id + agent_id + user_id` (defaults to a `default` bucket). aof has none of these identities to hand it today; it would be inventing them. |
| Security posture | Core Bearer gate is **off** in the local deploy so the proxy can talk to it; Knowledge is "intranet trust", `x-tdai-service-id` only, no auth. Fine on loopback; not something to expose on a LAN. |
| Benchmark | README claims PersonaMem 48% → 76%. Nothing in the repo reproduces it. |

---

## 7 · Verdicts

| Question | Answer |
|---|---|
| Replace graphify with TencentDB? | **No.** The graph service cannot index a working tree or a private repo, and the rest is a proxy-and-panel product aof would use one corner of. |
| Replace graphify with CodeGraph directly? | **Plausible, for role 1 only** (`graph impact`, `explore`-style grounding, the MCP tools). Deterministic, LLM-free, Windows-native, 20 languages. Role 2 (the work-stream graph) and `graph triage` have no CodeGraph equivalent — role 2 would fall back to graphify's docs extraction or be dropped with the re-rank stub. **Needs a spike** (§4.1) before it is a milestone. |
| Use TencentDB as the memory backend behind `aof work memory`? | **Not for aof's records.** A backend that pushes the derived records into Core as L1 atoms and recalls by BM25/hybrid is mechanically a one-registry-line change, but it buys hybrid retrieval at the cost of a running service, a paid extraction key, invented tenant identities, and a second copy of the index off-repo. graphify's re-rank signal plus the local BM25-ish ranker is not the bottleneck the loop-economics research found. |
| Use the proxy for conversation memory? | **Blocked** by the subscription/OAuth shape of every agent run here (#1352). Revisit if upstream ships an MCP/hook adapter that does not own the model connection. |
| What is worth taking? | (a) CodeGraph as a graph provider candidate. (b) The L2/L3 "inject the doctrine, index the scenes, tool-call the atoms" token strategy. (c) The L1 extraction + dedup prompt pair as a reference for a future "what did the agents conclude" memory over `aof work observe` transcripts. (d) The 91-line wikilink multi-hop BFS as the shape of a real re-rank term. |

### 7.1 What would change the verdict

- Upstream ships #1352 (memory access decoupled from the model endpoint) — the proxy blocker goes.
- Upstream merges a `LocalSourceFetcher` (#1093 was written; #1109 was closed not planned) — the
  wrapped CodeGraph becomes usable for a tree, though direct CodeGraph would still be simpler.
- Tests appear in the public tree — a signal the open-source repo is the development repo.

### 7.2 Recommended next step

One spike, not a milestone: install `@colbymchenry/codegraph` on this machine, index this repo,
and run its `impact` and `explore` against the same file set `refine` currently feeds
`aof graph impact`. Measure index time, edge counts against graphify's `graph.json`, and whether
ESM `.mjs` + dynamic-import seams resolve. Record the finding; only then decide whether
[PRD-graphify-integration.md](./PRD-graphify-integration.md)'s "backend-agnostic on purpose" seam
gets a second provider. TencentDB itself is a watch item, not a spike.

---

## 8 · Sources

Clone: `TencentCloud/tencentdb-agent-memory` at `0468a2a5` (2026-09-11 16:29 +0800), read in the
session scratchpad. Paths below are repo-relative.

- Product and install: `README.md`, `INSTALL.md`, `ROADMAP.md`, `CHANGELOG.md`, `CONTRIBUTING.md`,
  `deploy/global-images/{README.md,.env.example}`, `agents/README.md`,
  `agents/claude-code/{README.md,asset-import.md}`.
- Memory kernel: `MemoryCore/README.md`, `MemoryCore/v3-api-memorycore-doc.md` (108 endpoints),
  `MemoryCore/tdai-gateway.standalone.yaml`, `MemoryCore/src/core/prompts/{l1-extraction,l1-dedup,
  scene-extraction,persona-generation}.ts`, `MemoryCore/src/core/hooks/auto-recall.ts`,
  `MemoryCore/src/core/store/{tokenize,bm25-local}.ts`,
  `MemoryCore/src/adapters/standalone/llm-provider-resolver.ts`, `MemoryCore/package.json`.
- Knowledge: `MemoryKnowledge/README.md`, `MemoryKnowledge/v3-api-memoryknowledge-doc.md`
  (37 endpoints), `src/engines/code/bridge.ts`, `src/source-fetcher/{git-fetcher,registry}.ts`,
  `src/routes/{code-graph,tools}.ts`, `src/mcp/tools.ts`, `src/engines/wiki/{types,graph-search,
  manager,index-db}.ts`, `src/engines/wiki/ingest-v2/{index,prompts}.ts`, `package.json`.
- Proxy: `MemoryProxy/README.md`, `MemoryProxy/config.example.yaml`, `src/anthropicHandler.ts`
  (`extractApiKey` :257, forward headers :342-366, upstream key :1236-1242),
  `src/injection/injectors/{tdai-tools-injector,tdai-profile-memory-injector,
  knowledge-tools-injector}.ts`.
- SDK: `sdk/memory-core/typescript/{README.md,package.json,src/v3/index.ts,src/v3/client.ts}`.
- GitHub API (2026-09-12): repo metadata, contributors, commits (last 21), open issues (latest 40),
  closed-issue search (148), releases (15). Issues read: #1352, #1109, #1132. Docker Hub tags for
  `agentmemory/{memory-core,memory-hub,memory-proxy}`.
- CodeGraph: `github.com/colbymchenry/codegraph` README (languages, Rust kernel, Windows installer,
  MIT, 70.6k stars). The npm page returned 403 and was not read.
- aof side: `src/work/memory.mjs`, `src/memory/{graphify-backend,local-indexing,local-backend,
  none-backend}.mjs`, `src/commands/graph/*.mjs`, `src/graphify.mjs`, `src/graph-faces.mjs`,
  `src/graph-mcp-server.mjs`, `src/bundle/commands/refine.md:137-184`,
  `.aof/aof.config.json` (`memory.backend: graphify`), the live index and work graph under `.aof/`,
  `wiki/planning/{PRD-graphify-integration,PRD-graph-engineering,RESEARCH-agent-loop-economics}.md`,
  `.claude/rules/build-deploy-restart.md`.
