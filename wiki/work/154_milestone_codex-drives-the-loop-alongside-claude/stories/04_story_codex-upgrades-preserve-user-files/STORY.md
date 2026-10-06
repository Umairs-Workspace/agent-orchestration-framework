---
type: story
number: 4
slug: codex-upgrades-preserve-user-files
title: "Codex upgrades preserve operator-owned files"
parent: 154
status: not-started
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [03]
reads: ["packages/core/src/adapter-warnings.mjs","packages/core/src/adapters.mjs","packages/core/src/aof-gitignore.mjs","packages/core/src/application/bindings/work/init.mjs","packages/core/src/application/bindings/workspace-writer.mjs","packages/core/src/asset-base.mjs","packages/core/src/asset-references.mjs","packages/core/src/claude-settings.mjs","packages/core/src/codex-settings.mjs","packages/core/src/frozen-set.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/core/src/opencode-hooks.mjs","packages/core/src/packages.mjs","packages/core/src/paths.mjs","packages/core/src/render-plan.mjs","packages/core/src/runtime-config.mjs","packages/core/src/work/bundle-runtime.mjs","packages/core/src/work/bundle-synthesis.mjs","packages/core/src/work/bundle.mjs","packages/core/src/work/headroom.mjs","packages/core/src/work/update.mjs","packages/core/src/workspace.mjs","packages/core/test/codex-ownership.suite.mjs","packages/core/test/index.mjs","packages/core/test/support/assets-services.mjs","packages/core/test/work-init.suite.mjs","packages/core/test/work-update.suite.mjs","scripts/test-unit.mjs","test/arch/bundle/acd-codex-output-ownership.test.mjs","test/arch/bundle/index.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-005-render-native-assets-with-explicit-ownership","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md"]
files: ["packages/core/src/application/bindings/work/init.mjs","packages/core/src/application/bindings/workspace-writer.mjs","packages/core/src/codex-settings.mjs","packages/core/src/lock.mjs","packages/core/src/render-plan.mjs","packages/core/src/runtime-config.mjs","packages/core/src/work/update.mjs","packages/core/src/workspace.mjs","packages/core/test/codex-ownership.suite.mjs","packages/core/test/index.mjs","packages/core/test/work-init.suite.mjs","packages/core/test/work-update.suite.mjs","scripts/test-unit.mjs","test/arch/bundle/acd-codex-output-ownership.test.mjs","test/arch/bundle/index.mjs"]
---
# 154/04 · Codex upgrades preserve operator-owned files

## User story

As an operator, I want safe repeatable application of Codex assets, so that upgrades preserve my settings and do not leave competing skill copies.

## Tasks

- [ ] `tasks/00_coauthored-config.feature` — coauthored config
- [ ] `tasks/01_owned-migration.feature` — owned migration

## Notes

- Decisions: ADR-005 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.

