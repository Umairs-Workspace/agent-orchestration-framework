---
type: story
number: 00
slug: native-draft-store-and-review-loop
title: "The native draft store and the review loop — an embedded Excalidraw editor saves a draft, and the operator and the architect ask, answer, propose, preview, accept and reject"
parent: 170
status: done
owner: product-owner
created: 2026-10-18
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-004, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md, wiki/planning/PRD-excalidraw-refinement.md]
files: [packages/diagrams/src/commands/scene.mjs, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams-ui/src/editor-state.d.mts, packages/diagrams-ui/test/editor-state.suite.mjs, packages/server/src/board-ui.mjs, apps/ui/src/board/Markdown.tsx, apps/ui/src/board/DetailPanel.tsx, apps/ui/src/board/api.ts, apps/ui/src/board/diagrams.mjs, packages/core/assets/commands/diagram-review.md, packages/core/assets/manifest.json, .agents/skills/aof-diagram-review/SKILL.md, .agents/skills/aof-diagram-review/agents/openai.yaml, .claude/commands/aof/diagram-review.md, .codex/aof/workflows/workflow-contract.md, .opencode/commands/aof/diagram-review.md, packages/core/src/application/bindings/commands/diagram/file.mjs, test/diagrams/diagram-scene-api.test.mjs, test/diagrams/diagram-scene-command.test.mjs, test/diagrams/diagram-scene-review.test.mjs, scripts/supply-chain-audit.mjs, NOTICE, apps/ui/public/excalidraw/EXCALIDRAW-LICENSE.txt]
---
# 00 · The native draft store and the review loop

## User story

As **the operator, refining an ADR's diagram with the architect**,
I want **to edit the diagram on an embedded Excalidraw canvas, save it as a draft, and trade
requests, answers and proposals with the architect that I preview and then accept or reject**,
so that **neither of us overwrites the other. A whole-scene write would throw away whoever moved
last, and a draft that published itself would turn Save into an approval.**

## Tasks

Built on the branch (PR #13) before the milestone was imported, so it has no task contract. The
evidence is VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **Save is a draft** (ADR-004). It never rewrites ARCHITECTURE.md, the SVG or PNG, or work status.
  Saves carry an optimistic revision and take an exclusive lock.
- **Review records** live beside the draft in `diagrams/<stem>.review/{requests,proposals}/`, and
  `aof diagram scene` runs them as `request`, `respond`, `propose`, `proposals`, `accept` and
  `reject`.
- **Accept** merges only the elements a proposal touches. It refuses `diagram-proposal-stale` when
  any of them changed since the proposal was made, and it writes the scene before the record, not
  atomically (recorded in ADR-004).
- The store and the proposal shape were later reworked onto the one format (08). This story owns the
  loop, not the format.
