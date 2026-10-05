---
type: milestone
number:
slug: operator-auto-memory-source
title: "The operator's auto-memory is an opt-in memory source — its feedback and project entries are recallable on the node that holds them"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
origin: wiki/planning/research/RESEARCH-agent-memory-procedure.md
depends: [148]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# The operator's auto-memory is an opt-in memory source

## Objective

**The operator's Claude Code auto-memory holds procedure in a shape that a lesson lacks. Every
`feedback` entry carries a why and a how-to-apply, and aof recall sees none of it.** The two stores
overlap, and neither knows the other exists (origin §2.3, §4.3). This milestone adds a read-only
source adapter behind config, off by default. It indexes those entries as lesson records owned by the
operator, on the node that has them. It adds no store, because the file stays the source.

**The outcome an outsider can verify:** with `memory.sources: ["claude-auto-memory"]` set, ingest
indexes the node's auto-memory `feedback` and `project` entries as `lesson` records, with
`owner: operator` and `source: <abs path>:1`. A recall surfaces them beside the repo's lessons, so a
known duplicate shows up side by side. The measured example is the junction lesson: auto-memory,
m45/R13, m68/R10 and 72/ADR-007. With the key absent, the index is exactly what it is today.

## Scope

In scope:

- **The adapter and its config key**, off by default (origin §4.3, option b). The entry grammar is
  measured at refine. Current entries nest `type` under `metadata:`, not at the top level as the
  origin describes.
- **Mapping onto the held vocabulary** that `memory-corpus-holds-its-vocabulary` defines, so adapter
  records carry an enum `kind` and a layer. The `R<n>` validate rule does not apply, because an
  auto-memory entry is not an `R<n>`.
- **Nothing leaves the node.** The index stays git-ignored and never rides the mesh
  (`acd-memory-index-never-on-mesh`). An absolute `source` path outside the repo is acceptable only
  because of that.
- **The adapter is documented** in `wiki/memory.md`.

Out of scope:

- Writing to the auto-memory, or merging and deduplicating the two stores. The adapter is read-only
  (origin §4.3).
- Reaching worker nodes. A worker never sees the operator's auto-memory, so anything a worker must
  know still has to graduate to a rule or a control (origin §4.3).
- `user` and `reference` entries. Only `feedback` and `project` entries are indexed.

## Stories

To be broken down (`aof:refine`, once promoted).

## Dependencies

`memory-corpus-holds-its-vocabulary`. The origin places the adapter "after the corpus fixes" (§4.3).
If the adapter's lessons joined a corpus with no vocabulary hold, they would only add to the
blank-kind count that milestone clears. Nothing else waits on this milestone: it is opt-in, placed
last, and gates no other driver.
