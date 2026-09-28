---
type: milestone
number:
slug: episodic-memory-is-recallable
title: "Episodic memory is recallable — findings, feedback and terminal runs become records, and a retry and a triage recall what happened before"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
origin: wiki/planning/research/RESEARCH-agent-memory-procedure.md
depends: [memory-corpus-holds-its-vocabulary, memory-closes-the-loop]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# Episodic memory is recallable

## Objective

**What happened on an item can be recalled through the memory seam, not only written down.** Every
run writes run records, raw feedback and verification findings, and none of them is a memory record
(origin §2.1, L4). A developer on attempt 2 cannot ask what happened on attempt 1. A verifier
triaging a finding cannot tell whether the stream has seen it before. The retrospective reads these
sources once, as raw files. This milestone indexes them and adds nothing new to write.

**The outcome an outsider can verify:** after ingest, `recall --item <ref>` returns the item's
findings, raw feedback entries and terminal runs. Findings come from both grammars, `F-NN` headings
and `| F-NN` rows. Each record resolves to its source; for a JSON source that is a path plus a
pointer (05/ADR-005). A continue on attempt 2 or later recalls the item's episodic records and
acknowledges the prior attempt's `failureReason` and findings before it builds. At finding triage,
verify recalls prior findings across the stream to catch duplicates. The retrospective gathers its
evidence through recall.

## Scope

In scope:

- **Three record types:** `finding`, `feedback`, and `run` (terminal runs only), in both backends.
  The record shape follows origin §4.1: area `delivery`, stage from the loop phase, status from the
  outcome. A `run` folds in its stalls from the matching observability agent. Findings use the `F`
  form already registered in `ID_FORMS`. The indexer imports only document-scope forms, a decision
  that is right for lessons; it is revisited for findings. The ARCHITECTURE decides whether the
  types need an `INDEX_VERSION` bump or fit the frozen shape, as m39's capability and gap types did
  (m39/ADR-001).
- **Every consumer that partitions by record type.** This honours near-miss m40/R3. The consumers
  include the layer map in `memory status` (from `memory-corpus-holds-its-vocabulary`), the block
  renderer, the scope filters and tune's corpus. They are enumerated at refine and changed together.
- **Two recall edges.** Continue recalls on attempt 2 or later. Verify recalls at finding triage with
  `--kind finding`. Both write the recall ledger from `memory-closes-the-loop`.
- **The retrospective reads its evidence through recall** (origin §4.1, Close), so the compile step
  also proves the records can be recalled.
- **Ranking holds.** The retrieval eval from `memory-corpus-holds-its-vocabulary` stays green with
  the new types in the pool. A red eval is fixed in the ranking, never by editing the expected
  pairs.

Out of scope:

- Session transcripts under `~/.claude/projects/`. They sit outside the repo on each node, and
  `aof work observe` already reads them.
- Observability snapshots as records of their own. A run's stalls ride on its `run` record.
- STATE `## Feedback (for retro)`. It is a projection of `FEEDBACK.ndjson`, so indexing the ledger
  covers it.
- In-flight runs. Only terminal runs have an outcome to recall.

## Stories

To be broken down (`aof:refine`, once promoted).

## Dependencies

- **`memory-corpus-holds-its-vocabulary`** provides the layer map and tags these types extend. It
  also provides the retrieval eval, which must be green before the ranked pool grows. Any change
  here to the index shape comes after that milestone's.
- **`memory-closes-the-loop`** provides the recall ledger that the two new edges write. Both
  milestones also change the retrospective prompt: that one adds the recurrence recall, and this one
  adds evidence gathered through recall. Sequencing them avoids two concurrent rewrites of one
  prompt.
