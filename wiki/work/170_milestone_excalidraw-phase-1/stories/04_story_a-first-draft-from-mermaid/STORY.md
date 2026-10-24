---
type: story
number: 04
slug: a-first-draft-from-mermaid
title: "A first draft from Mermaid — the editor stops opening empty: the operator requests a draft and the architect proposes a whole diagram, drawn on accept by Excalidraw's converter"
parent: 170
status: in-review
owner: product-owner
created: 2026-10-20
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: [00, 08]
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-005, wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-012, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md]
files: [packages/diagrams-ui/src/compile.mjs, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams/src/commands/scene.mjs, packages/diagrams-ui/test/compile.suite.mjs, test/diagrams/diagram-scene-review.test.mjs]
---
# 04 · A first draft from Mermaid

## User story

As **the operator, opening the editor on a diagram that has no scene yet**,
I want **to ask for a first draft and get a whole diagram the architect proposed, which I preview
and accept**,
so that **I start from the architect's picture of the ADR instead of an empty canvas.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **Built twice.** It was built first as a one-shot Mermaid import into a separate scene (ADR-005).
  That was withdrawn because it left three pictures of one diagram that nothing kept in step
  (RETROSPECTIVE R5), and it was rebuilt on the one format (08).
- **As delivered** (ADR-012), an empty scene takes the first-draft path: the whole proposal goes
  through Excalidraw's converter, subgraphs become frames, and fresh ids are tagged with the Mermaid
  ids. The preview says "only adds".
- **Not verified here.** No real model has proposed a first draft in a live session yet. That is an
  open acceptance item in VERIFICATION.
