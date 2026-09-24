---
type: milestone
number: 135
slug: key-examples-in-the-contract
title: "Key examples in the contract — the map's rules become Rule: blocks, its agreed examples become headline scenarios, and none can silently fall out"
status: not-started
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
origin: wiki/planning/research/RESEARCH-specification-by-example.md
depends: [134]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 135 · Key examples in the contract — the map's rules become Rule: blocks, its agreed examples become headline scenarios, and none can silently fall out

## Objective

**What a person agreed in discovery reaches the executable contract and stays there.** 134 produces
an example map with provenance. This milestone makes formulation keep faith with it. Each business
rule becomes a named `Rule:` block. Its key examples become the headline Scenarios under that block.
QA's Examples tables stay underneath as the test matrix. A lint ties every `stated` or `confirmed`
example to a scenario or an Examples row. Today 0 of 1,163 task features use `Rule:`, and a rule
lives in a scenario title or nowhere (origin research, §2).

**The outcome an outsider can verify:** a story refined with a map has task features whose `Rule:`
blocks name the map's rules, and whose headline scenarios are the key examples. Deleting the
scenario that carries a `confirmed` example turns the traceability lint red and names the example.
A `proposed` example is not required to survive. A story with no map, and every delivered feature,
lints exactly as today.

## Scope

In scope:

- **`Rule:` as a first-class header.** `src/feature-parse.mjs` tolerates `Rule:` today (it returns
  to description state, ADR-005 of its milestone). Here the parser, the traceability and litmus
  readers, and the board's feature view learn it as a grouping that owns its scenarios. A feature
  per rule (research §7 Q4) is the alternative the ARCHITECTURE weighs against it.
- **Runner binding verified at refine, not assumed.** Near-miss R4 (m11): check a wrapped tool
  against its real behaviour at refine. So refine confirms, by running them, that the BDD runners
  governed projects use (aof's own step binding, vitest-cucumber and the rest in the tree) bind
  scenarios under `Rule:`. A runner that does not is a finding with a named fallback, never a
  surprise at build.
- **Key examples versus the matrix.** `acceptance-criteria.md` gains the level above its three zoom
  levels: the map's key examples are the headline, and the matrix covers the edges. Where a map row
  and a table row say the same thing, the map row is the headline and the table keeps only the edges.
- **The traceability extension.** Every `stated` or `confirmed` example resolves to a scenario or an
  Examples row, and a miss is a doctor/validate finding. It lives in the existing traceability lint
  as one more reader, not as a sibling lint.
- **The Contract stage formulates from the map.** The refine prompt's Three Amigos pass reads the map
  first. The PO writes the headline scenarios under `Rule:` blocks from the key examples, and QA
  writes the tables beneath them.

Out of scope:

- **Rewriting delivered features.** Delivered acceptance criteria are immutable. `Rule:` applies to
  contracts authored after this milestone lands, and nothing is back-filled.
- **The map itself, and its provenance anchor**, which are **134**'s.
- **A `Rule:` requirement for stories without a map.** With `work.examples.enabled` off, or a map
  declared not applicable, formulation is unchanged.

## Stories

To be broken down at refine.

## Dependencies

**134** provides the example map, its rules and the per-example provenance this milestone formulates
from and lints against. Without a map there is nothing to group by rule and no agreed example to
trace.
