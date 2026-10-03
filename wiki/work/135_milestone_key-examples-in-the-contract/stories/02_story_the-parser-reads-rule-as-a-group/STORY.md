---
type: story
number: 02
slug: the-parser-reads-rule-as-a-group
title: "The parser reads Rule: as a group — a rule owns its scenarios and its tags, Example: is a scenario, and an Examples row keeps its cells"
parent: 135
depends: []
status: done
owner: product-owner
created: 2026-10-03
updated: 2026-10-03
adrs: [ADR-002, ADR-003]
reads:
  - wiki/work/135_milestone_key-examples-in-the-contract/SPEC.md
  - wiki/work/135_milestone_key-examples-in-the-contract/RESEARCH.md
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-002
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-003
  - packages/work/src/validation.mjs
  - packages/work/src/doctor/rubric.mjs
  - packages/work/src/ratchet.mjs
  - packages/work/src/commands/tasks.mjs
  - test/work/gate/work-validate-contract-parses.test.mjs
files:
  - packages/work/src/feature-parse.mjs
  - packages/work/test/feature-parse-examples.suite.mjs
  - packages/work/test/support/feature-parse-pre-examples.mjs
  - test/work/feature-parse-strict.test.mjs
  - test/arch/work/acd-feature-parse-examples-additive.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 02 · The parser reads `Rule:` as a group

## User story

As **every reader of a task contract (validate, the board, the trace, the ratchet)**,
I want **the one Gherkin parser to report which `Rule:` each scenario sits under, to give a rule's
tags to every scenario in it, to read `Example:` as a scenario, and to keep each Examples row's
cells**,
so that **a contract written with rules is read as rules, a tag on a rule never lands on the wrong
scenario, and an `Example:` can never vanish from a contract without anyone being told (RESEARCH
R2, R3)**.

What lands (ADR-003): additive keys on `parseFeature` (`scenarios[].rule`, `rules`,
`examples[].columns`, `examples[].cells`), rule-scoped tags, and `Example:` admitted. Every feature
in the corpus parses to the same value under the old keys (RESEARCH R5), and FF-5704 keeps proving
that over the whole tree.

## Tasks

- [x] 00 [a scenario knows its rule and a rule owns its tags](tasks/00_a-scenario-knows-its-rule-and-a-rule-owns-its-tags.feature)
- [x] 01 [example is a scenario and a row keeps its cells](tasks/01_example-is-a-scenario-and-a-row-keeps-its-cells.feature)

## Notes

- The parser spells no map id. Reading `R<n> · ` and `E<n>` belongs to the package (ADR-003 §6,
  FF-13402).
- No source reader changes in this story. 03 (the board) and 04 (the trace) pick up the new keys.

## Accept decision

Accepted 2026-10-03 by aof:verify 135: its scenarios green at accept (milestone VERIFICATION `## Verification evidence`), validate PASS, no blocker finding open.
