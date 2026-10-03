---
type: story
number: 04
slug: an-agreed-example-cannot-fall-out
title: "An agreed example cannot fall out — every confirmed or stated example resolves, by its id, to a scenario or an Examples row under its own rule, or the doctor names it"
parent: 135
depends: [01, 02]
status: in-review
owner: product-owner
created: 2026-10-03
updated: 2026-10-03
adrs: [ADR-002, ADR-004]
reads:
  - wiki/work/135_milestone_key-examples-in-the-contract/SPEC.md
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-002
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-003
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-004
  - packages/work/src/feature-parse.mjs
  - packages/work/src/lifecycle.mjs
  - packages/work/src/doctor/rubric.mjs
  - packages/work/src/doctor/index.mjs
  - packages/work/src/commands/continue.mjs
  - packages/specification-by-example/src/answers.mjs
  - packages/specification-by-example/src/story-probe.mjs
  - test/support/read-src-files.mjs
  - test/support/source-slice.mjs
files:
  - packages/specification-by-example/src/map.mjs
  - packages/specification-by-example/src/doctor-lane.mjs
  - packages/specification-by-example/src/build-door.mjs
  - packages/specification-by-example/test/index.mjs
  - packages/specification-by-example/test/example-trace.suite.mjs
  - test/examples/doctor-examples-lane.test.mjs
  - test/examples/continue-door-examples.test.mjs
  - test/arch/examples/index.mjs
  - test/arch/examples/acd-example-trace-declared.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 04 · An agreed example cannot fall out

## User story

As **the person who agreed an example in discovery**,
I want **every example I confirmed or stated to stay in the story's contract, inside the rule it
illustrates, and the doctor to name any that goes missing**,
so that **what I agreed actually reaches the executable contract and stays there, and an agent
editing a feature can never drop it without the gap showing up in red**.

What lands (ADR-004): id readers in the package's `map.mjs` (`E<n> · ` at the head of a scenario
name, `E<n>` in an `example` column, `R<n> · ` at the head of a group title), and a sixth code,
`example-untraced`, in the examples lane. It applies only to a contract formulated from the map. The
continue door refuses a story with an untraced agreed example, by the operator's ruling (map Q1,
2026-10-03).

## Tasks

- [x] 00 [an agreed example resolves by its id inside its rule](tasks/00_an-agreed-example-resolves-by-its-id-inside-its-rule.feature)
- [x] 01 [the trace waits for a contract formulated from the map](tasks/01_the-trace-waits-for-a-contract-formulated-from-the-map.feature)
- [x] 02 [the build is refused while an agreed example is missing](tasks/02_the-build-is-refused-while-an-agreed-example-is-missing.feature)

## Notes

- Silent unless all of these hold: the gate is on, the map is applicable, the story has tasks, and
  at least one task names a rule id (ADR-004 §4). So the refine stop before the first scenario can
  never trip it, and 144 lints as today.
- The trace reads `featureTexts`, which is already on every story row of the doctor snapshot.
  The door reads the story's `tasks/*.feature` itself.
