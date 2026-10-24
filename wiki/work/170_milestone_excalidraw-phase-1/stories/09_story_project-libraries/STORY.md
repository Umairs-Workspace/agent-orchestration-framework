---
type: story
number: 09
slug: project-libraries
title: "Project libraries — .excalidrawlib files load as they are, every insertion keeps its library and item, and the architect places an item by name"
parent: 170
status: in-review
owner: product-owner
created: 2026-10-21
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: [08]
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-011, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md]
files: [packages/diagrams/src/layout.mjs, packages/diagrams/src/scene-view.mjs, packages/diagrams/src/commands/scene.mjs, packages/diagrams-ui/src/compile.mjs, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams/test/scene-view.suite.mjs, packages/diagrams-ui/test/compile.suite.mjs, test/arch/diagrams/acd-diagram-layout-single-home.test.mjs]
---
# 09 · Project libraries

## User story

As **an operator whose team already has `.excalidrawlib` icon sets (Azure, AWS, C4)**,
I want **the project's libraries in the editor's Library panel as they are, and the architect able
to place an item by name**,
so that **nobody has to recreate a library in a DSL, and an inserted "Function App" stays a Function
App to the architect.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **Where they live** (ADR-011): `.aof/diagrams/libraries/*.excalidrawlib`, at 8 MB in all. The
  path has its one home in `layout.mjs` (`diagramLibrariesDir`).
- **Provenance.** `libraryItemsFor` tags every element with `customData.aof.lib = { library, item }`
  and gives a multi-element item one outer group. The SDK's duplication copies the tag, so every
  insertion keeps it.
- **By name.** `%% aof:lib <id> <library>/"<item>"` must resolve to exactly one item, otherwise
  `diagram-library-unknown`. An aof insertion adds a transparent anchor box for arrows and a centred
  caption.
- **Not verified here.** Only a hand-made one-item library has been loaded. A real public set is an
  open acceptance item.
