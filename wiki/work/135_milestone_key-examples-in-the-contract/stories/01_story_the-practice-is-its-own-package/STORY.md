---
type: story
number: 01
slug: the-practice-is-its-own-package
title: "The practice is its own package — the map, the answers, the lane and the build door move into @aof/specification-by-example, and @aof/work keeps only seams that never name them"
parent: 135
depends: []
status: in-review
owner: product-owner
created: 2026-10-03
updated: 2026-10-03
adrs: [ADR-001]
reads:
  - wiki/work/135_milestone_key-examples-in-the-contract/SPEC.md
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-001
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-002
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-005
  - packages/work-graph/package.json
  - packages/work/src/doctor/rubric.mjs
  - packages/work/src/commands/doctor.mjs
  - packages/execution/src/runs.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/core/src/application/bindings/commands/doctor.mjs
  - scripts/workspace-boundaries.mjs
  - test/examples/examples-config-gate.test.mjs
  - test/examples/example-answers.test.mjs
  - test/arch/examples/acd-settle-reads-the-transcript-store.test.mjs
  - test/support/read-src-files.mjs
  - test/support/source-slice.mjs
files:
  - packages/specification-by-example/package.json
  - packages/specification-by-example/README.md
  - packages/specification-by-example/src/map.mjs
  - packages/specification-by-example/src/answers.mjs
  - packages/specification-by-example/src/doctor-lane.mjs
  - packages/specification-by-example/src/build-door.mjs
  - packages/specification-by-example/src/story-probe.mjs
  - packages/specification-by-example/test/index.mjs
  - packages/specification-by-example/test/example-map-parse.suite.mjs
  - packages/specification-by-example/test/package-seams.suite.mjs
  - packages/work/src/examples/map.mjs
  - packages/work/src/examples/answers.mjs
  - packages/work/src/doctor/examples.mjs
  - packages/work/src/doctor/index.mjs
  - packages/work/src/doctor/budget.mjs
  - packages/work/src/commands/continue.mjs
  - packages/work/src/commands/doctor.mjs
  - packages/work/package.json
  - packages/work/test/index.mjs
  - packages/work/test/example-map-parse.suite.mjs
  - packages/work/test/domain-services.test.mjs
  - packages/work/test/support/doctor-services.mjs
  - packages/core/package.json
  - packages/core/src/application/assemble.mjs
  - packages/core/src/application/bindings/run-store.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/core/src/application/bindings/work/doctor-examples.mjs
  - packages/core/src/application/bindings/work-examples/answers.mjs
  - packages/core/src/application/bindings/commands/continue.mjs
  - package.json
  - yarn.lock
  - scripts/test.mjs
  - test/examples/doctor-examples-lane.test.mjs
  - test/examples/continue-door-examples.test.mjs
  - test/examples/refine-discovery-beat.test.mjs
  - test/arch/examples/index.mjs
  - test/arch/examples/acd-example-answer-one-reader.test.mjs
  - test/arch/examples/acd-example-map-single-home.test.mjs
  - test/arch/examples/acd-examples-off-is-today.test.mjs
  - test/arch/examples/acd-sbe-package-one-way.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 01 · The practice is its own package

## User story

As **the operator, and whoever maintains `@aof/work` next**,
I want **specification by example (the map grammar, the answer reader, the doctor lane and the
build-door check) to live in its own package, `@aof/specification-by-example`, with `@aof/work`
offering only extension seams that never name it**,
so that **the practice has one home that grows on its own (135's trace is born there), and
`@aof/work`, the core of the work stream, stops carrying a practice most projects leave switched
off**.

What lands (ADR-001): the package, the three seams in `@aof/work` (a story probe, injected budget
rows, a `beforeBuild` list on the phase doors), core composing the two, and FF-13501. There is no
behaviour change: every 134 suite passes from the new home with only its imports changed. The
`work.examples.enabled` switch, the refusal code and every doctor code stay as they are.

## Tasks

- [x] 00 [the package holds the practice and work keeps only seams](tasks/00_the-package-holds-the-practice-and-work-keeps-only-seams.feature)
- [x] 01 [nothing a user can see changes](tasks/01_nothing-a-user-can-see-changes.feature)

## Notes

- A restructure inside the milestone (m134/R2): 03, 04 and 05 declare this story's paths as forward
  references. Re-check their `files:` against the tree once this story merges.
- `yarn.lock` gains a workspace entry only. Run `node scripts/supply-chain-audit.mjs` after the
  install (AGENTS.md, supply-chain safety). No third-party dependency is added.
- The arch tests FF-13401, FF-13402 and FF-13403 are code. Their path constants move. Their
  invariants do not change.
