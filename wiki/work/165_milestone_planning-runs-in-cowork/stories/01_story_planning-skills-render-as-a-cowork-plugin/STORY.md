---
type: story
number: 01
slug: planning-skills-render-as-a-cowork-plugin
title: "The planning skills render as a Cowork plugin — shatter and explain become aof skills from their own command sources, packaged as a reproducible .plugin"
parent: 165
status: done
owner: product-owner
created: 2026-10-19
updated: 2026-10-20
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-002, wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-005, wiki/work/165_milestone_planning-runs-in-cowork/RESEARCH.md, wiki/work/165_milestone_planning-runs-in-cowork/stories/01_story_planning-skills-render-as-a-cowork-plugin/EXAMPLES.md, wiki/work/165_milestone_planning-runs-in-cowork/stories/01_story_planning-skills-render-as-a-cowork-plugin/PLAN.md, packages/core/src/work/bundle.mjs, packages/core/assets/bundle.json, packages/core/assets/commands/shatter.md, packages/core/assets/commands/explain.md, packages/core/package.json, packages/core/test/codex-native-assets.suite.mjs, packages/core/test/bundle-runtime-variants.suite.mjs, test/arch/bundle/acd-capability-delegation.test.mjs]
files: [packages/core/src/work/bundle-runtime.mjs, packages/core/src/planning/cowork-plugin.mjs, packages/core/src/planning/stored-zip.mjs, packages/core/test/planning-cowork-plugin.suite.mjs, packages/core/test/index.mjs, scripts/test-unit.mjs, test/arch/planning/acd-cowork-skills-from-command-source.test.mjs, test/arch/planning/acd-cowork-package-deterministic.test.mjs, test/arch/planning/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 01 · The planning skills render as a Cowork plugin

## User story

As **the operator, planning in Cowork**,
I want **aof to render shatter and explain as the skills of an `aof` plugin, from the
same command sources Claude Code and Codex use, packaged as one reproducible `.plugin` file**,
so that **I can upload a single file and run `/aof:shatter` in Cowork, with a procedure
that can't drift from `/aof:shatter` and that still behaves when Cowork's shell has no `aof`
CLI.**

## Tasks

- [x] [00 · The plugin holds shatter and explain, rendered from their commands](tasks/00_the-plugin-holds-shatter-and-explain.feature)
- [x] [01 · Without the CLI a skill writes Markdown only](tasks/01_without-the-cli-a-skill-writes-markdown-only.feature)
- [x] [02 · The package is reproducible](tasks/02_the-package-is-reproducible.feature)

## Notes

- **One mapping** (ADR-002): `mappedBody` in `bundle-runtime.mjs` is generalised so that each
  runtime mapping carries its own preamble wording, and cowork becomes a second entry beside
  codex. Codex's output stays byte-identical (E5, FF-16502).
- **New homes** are `packages/core/src/planning/cowork-plugin.mjs` (renders the plugin's file
  map) and `packages/core/src/planning/stored-zip.mjs` (file map to bytes, FF-16503). The
  `packages/core/src` root is at its 28 ceiling. A new `planning/` family stays under the
  flat-layer threshold.
- **Budget:** `packages/core/test` 42 → 43 for `planning-cowork-plugin.suite.mjs`, and
  `test/arch/planning` 36 → 38 for FF-16502 and FF-16503. Each row's reason names this story.
- This story writes no files to the repo and no lock entry. It returns a file map and bytes.
  Writing them under `.aof/cowork/` is 165/03's job.
