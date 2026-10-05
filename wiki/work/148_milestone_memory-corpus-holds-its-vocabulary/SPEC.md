---
type: milestone
number: 148
slug: memory-corpus-holds-its-vocabulary
title: "The memory corpus holds its vocabulary — every lesson is reachable by its kind, the corpus reports its own conformance, and its ranking cannot regress silently"
status: in-progress
owner: product-owner
created: 2026-09-27
updated: 2026-10-04
origin: wiki/planning/research/RESEARCH-agent-memory-procedure.md
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 148 · The memory corpus holds its vocabulary

## Objective

**A lesson's meta line is held to the vocabulary the retrospective prescribes, and what was written
before the hold is normalised on read, so every lesson is reachable by the filter it belongs to.**
Today a fifth of the lessons carry a blank `Kind`, and the recall edges filter by kind, so those
lessons are never surfaced. `Area`, `Stage` and gap `status` sprawl the same way, and nothing in
`validate` or `doctor` checks any of them (origin §3, L1 and L7). This is the semantic layer's one
gap, and the origin names it the cheapest first change (§7).

**The outcome an outsider can verify:** on the live corpus, every lesson whose source states a kind
is indexed with an enum `kind`. A parenthetical variant such as `near-miss (recurring)` is indexed
as `kind: near-miss` and keeps its parenthetical as a tag. A lesson that states no kind is counted,
never guessed. A live item's `R<n>` with a non-enum meta line reds `validate`.
`aof work memory status` reports the blank and non-enum counts and names the layer (episodic,
semantic or procedural) that each record type serves. A fixed retrieval eval is green as an arch
test.

## Scope

In scope:

- **The normaliser.** It lives in the one retrospective parser and reaches both backends behind the
  seam, including graphify, which is the live one. `Kind`, `Stage` and `Area` become the enum token
  the value starts with, and a trailing parenthetical becomes a tag. Gap `status` becomes
  `open | discharged | open-by-decision`, and its date and cause move to tags. The ARCHITECTURE
  decides whether `tags` is a new `MemoryRecord` field under an `INDEX_VERSION` bump (the origin
  proposes this at §4) or rides a frozen field. m39/ADR-001 is the precedent for reuse without a
  bump.
- **Measured on the live corpus, not fixtures.** This honours near-miss m05/R4: a green suite over a
  well-formed corpus does not prove the parser is robust. The before and after distributions of
  Kind, Stage, Area and gap status are counted over the real index. Before the normaliser is
  designed, the blank-Kind lessons are sorted by cause: a kind that was stated but not parsed, or
  one that was never stated.
- **Story retrospectives are indexed.** The indexer reads `RETROSPECTIVE.md` for milestones only
  (finding 128/F-128-G). Measured 2026-09-27, 0 of 475 lesson records come from a story folder. A
  vocabulary hold on lessons that no index can reach holds nothing. The recurrence check in
  `memory-closes-the-loop` also needs the whole corpus.
- **The validate rule.** An `R<n>` meta line carries the four fields with enum values. A violation
  is an error on a live item and advisory on an archived one. Archived retrospectives are never
  back-filled (origin §7).
- **Status shows conformance and names the layers.** It reports blank and non-enum counts per field,
  so the ratchet is visible, and each record type's layer (origin §5). The layer map is the one
  place that partitions record types, and the episodic types from `episodic-memory-is-recallable`
  extend it rather than adding a second. This honours near-miss m40/R3: a new record kind obliges
  every consumer that partitions by kind, and last time `memory status` was the one left behind.
- **The `--block` line shows a record's tags** (origin §4.2).
- **The retrieval eval.** About twenty `(query → expected record id)` pairs drawn from real decisions,
  kept green as an arch test (origin §4.4). It lands first because the milestones after this one add
  records to the ranked pool, and the graph re-rank term is still stubbed (10/01). A ranking change
  then shows as a red eval, not as a quieter recall.

Out of scope:

- The recall ledger, recurrence and promotion. `memory-closes-the-loop` owns them.
- New record types. `episodic-memory-is-recallable` owns them.
- Retrieval changes (L9). The origin rules them out because retrieval is not the bottleneck (§3,
  §5). The eval guards ranking; it does not change it.
- Back-filling archived meta lines. Archived items are advisory only.

## Stories

Partitioned by write set (ARCHITECTURE ADR-008). Wave 1 is 01 and 02; wave 2 is 03, 04 and 05.

- [ ] `01_story_the-ranking-is-held-by-an-eval`: twenty or more real recall pairs stay in the
  five-line block over the live corpus, as an arch test.
- [ ] `02_story_a-lessons-meta-line-is-normalised-on-read`: one vocabulary module, the normaliser
  in the one parser, and a `tags` field under index version 2, with a stale store reported.
- [ ] `03_story_story-retrospectives-are-indexed`: every item's `RETROSPECTIVE.md` is read, so a
  story's lessons are recallable under its ref. Depends on 01 and 02.
- [ ] `04_story_a-live-lessons-meta-line-is-held`: validate errors on a live lesson with a non-enum
  meta line, doctor warns on an archived one, and the live stream is green. Depends on 02.
- [ ] `05_story_memory-status-reports-conformance-and-layers`: `status` names every record type's
  layer and reports blank and non-enum counts on both backends, and the `--block` line shows tags.
  Depends on 02.

## Dependencies

None in the stream. The seam, both backends and the retrospective parser already exist (05, 10,
39).
