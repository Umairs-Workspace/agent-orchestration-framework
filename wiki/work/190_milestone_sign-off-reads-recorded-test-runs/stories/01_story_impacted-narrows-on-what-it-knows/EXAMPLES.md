---
doc: examples
---
# 190/01 · `aof test --scope impacted` narrows on everything that is positively known about a change — example map
<!--
Drafted at refine's discovery beat, 2026-11-09. No business question is left open. Struck because
the record answers them: whether an unknown may narrow (72/ADR-002, unchanged: it may not); whether
a wrong narrowing caught only at the milestone gate is acceptable (verify.md "Scope the suite to
the item", the trade the operator already set, and 63/R7); whether runs should be cheaper per
story at all (the SPEC Objective). The numeric bar in R5 is not a policy question: the SPEC states
the outcome by example, so R5 records the measured result instead of a target.
-->

## R1 · A suite the runner registers is a suite the selection can choose
- E1 · `packages/work/src/testing/select.mjs` changes: `packages/work/test/testing.test.mjs` and `test/work/lifecycle/work-test-select.test.mjs` are both selected [proposed]
- E2 · `packages/work/src/regression-record.mjs` changes: suites that import `item-status.mjs`, which imports it, are selected too [proposed]

## R2 · A new file narrows only when its place is known
- E3 · A story declares `test/testing/test-run-record.test.mjs`, which the graph has never seen: it selects itself and nothing widens [proposed]
- E4 · A story creates `packages/work/src/testing/record.mjs`, and the changed `test.mjs` imports it: it inherits `test.mjs`'s suites [proposed]
- E5 · A story creates `packages/work/src/lazy.mjs`, which nothing in the changed set imports by a literal specifier: the run widens with `not-in-graph` [proposed]
- E6 · A story declares `test/testing/later.test.mjs`, which is neither on disk nor in the graph: it is reported `not-yet-written` and selects nothing [proposed]

## R3 · A document narrows only through a declared coupling
- E7 · `wiki/codex-support.md` changes, and a coupling declares that no suite reads `wiki/*.md`: nothing is selected for it and it is reported `declared-coupling` [proposed]
- E8 · `packages/core/assets/commands/continue.md` changes, and a coupling maps it to the prompt suites: those suites are selected [proposed]
- E9 · `schemas/aof.schema.json` changes and no coupling matches it: the run widens with `not-in-graph` [proposed]
- E10 · A narrowed run's `--json` names, for every selected suite, the changed file and the reason that chose it [proposed]

## R4 · The recent stories narrow
- E11 · The 76 stories that widened in `RESEARCH.md` Q1 are replayed through the shipped selector: the count that still widens, and the reason each one widens, is recorded in `VERIFICATION.md` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-003 · Is the transitive walk a ctx option on `relations`, or a second verb?
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-003 · Are package suites admitted by roots plus suffixes, or by asking the registry?
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-003 · Does a text-reference index place documents, or a declaration?
