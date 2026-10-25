---
type: story
number: 01
slug: find-a-library-item-by-name
title: "Find a library item by name — a search tab beside the Library panel, over both library roots"
parent: 171
status: done
owner: product-owner
created: 2026-10-24
updated: 2026-10-25
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-002, wiki/work/171_milestone_excalidraw-phase-2/DESIGN.md, wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-011, packages/diagrams-ui/src/compile.mjs, packages/diagrams/src/commands/scene.mjs]
files: [packages/diagrams-ui/src/library-search.mjs, packages/diagrams-ui/src/library-search.d.mts, packages/diagrams-ui/src/LibrarySearch.tsx, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams-ui/package.json, packages/diagrams-ui/README.md, packages/diagrams-ui/test/library-search.suite.mjs, packages/diagrams-ui/test/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/smoke/diagram-editor.smoke.mjs]
---
# 01 · Find a library item by name

## User story

As **an operator drawing with a large shared icon set (249 AWS icons)**,
I want **to type part of an item's or a library's name and see only the matching items**,
so that **I place the icon I need in seconds instead of scrolling the whole panel (F-170-12).**

## Tasks

- [x] `tasks/00_search-filters-and-inserts-by-name.feature` — the filter over both roots and an insertion identical to the Library panel's
- [ ] `tasks/01_seen-in-the-browser.feature` — the Find tab, a click and a drag in the served editor

## Notes

- **Own tab, SDK insertion** (ADR-002): a Find tab in the SDK's default sidebar filters the items the
  editor already loads from the global and project roots. A result inserts through the SDK's own
  library drop, or a click drops it at the viewport's centre, so every insertion keeps
  `customData.aof.lib` exactly as a Library-panel insertion does.
- **No server change.** The `libraries` action already answers both roots, shadowing included.
- **Measured on a real set.** The smoke's one-item library cannot show search; the browser check
  uses a library with enough items that filtering is visible.
