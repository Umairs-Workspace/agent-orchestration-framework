---
type: milestone
number:
slug: memory-recall-pick
title: "Recall hands an agent what applies — the lexical ranker shortlists 20, a model picks at most 5, and the block ends empty when nothing applies"
status: not-started
owner: product-owner
created: 2026-10-28
updated: 2026-10-28
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-memory-engine.md
depends: [177]
---
# Recall hands an agent what applies

## Objective

A recall block stops being five keyword matches, two of which on average are noise. `recall
--block` ranks a 20-record shortlist with today's lexical ranker, and a model picks at most 5 from it
that bear on the query. When nothing applies the block is empty rather than padded. 177 measured this
shape on 127 judged recalls: 1.67 decision-changing records per block against 1.31, noise 0.69
against 2.02, and a decision-changing record in the block on 85 of 98 recalls against 74. An
outsider can verify it by replaying the recorded recalls against the shipped block and seeing the
same improvement in direction. They can also read the recall ledger and find, for every recall, the
records that were picked.

## Scope

In scope:

- The shortlist and the pick behind `recall --block`. `rankRecords` stays the ranker, at limit 20
  instead of 5, and a pick chooses ≤5 from its output. Scope stays a hard pre-filter applied before
  ranking, and every record keeps its resolving `path:line` (05/ADR-005, 006).
- The ledger records what was picked, not a re-run. The pick is not deterministic (two runs of one
  prompt returned 2 and 3 records), so the recorded set is the only reproducible answer.
- The pick fails soft. If the model is unavailable or does not answer in time, the block is today's
  lexical top 5, and the degrade is reported the way `graphify-missing` is today.
- `refine-po` becomes a text recall on the item's title. `--item <ref>` on an item not yet indexed
  is empty by construction, which was 12 of 14 recorded `refine-po` recalls.
- The retrospective's two recalls are recorded in the ledger like every other edge.
- The retire-promoted filter keeps working ahead of the pick (lessons with a `**Promoted to:**`
  control are dropped before the shortlist).
- Decided at refine, not here: whether the pick is a separate cheap model call (as 177 measured,
  p50 8.9 s) or the recalling agent choosing from a 20-card block it already holds (not measured,
  needs no extra process). The architect records the choice as an ADR with its evidence.

Out of scope:

- Embeddings, an always-loaded record index, or any new store. 177 measured all three and none beat
  the lexical ranker.
- Retiring the graphify memory backend. That is `retire-graphify-memory-backend`, which this
  milestone does not wait on: the pick reads the lexical ranker's output, which is the same under
  either backend.
- The recurrence score, and ranking the planning corpus. Planning records are ranked by this same
  path once `memory-top-level-with-corpora` indexes them.

Recall applied (shatter-po, id `0f3b1f6e-5d0a-4c2b-9a8e-6b7d1c2e4a91`, owned here): 05/ADR-003's
backend contract is honoured. The pick sits on the face, over a backend's `recall` result, and no
backend method changes. 05/ADR-001's derived index is honoured unchanged.

## Stories

To be broken down after promotion; no stories or task contracts are authored in this shatter.

## Dependencies

- `memory-retrieval-precision` (177, done) — the measured design this milestone delivers: the
  candidate table, per-edge results, cost and non-determinism in its `## Investigation` and
  `REPLAY.md`.
