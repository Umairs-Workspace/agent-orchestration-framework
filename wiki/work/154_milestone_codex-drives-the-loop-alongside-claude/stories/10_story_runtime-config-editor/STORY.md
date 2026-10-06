---
type: story
number: 10
slug: runtime-config-editor
title: "The config editor explains effective assistant settings"
parent: 154
status: not-started
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [05, 09]
reads: ["apps/ui/src/config/App.tsx","apps/ui/src/config/config-load.d.mts","apps/ui/src/config/config-load.mjs","apps/ui/src/index.css","packages/core/src/adapter-warnings.mjs","packages/core/src/application/bindings/config-editor.mjs","packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/asset-references.mjs","packages/core/src/diagrams/generators.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/core/src/packages.mjs","packages/core/src/render-plan.mjs","packages/core/src/tool-store.mjs","packages/core/src/work/bundle.mjs","packages/core/test/config-editor.suite.mjs","packages/core/test/support/assets-services.mjs","packages/execution/src/runtime-selection.mjs","schemas/aof.schema.json","test/command/config-inspect.test.mjs","test/surfaces/setup-ui.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-002-resolve-runtime-and-model-once-retain-provenance","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-008-explicit-memory-choice-and-configuration-only-ui","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/DESIGN.md"]
files: ["apps/ui/src/config/App.tsx","apps/ui/src/config/config-load.d.mts","apps/ui/src/config/config-load.mjs","packages/core/src/application/bindings/config-editor.mjs","packages/core/src/application/bindings/config-inspect.mjs","packages/core/test/config-editor.suite.mjs","test/command/config-inspect.test.mjs","test/surfaces/setup-ui.test.mjs"]
---
# 154/10 · The config editor explains effective assistant settings

## User story

As an operator, I want to edit and inspect runtime and scoped model settings in the existing configuration page, so that I can predict the next run without accidentally starting one.

## Tasks

- [ ] `tasks/00_config-roundtrip.feature` — config roundtrip
- [ ] `tasks/01_accessible-runtime-form.feature` — accessible runtime form

## Notes

- Decisions: ADR-002, ADR-008 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.

