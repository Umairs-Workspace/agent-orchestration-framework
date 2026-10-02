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
  ADR-007, FF-13401 to FF-13404), five stories.
- [x] Story contracts 2026-09-24 (orchestrated): 01 one `@manual @docs` task; 02 three, 03 three
  plus one operator-gated `@manual`, 04 four, 05 five `@executable` tasks, each with a `PLAN.md`.
- [x] Stories built and reviewed 2026-09-24 to 2026-10-02. 03 and 04 were rebuilt against 142's
  Yarn-workspace layout, and 03's `@manual` anchor probe was run by the operator twice
  (2026-09-24, and leg B through "Other" on 2026-10-02).
- [x] Verified and accepted 2026-10-02 (`aof:verify 134`): see VERIFICATION.md. The live run took
  the promoted backlog story 144 through discovery with the operator. F-134-01 (the beat asked
  questions the record already answered) was fixed in the item (`5c0685e6`). Lessons are in
  RETROSPECTIVE.md and each story's RETROSPECTIVE.md, and the delivered state is in OUTCOME.md.

## Notes & decisions in flight

- **Framed 2026-09-23** by `aof:shatter` from
  `wiki/planning/research/RESEARCH-specification-by-example.md`, the first of three drivers
  (134 discovery → 135 formulation → 136 loop-driven questions).
- **Graduated to ADRs:** the map is a sibling `EXAMPLES.md` (ADR-001); `ruled` is rejected, because
  an ADR is agent-written (ADR-001 §3); the giver is the channel, not a named person (ADR-003).
- **This repository runs discovery:** `work.examples.enabled` is `true` since 2026-10-02.
- **Carried forward:** 144 holds one open business question (Q4, whether speeding up the slowest
  test files is in scope) for its own refine. F-134-02 and F-134-06 go to 136, and F-134-03 and
  F-134-05 are stories for the operator (VERIFICATION `## Findings`).

## Verification

- [x] `@executable` suite green
- [x] Fitness functions green
- [x] `@manual` signed off: one real story through discovery, interactive (144)
