---
type: milestone
number: 201
slug: memory-recall-pick
title: "Recall hands an agent what applies — the lexical ranker shortlists 20, a model picks at most 5, and the block ends empty when nothing applies"
status: in-progress
owner: product-owner
created: 2026-10-28
updated: 2026-11-17
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-memory-engine.md
depends: [177]
---
# 201 · Recall hands an agent what applies

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
  - Corrected at refine, 2026-11-17: no recall path filters on a lesson's promotion today. 153
    indexes the field and 177 measured the filter in throwaway code. This milestone builds it, for
    a lesson promoted to a control, a rule or a prompt (ADR-005).
- Decided at refine, not here: whether the pick is a separate cheap model call (as 177 measured,
  p50 8.9 s) or the recalling agent choosing from a 20-card block it already holds (not measured,
  needs no extra process). The architect records the choice as an ADR with its evidence.
  - Decided 2026-11-17: a separate model call, made by the recall command (ADR-001).

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

- [ ] `00_story_recall-hands-over-a-picked-block` — `recall --block` shortlists 20 with promoted lessons dropped, hands them to a picker, and prints at most 5 or nothing; when the picker cannot answer, the block is the lexical top 5 and stderr says so
- [ ] `01_story_the-pick-is-a-model-call-a-project-can-see-and-set` — the picker is one lean `claude` call at haiku, run outside the project; `memory.recall.pick` turns it off or changes its model and time limit, and `aof memory status` and `aof project show` say what it is
- [ ] `02_story_every-recall-leaves-a-record-and-the-po-asks-by-title` — the PO's refine recall asks by the item's title, and the retrospective records both of its recalls, in every runtime's rendered command
- [ ] `03_story_the-recorded-recalls-replay-against-the-shipped-block` — a script replays the recorded recalls against the lexical block and the shipped one, so an outsider can see the direction 177 measured

Refine recall (refine-po, ids `3cb2d413-fcfc-4afa-afec-8b4bde519c1c` and
`d51f97fd-e46f-4c27-8a9c-e184a1041509`): the item-scoped recall was empty, and the same words with
no item filter returned five records. Two shaped the break-down (ARCHITECTURE "Memory recall").

## Dependencies

- `memory-retrieval-precision` (177, done) — the measured design this milestone delivers: the
  candidate table, per-edge results, cost and non-determinism in its `## Investigation` and
  `REPLAY.md`.
