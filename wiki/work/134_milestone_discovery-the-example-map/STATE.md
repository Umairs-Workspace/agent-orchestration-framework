---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 134 · Discovery before formulation — State

## Progress

- [x] Refined 2026-09-23 (solo): RESEARCH.md (the anchor measured), ARCHITECTURE.md (ADR-001 to
  ADR-007, FF-13401 to FF-13404 pending, one diagram for ADR-003), five stories broken down.
- [ ] Story contracts: each story's `tasks/` at its own refine.

## Notes & decisions in flight

- **Framed 2026-09-23** by `aof:shatter` from
  `wiki/planning/research/RESEARCH-specification-by-example.md`, the first of three drivers
  (134 discovery → 135 formulation → 136 loop-driven questions). The operator chose the three-way cut.
- **No spike.** The one unknown that could gate this milestone is whether a person's answer can be
  anchored to a record the agent did not write. It is settled inside this milestone's own refine
  (researcher + ADR), not as a top-level driver.
- **What the ARCHITECTURE must settle, in order:** (1) where the map lives and its budget; (2) the
  provenance anchor (which harness-written record, and how it is read and checked); (3) who
  classifies business versus technical; (4) the doctor finding ids and severities; (5) the config
  key's shape and its off-path guarantee.
- **The anchor is real, and so is a trap next to it** (RESEARCH R1 to R5). The harness writes
  `toolUseResult.answers` keyed by the question (46 answered and 8 refused of 54 calls, 0 from a
  subagent). But the settle seam passes the repository root as the transcript directory, so a
  hand-run `run-complete` has never stamped spend. Story 03 fixes the seam for both, and owes a
  measured check at the source (near-miss R6).
- **The giver is the channel, not a named person.** The record says "the person at session X's
  harness". ADR-003 claims no more than that.
- **Doctor at refine close:** `verification-register-missing` (error) and four `control-unresolved`
  (warn, `pending`) until the stories land FF-13401 to FF-13404 and record their red probes in a
  VERIFICATION.md. This is expected; validate passes.
- **`ruled` rejected** (ADR-001 §3): an ADR is agent-written, so a business rule decided by one
  is the smuggled default this milestone exists to stop.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off: one real story through discovery, interactive
