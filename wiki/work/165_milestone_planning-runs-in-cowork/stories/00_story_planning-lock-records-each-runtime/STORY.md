---
type: story
number: 00
slug: planning-lock-records-each-runtime
title: "The planning lock records each runtime — a second runtime's planning init is added beside the first without --force, and --force re-pins only the runtime it names"
parent: 165
status: in-review
owner: product-owner
created: 2026-10-19
updated: 2026-10-19
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-004, wiki/work/165_milestone_planning-runs-in-cowork/stories/00_story_planning-lock-records-each-runtime/EXAMPLES.md, wiki/work/165_milestone_planning-runs-in-cowork/stories/00_story_planning-lock-records-each-runtime/PLAN.md, wiki/work/archive/02_milestone_planning-init/ARCHITECTURE.md#adr-009, packages/core/src/lock.mjs, packages/core/src/workspace.mjs, packages/core/src/commands/planning-init.mjs, packages/core/test/work-init.suite.mjs, packages/core/test/work-update.suite.mjs, test/arch/bundle/acd-install-manifest-contract.test.mjs]
files: [packages/core/src/planning-init.mjs, packages/core/test/planning-init.suite.mjs, test/arch/planning/acd-planning-lock-isolation.test.mjs, test/arch/planning/acd-planning-provenance-sha.test.mjs, test/arch/planning/acd-planning-no-codex-install.test.mjs, test/arch/store/acd-unified-lock-sections.test.mjs]
---
# 00 · The planning lock records each runtime

## User story

As **the operator, who plans in one runtime and builds in another**,
I want **`aof planning init` to record each runtime I install planning for as its own entry in
`.aof/aof.lock.json`, adding a new runtime without `--force` and re-pinning only the runtime I
name**,
so that **installing planning for Cowork (or Codex) never overwrites, or is refused by, the Claude
install that the repo already records. Today the lock holds one runtime, the guard refuses any
second init, and `--force` throws the first install's provenance away.**

## Tasks

- [x] [00 · A second runtime is recorded beside the first](tasks/00_a-second-runtime-is-recorded-beside-the-first.feature)
- [x] [01 · A re-install needs --force, for its own runtime only](tasks/01_a-re-install-needs-force-for-its-own-runtime-only.feature)

## Notes

- **The shape** (ADR-004) is `planning: { runtimes: { <runtime>: <entry> } }`. Each entry keeps
  m02's frozen schema unchanged. One exported reader maps a pre-165 flat section to
  `{ [section.runtime]: section }`. The writer always writes the new shape.
- **FF-16501** extends `acd-planning-lock-isolation`. The other arch tests and
  `acd-unified-lock-sections` read `lock.planning.<field>` today, and switch to the reader. Their
  assertions keep their meaning. The m02 contracts stay true: their "manifest field" is now the
  entry for the runtime being installed.
- The `work-init`, `work-update` and `install-manifest-contract` suites seed a flat `planning`
  section and assert that it survives unchanged. They don't run planning init, so they stay
  as they are and are only read here.
- Only claude and codex exist in this story. Cowork arrives in 165/03 and uses the same entry
  map.
