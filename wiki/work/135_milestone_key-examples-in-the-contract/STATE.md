---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 135 · Key examples in the contract — State

## Progress

- [ ] to be broken down at refine

## Notes & decisions in flight

- **Framed 2026-09-23** by `aof:shatter` from
  `wiki/planning/research/RESEARCH-specification-by-example.md`, the second of three drivers.
- **No spike for the runner check.** Whether the governed projects' BDD runners bind `Rule:` is a
  refine-time measurement inside this milestone's own scope (researcher + developer feasibility), not
  a top-level unknown.
- **What the ARCHITECTURE must settle:** (1) `Rule:` blocks versus a feature per rule; (2) how the
  traceability reader matches an example to a scenario or an Examples row, whether by id or by value;
  (3) the fallback for a runner that does not bind `Rule:`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off: one mapped story formulated and linted end to end
