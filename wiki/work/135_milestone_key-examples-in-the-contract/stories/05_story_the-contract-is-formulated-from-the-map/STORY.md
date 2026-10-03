---
type: story
number: 05
slug: the-contract-is-formulated-from-the-map
title: "The contract is formulated from the map — the PO writes a Rule: per map rule and a headline scenario per key example, QA's tables sit beneath, and the guide names the level above the matrix"
parent: 135
depends: [01]
status: in-review
owner: product-owner
created: 2026-10-03
updated: 2026-10-03
adrs: [ADR-002, ADR-006]
reads:
  - wiki/work/135_milestone_key-examples-in-the-contract/SPEC.md
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-002
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-004
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-006
  - packages/core/assets/templates/story/EXAMPLES.md
  - packages/specification-by-example/src/map.mjs
files:
  - packages/core/assets/commands/refine.md
  - packages/core/assets/agents/aof-product-owner.md
  - packages/core/assets/agents/aof-qa.md
  - packages/core/assets/manifest.json
  - wiki/acceptance-criteria.md
  - test/examples/refine-discovery-beat.test.mjs
  - .claude/commands/aof/refine.md
  - .codex/skills/aof-refine/SKILL.md
  - .opencode/commands/aof/refine.md
  - .claude/agents/aof-product-owner.md
  - .codex/agents/aof-product-owner.md
  - .opencode/agents/aof-product-owner.md
  - .claude/agents/aof-qa.md
  - .codex/agents/aof-qa.md
  - .opencode/agents/aof-qa.md
schema: 1
aofVersion: 0.1.0
---
# 05 · The contract is formulated from the map

## User story

As **the operator reviewing a story's contract**,
I want **the Contract stage to formulate from the example map: one `Rule:` per map rule, the key
examples as the headline scenarios under it, and QA's tables beneath as the matrix for the edges**,
so that **the contract I review has the shape of the conversation I took part in, and every example
I agreed is a scenario I can find by its id rather than a row lost in a table**.

What lands (ADR-006): the Formulation paragraph of `refine.md`'s story Contract, the PO's and QA's
halves in their briefs, and the level above the three zoom levels in `wiki/acceptance-criteria.md`.
It applies only when the gate is on and the map is applicable. Otherwise formulation reads as today.
The fallback for a runner that does not bind `Rule:` (one feature per rule) is named (ADR-002 §3).

## Tasks

- [x] 00 [refine formulates from the map](tasks/00_refine-formulates-from-the-map.feature)
- [x] 01 [the briefs and the guide carry the level above the matrix](tasks/01_the-briefs-and-the-guide-carry-the-level-above-the-matrix.feature)

## Notes

- Depends on 01 only because the discovery-beat suite this story extends has its import repointed
  there.
- The prose must name the id forms ADR-004 traces (`R<n> · ` on a rule, `E<n> · ` on a scenario, an
  `example` column) without restating the map's grammar. The template remains its one teacher.
