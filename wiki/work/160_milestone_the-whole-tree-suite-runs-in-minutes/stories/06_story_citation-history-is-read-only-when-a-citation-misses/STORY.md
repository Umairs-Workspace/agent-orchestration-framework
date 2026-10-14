---
type: story
number: 06
slug: citation-history-is-read-only-when-a-citation-misses
title: "Citation history is read only when a citation misses — doctor and validate resolve on disk first and spawn no git when everything resolves"
parent: 160
status: not-started
owner: product-owner
created: 2026-10-14
updated: 2026-10-14
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-007-citation-history-is-read-only-when-a-citation-misses-on-disk, packages/work/src/commands/doctor.mjs, packages/work/src/commands/validate.mjs, packages/work/src/commands/tune.mjs, packages/work/src/doctor/index.mjs, packages/work/src/citation-history.mjs, packages/work/src/cited-path-resolve.mjs, packages/work/src/tune/provenance.mjs, packages/core/src/application/bindings/commands/doctor.mjs, packages/core/src/application/bindings/commands/validate.mjs, packages/core/src/application/bindings/commands/tune.mjs, packages/work/test/citation-history.test.mjs, packages/work/test/work-doctor.suite.mjs, packages/work/test/tune-provenance.suite.mjs, test/arch/command/acd-cited-path-resolves.test.mjs, test/arch/work/acd-milestone-66-controls-resolve.test.mjs, test/audit/cited-path-resolve.test.mjs, test/loop/work-loops-coverage-ledger.test.mjs]
files: [packages/work/src/commands/doctor.mjs, packages/work/src/commands/validate.mjs, packages/work/src/commands/tune.mjs, packages/work/src/doctor/index.mjs, packages/work/src/citation-history.mjs, packages/work/src/tune/provenance.mjs, packages/work/test/citation-history.test.mjs, packages/work/test/work-doctor.suite.mjs, packages/work/test/tune-provenance.suite.mjs, test/arch/command/acd-cited-path-resolves.test.mjs]
---
# 06 · Citation history is read only when a citation misses

## User story

As the operator whose loop runs doctor and validate on every rung,
I want them to read git history only when a cited path is missing from the tree,
so that a stream whose citations all resolve is checked without walking the whole history three
ways on every call.

## Tasks

- [ ] `tasks/00_history-is-a-lazy-source.feature`: the loader reads history at most once and never before it is asked; a stream that resolves on disk spawns nothing; a miss resolves through history exactly as today.

## Notes

ADR-007 is the decision, and it came from refine's profile. One `loop-command-wave` file, run
alone, made 422 runs each of the two history `log` walks and the working-tree `diff`, about 160 s,
because every case and every loop commit is a new HEAD that `79b926b7`'s memo has never seen.

On this repository a doctor with a stale citation still reads history, and finds what it finds
today. The saving is in the runs where nothing is stale: every fixture stream, and most real runs.

Story 01 depends on this one: once it lands, a case that runs the real doctor over a fixture stream
no longer spawns git, and so it can move onto the git model.

Discovery: not applicable (EXAMPLES.md).
