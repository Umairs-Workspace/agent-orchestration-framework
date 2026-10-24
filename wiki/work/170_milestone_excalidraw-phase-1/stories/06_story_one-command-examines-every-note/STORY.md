---
type: story
number: 06
slug: one-command-examines-every-note
title: "One command examines every note — /aof:diagram-review <ref> <file> with no request id answers each open note in one session: an answer or a proposal per note"
parent: 170
status: in-review
owner: product-owner
created: 2026-10-20
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-010, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md]
files: [packages/core/assets/commands/diagram-review.md, packages/core/assets/variants/codex/workflow.md, packages/core/assets/bundle.json, packages/core/assets/manifest.json, .agents/skills/aof-diagram-review/SKILL.md, .agents/skills/aof-diagram-review/agents/openai.yaml, .claude/commands/aof/diagram-review.md, .codex/aof/workflows/workflow-contract.md, .opencode/commands/aof/diagram-review.md, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams/src/commands/scene.mjs, packages/core/test/bundle.suite.mjs, packages/core/test/bundle-runtime-variants.suite.mjs, test/diagrams/diagram-scene-review.test.mjs]
---
# 06 · One command examines every note

## User story

As **the operator, with several open notes on a diagram**,
I want **to run `/aof:diagram-review <ref> <file>` once, in any Claude session, and have every open
note examined**,
so that **a question gets a recorded answer and a change request gets a proposal waiting in the
editor's review panel, without one session per note.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **No request id means batch.** The single-id form still works.
- **Every action that answers a note takes it out of the batch.** `respond` closes it and `propose`
  marks it `proposed`, so the next batch run never answers it twice (RETROSPECTIVE R2).
- **Rendered for Claude, Codex and OpenCode** from the one bundled prompt.
- **Not verified here.** The smoke stands in for the architect with the real CLI calls the prompt
  makes. A live model's batch review is an open acceptance item (RETROSPECTIVE R3).
