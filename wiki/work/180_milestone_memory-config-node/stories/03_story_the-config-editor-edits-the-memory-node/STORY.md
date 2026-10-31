---
type: story
number: 03
slug: the-config-editor-edits-the-memory-node
title: "The config editor has a Memory section that shows the node in the new shape and saves only the new shape"
parent: 180
status: done
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
depends: [180/01]
reads: [wiki/work/180_milestone_memory-config-node/DESIGN.md, wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-001, wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-006, packages/knowledge/src/memory-config.mjs, packages/server/src/setup-ui.mjs, apps/ui/src/config/RuntimeSettings.tsx, apps/ui/test/support/react-app-harness.mjs, packages/core/src/application/assemble.mjs]
files: [packages/core/src/application/bindings/config-editor.mjs, apps/ui/src/config/App.tsx, packages/core/test/config-editor.suite.mjs, test/surfaces/setup-ui.test.mjs]
---
# 03 · The config editor has a Memory section that shows the node in the new shape and saves only the new shape

## User story

As an operator who edits aof's config in the browser,
I want a Memory section that shows my memory settings in their new shape, tells me which old keys
it will replace, and saves only the new shape,
so that I can change what memory serves without hand-editing JSON in a file, and the editor never
writes a key that is on its way out.

## Tasks

- [x] `tasks/00_the-memory-section-shows-the-new-shape.feature` — the section lists the node in the new shape, with a notice naming each old key when the config still uses one
- [x] `tasks/01_saving-writes-only-the-new-shape.feature` — saving replaces the node, removes the old keys, keeps every other section, and refuses an invalid node with the reader's own diagnostic

## Notes

- 180/ADR-001 and ADR-006, and DESIGN Surface 1. Wave 2, parallel with 02. It calls `readMemoryConfig`
  and `rewriteLegacyMemoryConfig` from story 01's `memory-config.mjs`, and it restates no mapping.
- The section reuses `SectionEditor`. It adds no new component and no new route, because
  `PUT /api/config/sections` already forwards the body to `saveEditableSections`.
- The section is project scope only, like MCP Servers, Hooks and Project Docs.
- Ratified in this contract: a saved node that itself carries a legacy key (`sources`, `graphify`)
  is refused with `memory-config-legacy-write`, never written. The section shows the new shape, so
  only a hand edit could put one back, and the editor writes no key on its way out. A non-object
  payload is refused with `invalid-memory-section`.
- A conflicting config is shown as written, never rewritten in the textarea. The conflict
  diagnostic names both paths, and saving writes the textarea's node and removes the root `graph`.
