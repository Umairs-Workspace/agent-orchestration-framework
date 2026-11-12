---
type: story
number: 00
slug: the-map-tells-a-fact-from-a-decision
title: "The map tells a fact from a decision — `domain`, `policy` and a cited `researched F<n>` join the grammar, and every map already written reads as it did"
parent: 192
depends: []
status: not-started
owner: product-owner
created: 2026-11-12
updated: 2026-11-12
adrs: [ADR-001]
reads:
  - wiki/work/192_milestone_operator-aware-discovery/SPEC.md
  - wiki/work/192_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-001
  - wiki/work/archive/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-001
  - wiki/work/archive/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-004
  - wiki/work/archive/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-004
  - packages/specification-by-example/src/doctor-lane.mjs
  - packages/specification-by-example/src/answers.mjs
  - packages/specification-by-example/test/example-trace.suite.mjs
  - wiki/work/189_milestone_human-understanding-checks/stories/00_story_grill-me-ships-and-writes-nothing/EXAMPLES.md
  - test/support/cli-spawn.mjs
  - test/support/source-slice.mjs
  - packages/specification-by-example/src/build-door.mjs
  - packages/specification-by-example/src/story-probe.mjs
  - packages/specification-by-example/test/package-seams.suite.mjs
  - packages/work/src/feature-parse.mjs
  - test/arch/examples/acd-example-trace-declared.test.mjs
  - test/examples/doctor-examples-lane.test.mjs
  - test/support/read-src-files.mjs
  - test/examples/refine-discovery-beat.test.mjs
  - .aof/templates/work/story/EXAMPLES.md
files:
  - packages/specification-by-example/src/map.mjs
  - packages/specification-by-example/test/example-map-parse.suite.mjs
  - packages/specification-by-example/README.md
  - test/arch/examples/acd-example-map-single-home.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 192/00 · The map tells a fact from a decision

## User story

As **an operator steering a build in a subject I am not a specialist in**,
I want **the example map to say whether a question is a fact about the world or a decision that is
mine, and to let a fact be closed by a finding that names its source**,
so that **a question a cited source can answer is never held open waiting for me, and nothing an
agent merely believes can pass for a settled fact**.

What lands (ADR-001): `map.mjs` learns the classes `domain` and `policy` beside `technical` and the
old `business`, the state `researched F<n>`, the provenance `[researched F<n>]`, the queries that
say which questions are open and which claims cite a finding, and `readFindings` for the research
document. FF-19201 joins the single-home control. This story is code only: the template that
teaches the new forms is a variant the practice ships with its beat (04).

## Tasks

- [ ] 00 [a question is a fact, a decision or an engineering choice](tasks/00_a-question-is-a-fact-a-decision-or-an-engineering-choice.feature)
- [ ] 01 [a fact is closed by a cited finding, a decision only by a person](tasks/01_a-fact-is-closed-by-a-cited-finding.feature)
- [ ] 02 [a finding counts only when it names its source](tasks/02_a-finding-counts-only-when-it-names-its-source.feature)
- [ ] 03 [a map written before this change reads as it did](tasks/03_a-map-written-before-this-change-reads-as-it-did.feature)
- [ ] 04 [the grammar keeps one home](tasks/04_the-grammar-keeps-one-home.feature)

## Notes

- No file is added to `packages/specification-by-example/src`: the finding reader sits in `map.mjs`
  so the `F<n>` id is spelt once (ADR-001 §6).
- The lane's messages and its new code are 01's. This story changes what the parser and its queries
  answer, and leaves `doctor-lane.mjs` importing names that still exist.
- The default template and the beat that ships today keep saying `business`, and stay correct:
  this story changes no bundle asset, writes no manifest, and does not need milestone 193.
