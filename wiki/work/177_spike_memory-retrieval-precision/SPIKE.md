---
type: spike
number: 177
slug: memory-retrieval-precision
title: "What aof memory should be as one system — one home per kind of knowledge, one read path that earns its place"
status: done
owner: architect
created: 2026-10-20
updated: 2026-10-28
depends: []
timebox: 3d
schema: 1
aofVersion: 0.1.0
---
# 177 · What aof memory should be as one system

## Question

The memory milestones (148, 153, 157, 159, 161) built the plumbing, but none of them changed how
records are chosen. The recall ledger they produced is the evidence. Across 78 recorded recalls,
325 records were judged: 214 `irrelevant` (66%), 107 `honoured`, and 4 `departed`. Ranking is still
05's keyword ranker. The graphify re-rank that was meant to improve it has never produced a graph on
the control node: `.aof/memory-graph/graphify-out/` has been empty since 2026-08-06, while every
reindex still attempts the extraction.

The problem is wider than ranking: memory is disjoint. Procedural knowledge lives in five stores
(retro `**Lesson:**` lines, bundle prompts/agents, `.claude/rules`, the operator's Claude
auto-memory, and skills), and only the lessons are indexed. One lesson often sits in several of them
with no reconciliation; the node_modules junction lesson is in auto-memory, m45/R13, m68/R10 and
72/ADR-007. Episodic sources (runs, `FEEDBACK.ndjson`, STATE notes, observability, findings,
transcripts) and semantic ones (ADRs, OUTCOME, AOF.md, `wiki/*.md`, TECH_DEBT) are indexed in
parts. There are two indexes, a graphify memory graph that never builds, and recall wired
separately into five commands. Inventory: `wiki/planning/research/RESEARCH-agent-memory-procedure.md` §2.

**What should aof memory be as one system? That means one place a piece of knowledge lives, one
write path, and one read path an agent actually benefits from. What, of today's pieces, is kept,
merged, or retired (graphify for markdown included)?**

The finding is a target design an outsider can check. It covers:

