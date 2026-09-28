---
type: milestone
number:
slug: memory-closes-the-loop
title: "Memory closes the loop — every recall and its verdict is accounted, a lesson that recurs is caught at the retrospective, and each lesson names where it was promoted"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
origin: wiki/planning/research/RESEARCH-agent-memory-procedure.md
depends: [memory-corpus-holds-its-vocabulary]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# Memory closes the loop

## Objective

**aof can answer the question its memory cannot answer today: did the stored lesson stop the
mistake?** Each recall at a declared edge is recorded with the records it returned and a verdict on
each one. At the retrospective, a new lesson that repeats an old one is marked as a recurrence
instead of being written as an unrelated second lesson. Each lesson names where it was promoted: a
rule, a prompt or a control. The origin calls this the single highest-value change (§7). It closes
leaks L3, L5 and L6 (§3), which leave memory a filing cabinet with provenance.

**The outcome an outsider can verify:** after a refine and a build that recall, the item's
`FEEDBACK.ndjson` holds one `recall` entry per recall. Each entry carries its query, the record ids
it returned, and a verdict per record: `honoured`, `departed` or `irrelevant`. When a
retrospective's new lesson matches a prior one, it stamps `**Recurs:** <ref>`. Every new `R<n>`
carries `**Promoted to:**`. `aof work memory status --json` reports how often each lesson was
surfaced, honoured and recurred. `aof work doctor` lists recurring lessons, and unpromoted lessons
older than an age threshold. `aof work tune` reads both signals. For a recurring lesson that names
a `prompt:` target, its prompt lane produces a computable proposal.

## Scope

In scope:

- **The recall ledger.** It is one more `kind`, `recall`, on the item's existing append-only
  `FEEDBACK.ndjson` (55/ADR-005), not a sibling store (origin §4.4, §5). Each declared edge appends
  its own entry: shatter, the refine architect and PO, and the continue developer. The agent that
  records the decision also writes the verdict. The ARCHITECTURE decides how: a verb, or an append
  the edge's prompt drives. The `## Memory recall` prose in ARCHITECTURE stays as the human reading.
- **Every `FEEDBACK.ndjson` reader moves with the new kind.** This honours near-miss m40/R3: a new
  kind obliges every consumer that partitions by kind. The ledger's parser accepts only `raw` and
  `classification` today, and the origin lists three more readers (§2.1). All of them are
  enumerated at refine and changed together.
- **The set of declared edges is settled.** `aof work memory brief` has no caller in any bundle
  prompt (origin §6, step 2). The ARCHITECTURE either wires it into a session-start edge that writes
  the ledger or retires it, and the milestone ships that choice.
- **Recurrence at the retrospective.** Before writing an `R<n>`, the retrospective recalls against
  the whole index. A prior lesson above a threshold makes the new entry carry `**Recurs:**`, which
  is indexed into tags. The threshold is calibrated on a labelled set, not guessed: the origin's 23
  self-reported recurrences and the known m45/R13 and m68/R10 pair (§2.3, §8).
- **The promotion field.** Every new `R<n>` carries
  `**Promoted to:** control:<id> | rule:<path> | prompt:<path> | none`, indexed into the lesson's
  frozen `status` field the way gaps reuse it (m39/ADR-001). The meta-line rule from
  `memory-corpus-holds-its-vocabulary` covers the two new fields; there is no second rule.
- **Forward only.** Archived retrospectives are never back-filled. Doctor reports recurrence and
  promotion as advisory on archived items (origin §7).
- **Accounting and probes.** `status --json` gives surfaced, honoured and recurred counts per record
  type, and per lesson on request. The doctor probes are advisory.
- **tune gets its two missing inputs.** The ledger shows which lessons keep being surfaced and
  departed from. The recurrence stamps show which lessons recur. A lesson with a `prompt:` target
  lifts the `prompt-or-brief-revision` lane out of `replacement-prose-not-computable`. This is not a
  second analysis pass (origin §7).

Out of scope:

- The retry and triage recall edges and the episodic records. `episodic-memory-is-recallable` owns
  them, and its new edges write this ledger.
- Applying a tune proposal automatically. Proposals stay proposals.
- Per-turn injection. A recall stays a tool call at a declared edge (origin §5).

## Stories

To be broken down (`aof:refine`, once promoted).

## Dependencies

`memory-corpus-holds-its-vocabulary`, for four reasons:

- The recurrence recall filters by `--kind`, so it reaches only the lessons the vocabulary hold
  makes reachable.
- `**Recurs:**` is indexed into the tags that milestone adds.
- The two new meta fields extend that milestone's validate rule rather than adding a second one.
- The whole-index dedup covers story-level lessons only once that milestone indexes them.
