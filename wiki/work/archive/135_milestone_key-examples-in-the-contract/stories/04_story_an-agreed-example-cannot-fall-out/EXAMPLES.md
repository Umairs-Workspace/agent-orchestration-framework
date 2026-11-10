---
doc: examples
---
# 135/04 · An agreed example cannot fall out — example map
<!--
Drafted at refine's discovery beat, 2026-10-03. Struck before asking, because the record answers
them: whether a proposed example must survive (SPEC: it need not); whether contracts written before
135 are held to the trace, 144 included (SPEC out of scope: Rule: applies to contracts authored
after this lands, and nothing is back-filled); and how an example is matched (ADR-004 §1, by id).
-->

## R1 · An example a person agreed appears in the contract, under its own rule
- E1 · Confirmed E2 of rule R1 is the scenario "E2 · a sixth loan is refused" under "Rule: R1 · …" → no finding [proposed]
- E2 · That scenario is deleted → the doctor goes red and names E2, its rule R1 and the story [proposed]
- E3 · Stated E3 of R1 appears only as an Examples row whose example cell is E3, under R1 → no finding [proposed]
- E4 · E2 appears, but under "Rule: R2 · …" → red, and the message says it was found under R2 [proposed]
- E8 · E2's scenario is deleted and "aof work continue" is run on the story → the build is refused until E2 is restored [stated Q1]

## R2 · An example only the agent proposed may be left out
- E5 · Proposed E1 appears nowhere in the contract → no finding [proposed]

## R3 · A contract not formulated from the map is held to nothing new
- E6 · The story's tasks name no rule id (written before 135, like 144's) → no trace finding [proposed]
- E7 · The story is at discovery and has no tasks yet → no trace finding, so the contract can still be written [proposed]

## Questions
- Q1 · business · answered · If an example you agreed to has gone missing from a story's contract, is its build refused until it is restored, or only reported? (refused, 2026-10-03)
- Q2 · technical · defaulted ADR-004 · Is a scenario that names an example id missing from the map reported? (no: only agreed examples are traced)
