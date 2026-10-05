---
type: milestone
number:
slug: the-memory-wiki-stays-true
title: "The compiled wiki stays true — every source path a wiki page cites resolves, and wiki/memory.md describes the memory procedure as delivered"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
origin: wiki/planning/research/RESEARCH-agent-memory-procedure.md
depends: [148, memory-closes-the-loop, episodic-memory-is-recallable]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# The compiled wiki stays true

## Objective

**The wiki pages are the human compilation of what aof remembers, and they drift.**
`wiki/memory.md` cites a module that has moved and calls delivered hooks "not yet built". It also
reports a record count and a backend that the live store has since left behind (origin §2.2, L8).
Nothing checks a wiki page's citations. This milestone makes a stale source path in any wiki page a
doctor finding. It then rewrites `wiki/memory.md` to describe the procedure the earlier memory
milestones deliver.

**The outcome an outsider can verify:** `aof work doctor` flags any `wiki/*.md` page that cites a
`src/` path that does not resolve. It checks through the one resolver, `cited-path-resolve.mjs`
(119/ADR-004). Every wiki page passes the probe. `wiki/memory.md` describes, as built: the three
layers, the declared recall edges, the ledger, recurrence and promotion, and the record types.

## Scope

In scope:

- **The citation probe** over every `wiki/*.md` page, not only `memory.md`. Any page it flags is
  fixed in this milestone, so the probe lands green.
- **The rewrite of `wiki/memory.md`**, against the delivered procedure.

Out of scope:

- **Indexing wiki pages as memory records.** The origin rules this out (§4.2, §7). The pages compile
  records that are already indexed, and the derived-index rule (05/ADR-001) refuses a second copy.
- Prose rewrites of other wiki pages. Their stale citations are fixed; their content is not
  reworked.
- The auto-memory adapter's part of the page. `operator-auto-memory-source` documents itself when it
  lands.

## Stories

To be broken down (`aof:refine`, once promoted).

## Dependencies

`memory-corpus-holds-its-vocabulary`, `memory-closes-the-loop` and `episodic-memory-is-recallable`.
The rewrite describes what those three deliver. If it were written earlier, the page would drift
again as each one landed. The probe does not need them on its own. It ships with the rewrite so that
the page lands true and stays checked.
