---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 58 · Supervising loops — State

## Progress

<!-- COMPACTED AT ACCEPT (2026-08-29). The blow-by-blow is archived: its durable decisions live in
     `ARCHITECTURE.md`'s seven ADRs, its delivered state in `OUTCOME.md`, its evidence and findings in
     `VERIFICATION.md`, and its lessons in `RETROSPECTIVE.md`. The `## Feedback (for retro)` section is
     archived as part of the same compaction — every entry has graduated into `RETROSPECTIVE.md` R4, R6
     and R7, exactly as durable decisions graduate into ADRs. What remains here is the roll-up. -->

| story | status | delivered |
|---|---|---|
| 58/00 the supervision vocabulary | **done** | the fifth kind, the layer axis, and the closing registry fixture |
| 58/01 the reference hierarchy and the arbiter | **done** | seven ownership edges, seven layers, one anchor, one arbiter — shipped and installed |
| 58/02 layer separation and the gate | **done** | the timescale check decides, arbitration clears only on an arbiter, eight codes gate |
| 58/03 the supervision face | **done** | `show` names layer and reference-setter; five kinds, five glyphs |

**Milestone accepted 2026-08-29.** `aof:validate 58` PASS; `aof work doctor 58` reports no
`control-unresolved` at either severity; ten declared controls, ten recorded red probes; the full suite
green (7,048 unit / 131 integration / 85 cargo). `aof work loops validate` over the installed registry:
**0 errors, 32 warnings** — the accept criterion recorded at refine, reached by the measured path
39 → 36 → 32.

## Notes & decisions in flight

<!-- Emptied at accept. Nothing is in flight; the milestone is closed. Two items were carried OUT of
     this milestone deliberately rather than resolved in it, and both are recorded where the next
     reader will meet them rather than here: -->

- **The dead-band the SPEC scoped was refused**, with the three prerequisites named and milestone 62
  identified as its home — `ARCHITECTURE.md` ADR-004 §5, and `OUTCOME.md`'s first gap. A departure from
  stated scope, recorded as one.
- **`priority`'s entry grammar has no driving coverage**, and QA's replacement Examples table is
  authored and measured against the live loader. It belongs to the item that next refines
  `58/00 tasks/01` — `RETROSPECTIVE.md` R7 carries the table and the reasoning.

## Verification

- [x] `@executable` suite green — 258 tests across every lane the milestone touches; full suite green at the gate
- [x] Fitness functions green — ten declared, ten armed, ten red probes recorded in `VERIFICATION.md`
- [x] `@manual` verified — 58/01 `tasks/01`, 8 scenarios, executed at the gate; two failures repaired and re-verified
- [x] No `@uat` lane — this milestone declares none across its seventeen features, so no human sign-off applies
