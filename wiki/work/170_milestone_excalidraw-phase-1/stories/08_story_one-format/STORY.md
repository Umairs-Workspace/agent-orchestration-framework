---
type: story
number: 08
slug: one-format
title: "One format — the diagram is Excalidraw's scene, the architect reads and edits it as Mermaid, a proposal is compiled and accepted element by element, and Publish exports from the same canvas"
parent: 170
status: done
owner: product-owner
created: 2026-10-21
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-010, wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-012, wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-013, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md]
files: [packages/diagrams/src/scene-view.mjs, packages/diagrams/src/scene-view.d.mts, packages/diagrams/src/mermaid-profile.mjs, packages/diagrams/src/mermaid-profile.d.mts, packages/diagrams/src/commands/scene.mjs, packages/diagrams/src/layout.mjs, packages/diagrams-ui/src/compile.mjs, packages/diagrams-ui/src/compile.d.mts, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams/test/scene-view.suite.mjs, packages/diagrams/test/mermaid-profile.suite.mjs, packages/diagrams-ui/test/compile.suite.mjs, test/diagrams/diagram-scene-command.test.mjs, test/diagrams/diagram-scene-review.test.mjs, test/bundle/yarn-installation.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 08 · One format

## User story

As **the operator, who draws anything Excalidraw can draw, and the architect, who works in text**,
I want **the stored diagram to be Excalidraw's own scene, and the architect to read it and propose
changes to it as Mermaid**,
so that **nothing I draw is refused or lost, the architect works in a language it writes well and
can diff, and accepting its change leaves my own edits alone.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **The store** (ADR-010) is `diagrams/ADR-NNN-<slug>.excalidraw`, written canonically so a diff
  reads. `scene-view` projects it into the aof Mermaid profile. It is pure and shared by the server
  and the editor. Anything the profile cannot say becomes a read-only `%% aof:sketch`.
- **Compile and accept** (ADR-012). `propose` diffs the view into keyed changes and snapshots what
  each one touches. `@aof/diagrams-ui/compile` turns the changes into element edits. Accept refuses
  stale snapshots by Mermaid id, and refuses edits outside the snapshot.
- **Publish** (ADR-013) exports SVG, and PNG when owed, from the canvas where the ADR's block links.
  The diagram route alone accepts 16 MB.
- **Reworked.** It was built first with the `.mmd` as the store (ADR-006–ADR-009), which had no
  place for library items or freehand (RETROSPECTIVE R7).
