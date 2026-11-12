---
type: story
number: 01
slug: the-gate-accepts-a-cited-finding
title: "The gate accepts a cited finding, and nothing less — a fact is closed by research or by the operator, a decision only by a person, and a citation that leads nowhere stops the build"
parent: 192
depends: [00]
status: not-started
owner: product-owner
created: 2026-11-12
updated: 2026-11-12
adrs: [ADR-002]
reads:
  - wiki/work/192_milestone_operator-aware-discovery/SPEC.md
  - wiki/work/192_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-001
  - wiki/work/192_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-002
  - wiki/work/archive/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-005
  - wiki/work/archive/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-001
  - wiki/work/archive/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-004
  - packages/specification-by-example/src/map.mjs
  - packages/specification-by-example/src/answers.mjs
  - packages/specification-by-example/test/package-seams.suite.mjs
  - packages/work/src/doctor/index.mjs
  - packages/work/src/lifecycle.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/core/src/application/bindings/work/doctor-examples.mjs
  - packages/core/src/application/bindings/commands/continue.mjs
  - packages/contracts/src/error.mjs
  - packages/work/src/feature-parse.mjs
files:
  - packages/specification-by-example/src/doctor-lane.mjs
  - packages/specification-by-example/src/story-probe.mjs
  - packages/specification-by-example/src/build-door.mjs
  - packages/specification-by-example/test/example-trace.suite.mjs
  - test/examples/doctor-examples-lane.test.mjs
  - test/examples/continue-door-examples.test.mjs
  - test/arch/examples/acd-examples-off-is-today.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 192/01 · The gate accepts a cited finding, and nothing less

## User story

As **an operator who is not the domain specialist**,
I want **the doctor and the build door to accept a fact that a named source settles, and to refuse
one that only claims to be settled**,
so that **a story can be built on research I did not have to do myself, and never on a citation
that leads nowhere**.

What lands (ADR-002): `example-question-open` judged by who owns the question; the new code
`example-research-unanchored`; the story probe and the build door reading the research document
beside the map; a researched example held to the trace like an agreed one. FF-19202 joins the
off-is-today control.

## Tasks

- [ ] 00 [a fact is closed by a cited finding or by the operator's own answer](tasks/00_a-fact-is-closed-by-a-finding-or-the-operators-answer.feature)
- [ ] 01 [a decision is closed only by a person's answer](tasks/01_a-decision-is-closed-only-by-a-person.feature)
- [ ] 02 [a cited finding must exist and name its source](tasks/02_a-cited-finding-must-exist-and-name-its-source.feature)
- [ ] 03 [a story is not built on a fact nobody cited](tasks/03_a-story-is-not-built-on-a-fact-nobody-cited.feature)

## Notes

- No core binding changes: the probe's and the door's signatures hold, and the research text rides
  the story row beside the map's (ADR-002 §3).
- This story adds no suite file. Its cases join `doctor-examples-lane`, `continue-door-examples`
  and `example-trace`, so it writes no index and shares no file with 03.
- A `business` question's message is byte-for-byte what it is today. Only `policy` and `domain`
  get new wording.
- The opt-in switch (`work.examples.operatorAware`, 03) gates prose, not this gate: a map is
  judged by what it says (ADR-002 §6). This story needs neither 03 nor milestone 193.
