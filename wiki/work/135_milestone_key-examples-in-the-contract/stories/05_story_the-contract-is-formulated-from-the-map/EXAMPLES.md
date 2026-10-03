---
doc: examples
---
# 135/05 · The contract is formulated from the map — example map
<!--
Drafted at refine's discovery beat, 2026-10-03. Struck before asking, because the record answers
them: whether proposed examples become headlines too (SPEC: the map's key examples become the
headline Scenarios, without distinguishing provenance), and what happens to a story without a map
(SPEC out of scope: unchanged).
-->

## R1 · Each map rule becomes a Rule: block, and each key example a headline scenario under it
- E1 · A map with R1 (examples E1, E2) and R2 (E3) → "Rule: R1 · …" holding "E1 · …" and "E2 · …", then "Rule: R2 · …" holding "E3 · …" [proposed]
- E2 · A key example also covered by QA's table → it stays the headline, and the table keeps only the edge rows [proposed]

## R2 · QA's matrix sits under the rule it tests
- E3 · An outline for R1's boundaries → written inside "Rule: R1 · …"; a row that restates E2 carries E2 in its example column [proposed]

## R3 · Without an applicable map, formulation reads as today
- E4 · Gate off, or the map says "Not applicable" → no Rule: blocks are asked for and no ids are written [proposed]

## Questions
- Q1 · technical · defaulted ADR-002 · What does a project whose test runner cannot read Rule: do? (one feature per rule, titled with the rule id)
