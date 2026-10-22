---
type: spike
number:
slug: memory-retrieval-precision
title: "What aof memory should be as one system — one home per kind of knowledge, one read path that earns its place"
status: not-started
owner: architect
created: 2026-10-20
updated: 2026-10-20
depends: []
timebox: 3d
schema: 1
aofVersion: 0.1.0
---
# What aof memory should be as one system

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

## Finding

## Outcome / Next
