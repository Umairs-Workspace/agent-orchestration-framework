---
type: story
number: 01
slug: impacted-narrows-on-what-it-knows
title: "`aof test --scope impacted` narrows on everything that is positively known about a change, and still widens on anything that is not"
parent: 190
depends: []
status: done
owner: product-owner
created: 2026-11-09
updated: 2026-11-10
adrs: [ADR-003]
reads:
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/SPEC.md
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/RESEARCH.md
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-003
  - wiki/work/archive/72_milestone_inner-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/179_milestone_memory-engine-port/ARCHITECTURE.md#ADR-002
  - packages/work/src/testing/declared.mjs
  - packages/work/src/testing/changed.mjs
  - packages/knowledge/src/engine.mjs
  - packages/knowledge/src/graphify-code-backend.mjs
  - packages/core/src/application/bindings/work/test-select.mjs
  - packages/core/src/application/bindings/code-relations.mjs
  - scripts/test.mjs
  - scripts/test-shard.mjs
  - test/arch/testing/acd-one-selector-one-changed-set.test.mjs
files:
  - packages/work/src/testing/select.mjs
  - packages/work/src/testing/toolchain.mjs
  - packages/work/src/commands/test.mjs
  - packages/work/src/audit/census.mjs
  - packages/knowledge/src/graphify-code-relations.mjs
  - .aof/aof.config.json
  - packages/knowledge/test/graph-impact.suite.mjs
  - packages/work/test/testing.test.mjs
  - packages/work/test/audit.test.mjs
  - test/work/lifecycle/work-test-select.test.mjs
  - test/work/lifecycle/work-test-declared.test.mjs
  - test/work/work-toolchain-declaration.test.mjs
  - test/arch/testing/acd-test-selection-widens-never-narrows.test.mjs
  - test/arch/testing/acd-suite-registration-single-decider.test.mjs
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/VERIFICATION.md
schema: 1
aofVersion: 0.1.0
---
# 190/01 · `aof test --scope impacted` narrows on everything that is positively known about a change

## User story

As **an operator waiting on a story's tests**,
I want **`aof test --scope impacted --story <ref>` to run the suites the change can actually reach,
instead of the whole suite, whenever what changed is known**,
so that **a typical story's run is a handful of suites, while a change nobody can place still runs
everything, exactly as 72 promised**.

Today all 76 recent stories widen (`RESEARCH.md` Q1). What lands (ADR-003):
- package-owned suites become suites;
- dependents are followed transitively;
- a new suite selects itself, and a new module imported by a changed file inherits its importer;
- a declared path not yet written contributes nothing;
- documents and data narrow only through a declared coupling;
- the narrowing reasons are a closed set (FF-19003), and every registered suite is selectable
  (FF-19005).

## Tasks

- [x] 00 [package suites are suites and dependents are followed to the end](tasks/00_package-suites-are-suites-and-dependents-are-followed-to-the-end.feature)
- [x] 01 [a new file narrows only when its place is known](tasks/01_a-new-file-narrows-only-when-its-place-is-known.feature)
- [x] 02 [a document narrows only through a declared coupling](tasks/02_a-document-narrows-only-through-a-declared-coupling.feature)
- [x] 03 [the recent stories narrow](tasks/03_the-recent-stories-narrow.feature)

## Notes

- `test.mjs` is shared with 190/00. This story only passes the declared suffixes and couplings
  through to the selector.
- The relations port's transitive form is a ctx option on the one verb (`relations(paths,
  { projectRoot, transitive: true })`). `engine.mjs` routes ctx through unchanged, so it is read,
  not written.
- This repo's `.aof/aof.config.json` gains the package and app test roots, `.suite.mjs`, and the
  couplings that task 02's census supports, each with its `why`.
- No new source or suite file, so no directory budget moves.
