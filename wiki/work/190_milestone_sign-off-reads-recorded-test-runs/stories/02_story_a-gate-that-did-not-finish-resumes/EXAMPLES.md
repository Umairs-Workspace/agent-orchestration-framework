---
doc: examples
---
# 190/02 · A regression gate that did not finish resumes where it stopped, and every finished gate run is a test record — example map
<!--
Drafted at refine's discovery beat, 2026-11-09. No business question is left open. Struck because
the record answers them: whether a resumed run may stand at the accept door (SPEC Scope, fifth
bullet: "A `not-finished` row re-runs only its unfinished units", which the operator accepted on
2026-11-09); whether a UAT sweep may reuse a gate run (the same bullet: "A UAT regression sweep
reuses gate rows whose commit is unchanged"); whether the gate itself may be answered from a record
(96/ADR-008, the gate is the door's evidence and always runs).
-->

## R1 · A gate that did not finish resumes on the same content
- E1 · The newest row of 190's REGRESSION.md is `not-finished`: 212 of 230 units finished, 3 were killed and 15 never started. `--resume` on the same clean content runs those 18 units and appends one row [proposed]
- E2 · Of the 18 resumed units, one fails alone-retry: the appended row is `red` and names that unit's failing cases [proposed]
- E3 · A commit landed after the `not-finished` run: `--resume` refuses with `regression-gate-resume-tree-changed` and runs nothing [proposed]
- E4 · The newest row is `green`: `--resume` refuses with `regression-gate-nothing-to-resume` [proposed]

## R2 · A finished gate run answers a later whole-tree question
- E5 · The gate finished green on content K; a UAT session on K runs `aof test --scope all`: it is answered from the gate's run [proposed]
- E6 · The gate finished green on K; `aof work regression-gate 190` runs again on K: the gate runs [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-005 · Is a resume combined into one row, or two rows the door reads together?
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-005 · Do lanes that finished run again on resume?
