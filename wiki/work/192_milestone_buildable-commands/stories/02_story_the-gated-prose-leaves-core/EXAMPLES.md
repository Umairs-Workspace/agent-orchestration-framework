---
doc: examples
---
# 192/02 · The gated prose leaves core — example map
<!--
Drafted at refine's discovery beat, 2026-11-13. Struck because the record answers them: which
prose moves and to which practice, that a project with discovery off holds no sentence about the
example map, that a project with it on reads what it reads today, and that `continue.md` and
`verify.md` are left for later (SPEC Scope, "The first move", and Out of scope). Relabelled
technical: what "says the same" is measured against, whether the developer brief's `PLAN.md`
paragraph moves, what happens to the Codex execution contract's sentence, and whether the two
templates are still installed in a project with the practice off.
-->

## R1 · With a practice off, a project's commands hold none of its prose
- E1 · A new project with no `work.examples` and no `work.plan`: its rendered refine command holds no sentence that names the example map, `EXAMPLES.md`, the discovery beat, `PLAN.md` or the build brief [proposed]
- E2 · A project with `work.plan.enabled` `true` and no `work.examples`: its refine command holds the build brief and nothing about the example map [proposed]
- E3 · A project with `work.examples.enabled` `true` and no `work.plan`: its refine command holds the discovery beat and nothing about `PLAN.md` [proposed]

## R2 · With a practice on, the command says what it says today
- E4 · This checkout, which has both on: its rendered refine command differs from the one committed before this story only at line breaks and at the Contract's opening, which no longer says "opening with the discovery beat below when the project has turned it on" [proposed]
- E5 · The Codex refine skill in this checkout: the same holds for its procedure, and its entry now reads "…before writing tasks. Retain executable/manual/UAT lanes…" [proposed]

## R3 · A practice's prose lives with the practice
- E6 · The discovery beat is a file of `@aof/specification-by-example`, and core's refine source holds a slot marker where it stood [proposed]
- E7 · The build brief is a file under core's own assets, declared by core's bundle as the practice `build-brief`, keyed on `work.plan.enabled` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-005 · What is "says the same" measured against? (The render with both keys on, with every run of whitespace collapsed, against the render before the move; two seam edits are listed and allowed.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-005 · Does the developer brief's `PLAN.md` paragraph move? (No. It is conditional on a file, not a key, and belongs to the build, which the SPEC leaves for later.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-005 · What happens to "A driven business question retains its map token" in the Codex execution contract? (It stays. It is ungated and stands in 45 copies.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-004 · Are `EXAMPLES.md` and `PLAN.md` still installed where the practice is off? (Yes. The defaults are unchanged.)