- **Homes:** where each kind of knowledge (procedure, what happened, what's true) has its single
  home, and how today's duplicates collapse into it.
- **Delivery:** how knowledge reaches an agent. Always-loaded rules and an index, pull-on-demand
  recall, or a split between the two.
- **Retrieval evidence:** which retrieval earns its place, measured below.
- **Disposition:** keep, merge or retire for every current piece, including the five recall edges,
  both indexes and the graphify memory backend. Graphify stays for the CODE graph, where it is good.

Retrieval candidates, all replayed over the same 78 recorded queries:

1. **Baseline:** today's ranker, as it ranks now.
2. **Lexical shortlist plus an LLM pick:** a cheap `claude -p` pass (CLI subscription, no API key)
   chooses which shortlisted records apply.
3. **Always-loaded index:** a one-line-per-lesson index sits in context and the agent opens entries
   itself. No ranker at all, the same shape as the operator's Claude Code auto-memory.
4. **Retire what has been promoted:** drop lessons already promoted to a rule, prompt or control
   (153's `**Promoted to:**`), so recall covers only what isn't already enforced. This can combine
   with any of 1–3.
5. **Local embeddings:** rank by similarity under a small local embedding model, alone and fused
   with the baseline's lexical score. Added 2026-10-28 from 176's finding. cognee's keyless recall
   over the work corpus was `CHUNKS` search, which is embedding similarity over chunks (fastembed
   `BAAI/bge-small-en-v1.5`, about 130 MB). Its entity graph cost 37 projected hours and a 6 GB
   memory floor, and contributed nothing that recall used. So the semantic signal cognee offered
   is testable without cognee. Measure it with no Python service and no egress. A Node-side model
   is preferred if one runs on every node type, and record what that takes. If this candidate
   does not beat 1, no engine built on embeddings earns its place either.

The ledgers now hold 196 recorded recalls (195 distinct queries; 176, M3). The figures above were
taken at 78. Replay over all of them, and restate the verdict split at 196.

## Timebox

- Box: `3d`. At the boundary, stop and record the best finding available. Extending the timebox
  requires explicit re-scoping.
- Stop condition: the target design is written, every current piece has a disposition, and the
  retrieval choice is backed by the replay (or the replay shows no ranker earns its place, and that
  is the finding). The follow-on work is a planning PRD for `aof:shatter`, not built here.
- Caveat: the ledger's verdicts are self-assessed by the recalling agent. Hand-check a sample of
  them before treating them as ground truth.
- Throwaway code only, in a scratch dir. No change to `packages/` and no live `aof` command over the
  global store.

## Investigation

Run 2026-10-28 on the Intel MacBook (darwin x86_64, 12 cores, 32 GB), a standalone node. The
2026-09-17 inventory was taken on the Windows control node, so every count here is re-measured on
this tree. Throwaway code only, in the session scratchpad; nothing under `packages/`, and no `aof`
command run. The replay imports aof's own `rankRecords` (`local-retrieval.mjs:313`) and the graphify
backend's own `rerank` (`graphify-backend.mjs:610`), so candidates 1 and 1g are today's code, not a
re-implementation.

**Corpus and queries.** The corpus is the derived index built 2026-10-27
(`.aof/aof.memory.graphify.index.json`): 5,219 records, made up of 1,621 capabilities, 957 lessons,
918 findings, 696 ADRs, 505 gaps, 455 runs, 51 feedback entries and 16 summaries. The queries are
every `kind: "recall"` entry in the ledgers on the day: **200 recalls** (199 distinct texts). By
edge: `verify-finding` 112, `continue-developer` 55, `refine-architect` 18, `refine-po` 14,
`shatter-po` 1; `continue-episodic` has never fired. Each recall replays with its recorded scope. A
query that is not item-scoped cannot retrieve its own item's records, so a verify recall never
finds the finding it is triaging. Records written after a query, by other items, remain in every
candidate's corpus alike.

**Restated verdict split, at 200.** 898 records judged: 591 `irrelevant` (66%), 260 `honoured`, 47
`departed`. The split is not uniform: `verify-finding` is 56% of recalls and holds 75% of the
irrelevant verdicts (78% irrelevant on its own), against 47% for `continue-developer` and 45% for
`refine-architect`. `refine-po` returned zero records on 12 of 14 recalls by construction: it
recalls `--item <ref>` for an item that is not in the index until it has records.

**Ground truth.** The ledger's verdicts can only score the records the original recall returned,
so they cannot score a candidate that surfaces anything else. The replay therefore uses TREC-style
pooling. For each query in an evaluation sample, the pool is the union of the first 10 results of
every ranker, both LLM candidates' picks, and the records the original recall returned. A judge
grades every pooled record 0 (not relevant), 1 (worth a glance) or 2 (should change the decision),
against a rubric per edge. The judge is opus; the candidates use haiku and sonnet, so no candidate
grades itself. The sample is 127 recalls: every recall of every edge except `verify-finding` that
had anything in scope, plus a seeded 40 of the 112 `verify-finding` recalls.

- **Judge vs a human.** I graded a seeded 40 of the judge's labels blind and agreed on 36 (90%) on
  relevant vs not. Three of the four disagreements were the judge grading a loose match 1.
- **Ledger vs judge (the caveat).** On the 511 originally-returned records the judge also graded,
  the recalling agents' verdicts agree with it **73%** of the time. 98 records an agent called
  `irrelevant` the judge grades relevant, and 40 go the other way. An agent's verdict answers "did
  this change what I did", which is not "was this worth surfacing". The ledger is evidence of
  influence, and is not usable as ranking ground truth without this correction.

**Candidates, scored on the 127 judged recalls.** In the table, *strong* and *relevant* count
records graded 2 and graded ≥1 in what the candidate shows; *noise* counts records graded 0.
*Strong hit* counts recalls where the block contains at least one 2, out of the 98 recalls whose
pool held a 2.

| candidate | shown | strong | relevant | noise | nDCG@5 | strong hit |
|---|---|---|---|---|---|---|
| 1 · lexical, today's ranker | 5.00 | 1.31 | 2.98 | 2.02 | 0.55 | 74/98 |
| 1g · lexical + graphify re-rank | 5.00 | 1.31 | 2.98 | 2.02 | 0.55 | 74/98 |
| 5a · embeddings alone | 5.00 | 0.88 | 2.21 | 2.79 | 0.37 | 55/98 |
| 5b · lexical + embeddings (RRF, k 60) | 5.00 | 1.25 | 2.87 | 2.13 | 0.51 | 70/98 |
| **2 · lexical top 20 + haiku pick** | 4.21 | **1.67** | **3.53** | **0.69** | **0.72** | **85/98** |
| 3 · always-loaded index + sonnet pick | 4.62 | 1.56 | 3.41 | 1.21 | 0.62 | 84/97 |

By edge, nDCG@5 for lexical → haiku pick: `continue-developer` 0.49 → 0.66, `refine-architect`
0.51 → 0.79, `verify-finding` 0.52 → 0.71. `refine-po` is already 0.99 under lexical, because its
item scope does the work, and the pick adds nothing (0.88). Embeddings alone are the worst candidate
on every edge, and the hybrid is within noise of lexical on every edge but one (architect, 0.56). The
full per-edge tables, the judge-cost and agreement figures included: [REPLAY.md](REPLAY.md).

- **Candidate 1g is a no-op, measured two ways.** By code, `rerank` takes the lexical ranker's
  already-truncated top 5 (`graphify-backend.mjs:613`, the default limit), so it can only reorder,
  never change which records are surfaced. By measurement, it changed neither the set nor the order
  on **200 of 200** recalls; its boost was non-zero on **0**. The work graph on this node *is* built
  (379 nodes, 488 links, 2026-10-27), but every node comes from code parsing of 35 `.mjs`/`.sh`
  files under archived spike and reference folders. None of the 2,019 markdown files any record
  comes from is in it: the prose (LLM) pass produced nothing. On the control node the graph has
  never built at all. Either way, each reindex still runs `graphify extract wiki/work --backend
  claude-cli` (about 57 s here), which sends the work stream to a hosted model, for no effect on
  recall.
- **Candidate 4 is a no-op today.** 149 lessons carry `**Promoted to:**`, 144 of them `none`; 5
  name a control, all from 165 and 171. Lexical recall surfaced one of the five in its top 5 on 0
  of 200 recalls, and embeddings on 2. Retiring promoted lessons is correct, and it has nothing to
  retire until lessons are promoted.
- **Candidate 3 fails on delivery before ranking.** The in-scope index averages 31 KB (about 8 k
  tokens) for `continue-developer`, 107 KB for `refine-architect` and 129 KB for `verify-finding`.
  For the unscoped `shatter-po` it is 5,219 lines, about 620 KB or 155 k tokens, so that edge was
  not run. Where it ran it beat lexical but not the shortlist pick, at about 62 k input tokens per
  call against 39 k. It was below lexical on `verify-finding` (0.46).
- **Candidate 2's cost.** p50 8.9 s and p95 10.7 s per recall; about $0.005 API-equivalent on
  haiku (subscription CLI here). It adds no egress class: the session that recalls already sends
  the work stream to the same provider. Two runs of the identical prompt returned different picks
  (2 vs 3 records), so the pick is not deterministic. On the 2 recalls whose whole pool was
  irrelevant, it returned an empty block once.
- **Embedding cost, for the record.** fastembed 0.9.1 (onnxruntime 1.23.2) installs into a 172 MB
  environment in 2 s, with a 64 MB model. Embedding the 3.9 MB corpus took **962 s** wall (4,541
  CPU-s) at a **3.3 GB** peak; a query embeds in 14–16 ms. In Node, `@huggingface/transformers` 3
  (380 MB of `node_modules`, installed with scripts disabled) embeds in-process on this Intel Mac:
  q8 at about 98 ms per record and 1.25 GB, at a mean cosine of 0.996 against fastembed's vectors.
  Its package ships `linux/x64` and `win32/x64` binaries; neither was run.

**Homes and duplicates** (from a read-only sweep of this tree, every count from a command):

- **Procedure** lives in five places: 962 lesson headings (957 indexed), 1 rule file
  (`.claude/rules/build-deploy-restart.md`), `AGENTS.md`, the bundle (8 agents, 35 commands, 3
  skills), and the operator's auto-memory (2 entries on this node; the 61 counted in September are
  on the Windows node and reach no other node).
- **Duplication.** A sample of ten durable rules shows two shapes:
  - *Duplicated as lessons.* Three rules recur as 4–10 separate lessons with none promoted:
    "never junction `node_modules` into a worktree" is 6 lessons, 2 ADRs, 6 `TECH_DEBT` lines and
    2 code controls; "do not run the full suite on the control node" is 10 lessons; "build in the
    operator's checkout" is 4.
  - *Never a lesson.* Three rules (never force-kill the desktop app, never start a daemon over SSH,
    `wsl.exe` mangles argv) live only in the always-loaded rule file, and that is working as
    intended.
- **What happened** — terminal runs (455), raw feedback (51) and findings (918) — is indexed since
  157. STATE notes (117 files) are not. Observability is gitignored per node, so 0 of 455 run
  records carry stall data.
- **What's true** — ADRs, OUTCOME capabilities and gaps, AOF.md — is indexed. `wiki/*.md` (14),
  `wiki/planning` (19), `TECH_DEBT.md` and SPEC/STORY/RESEARCH are not.
- **Two index files, one live.** `aof.memory.graphify.index.json` is the live one;
  `aof.memory.index.json` is a 2-hour-older snapshot that nothing reads. Only the configured
  backend's `reindex` writes its own file.
- **Read paths.** Recall is wired into five commands at 8 call sites, plus 1 `recurrence` call.
  The retrospective's two recalls are never recorded in a ledger. `brief` is retired. The MCP
  server exposes no memory tool, and six hyperagent skills substitute a code search for recall.
- **Stale citations.** `aof-architect.md:83` names a memory-recall hook that does not exist.
  `loops/retrospective-memory-ingest.md:32` lists the retired `brief`. `guard-test-isolation.mjs`
  cites an auto-memory entry absent from this node.

## Finding

**One change earns its place: keep the lexical ranker as a shortlist of 20, and have a model pick
at most 5 from it.** On 127 judged recalls it surfaces 27% more decision-changing records per
block than today (1.67 vs 1.31), cuts noise by two-thirds (0.69 vs 2.02 per block), and puts a
decision-changing record in the block on 85 of 98 recalls against 74. It does that for about 9 s
and a fraction of a cent per recall, with no new store and no new egress. Nothing else measured
beats today's ranker. Embeddings lose on every edge, alone or fused, and the graphify memory
re-rank does nothing at all. So **no embedding engine, cognee or otherwise, earns its place for
this corpus**, and the graphify memory backend should be retired.

| question | answer | confidence |
|---|---|---|
| Retrieval | lexical top-20 shortlist + model pick of ≤5 (candidate 2, combinable with 4) | high on the ranking; medium on magnitudes: one LLM judge, 90% agreement with a human on 40 labels |
| Homes | procedure that must hold is enforced (rule file → prompt → control); a lesson is the home of a procedure only until it is promoted; what happened and what is true stay where 157 indexed them | high: measured duplication, no new store proposed |
| Delivery | split: enforced procedure is always loaded; everything else is pulled at the declared edges as a picked block | high: an always-loaded index is 8–155 k tokens and ranks below the pick |
| Disposition | below | high where measured; the edges' value per recall is not measured |

**Homes.**
- **Procedure.** The gradient lesson → rule → prompt → control is the home. A lesson that recurs
  is a failed promotion, not a lesson to rewrite. The junction rule shows why: it is already two
  code controls, yet it still occupies six lessons that recall keeps surfacing, because the legacy
  lessons predate `**Promoted to:**`.
- **Operator auto-memory** stays an opt-in source. It is per-operator and per-node, so anything a
  worker must know graduates to a rule.
- **What happened and what is true** keep their 157/05 homes. Planning documents join through
  `memory-top-level-with-corpora`.

**Delivery.** The rule file, `AGENTS.md` and the bundle prompts stay the always-loaded layer, and
stay small. Everything else is pulled, at the declared edges, as a picked block. A one-line index of
the whole store is not loadable at the edges that matter.

**Disposition.**

| piece | disposition |
|---|---|
| lexical ranker (`rankRecords`) | **keep**, as the shortlist stage (limit 20 instead of 5) |
| model pick over the shortlist | **add**, the one new piece; it ends empty when nothing applies |
| graphify memory backend + `.aof/memory-graph/` + its index file | **retire**: 0 of 200 recalls changed, and every reindex egresses the work stream; `memory.backend` returns to `local` |
| graphify for the code graph | **keep**, unchanged (176) |
| `aof.memory.index.json` | **keep** as the one index once the graphify backend goes |
| embeddings (any engine) | **do not adopt**; the Node in-process path is recorded above if a later question needs it |
| always-loaded record index | **do not adopt** |
| retire-promoted filter | **keep** the mechanism; it bites only as lessons are promoted (5 of 957 today) |
| `continue-developer`, `refine-architect`, `shatter-po` edges | **keep**, behind the pick |
| `verify-finding` edge | **keep, behind the pick**: it is 56% of all recalls and its true answer is usually "no prior occurrence" (12 of 40 sampled had one) |
| `refine-po` edge | **merge** into a text recall on the item's title. `--item` on an item not yet indexed is empty by construction (12 of 14) |
| `continue-episodic` edge | **keep**; it fires only on attempt 2+, and never has in this ledger |
| retrospective's two recalls | **keep**, and record them in the ledger like every other edge |
| recall ledger verdicts | **keep**, read as influence and not relevance (73% agreement with the judge) |
| `recurrence` | **keep** |
| the three stale citations above | **fix** in passing |

## Outcome / Next

- The follow-on is a planning PRD for `aof:shatter`, not built here. It has two moves, both inside
  today's seam:
  1. **The pick.** `recall --block` ranks a 20-record shortlist and a model picks ≤5, recorded in
     the ledger like today. `refine-po` becomes a title recall.
  2. **Retire the graphify memory backend.** `local` serves the work corpus; the graph stays for
     code alone.
- **Not measured, and the PRD should decide.** Whether the pick is a separate cheap model call (as
  measured) or the recalling agent choosing from a 20-card block it already holds. The second needs
  no extra process, and candidate 3's result suggests an agent picks well from what it reads. The
  pick's non-determinism also needs a ledger answer: record what was picked, not a re-run.
- **Effect on the memory-engine arc.** `memory-engine-port` (179) shrinks: with the graphify memory
  backend retired, only the code graph and the record backends move behind the port, so the
  work-stream graph does not. `memory-config-node` (180) loses `backends.graphify.extractionBackend`
  for the work corpus. `memory-top-level-with-corpora` (178) is unaffected: planning records are
  ranked by the same shortlist and pick.
- Recall: no memory recall was taken for this spike, as there was no edge to record it against.
  Prior art read in full: `wiki/planning/research/RESEARCH-agent-memory-procedure.md` (its §5 "no
  vector store" verdict is now measured, not argued) and 176's finding.
