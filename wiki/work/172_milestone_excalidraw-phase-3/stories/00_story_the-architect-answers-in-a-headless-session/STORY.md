---
type: story
number: 00
slug: the-architect-answers-in-a-headless-session
title: "The architect answers in a headless session — one stream-json claude per open diagram, its turns streamed on the diagram's events stream"
parent: 172
status: in-review
owner: product-owner
created: 2026-10-27
updated: 2026-10-27
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/172_milestone_excalidraw-phase-3/ARCHITECTURE.md#adr-001, wiki/work/172_milestone_excalidraw-phase-3/ARCHITECTURE.md#adr-002, wiki/work/172_milestone_excalidraw-phase-3/RESEARCH.md, wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-003, packages/execution/src/session-driver.mjs, packages/execution/src/providers.mjs, packages/execution/src/codex-app-server.mjs, packages/core/src/application/bindings/terminal-providers.mjs, packages/diagrams/src/layout.mjs, packages/server/src/static-serve.mjs, test/diagrams/diagram-scene-api.test.mjs, test/arch/diagrams/acd-diagrams-package-one-way.test.mjs, test/arch/session/acd-session-driver-mesh-blind.test.mjs]
files: [packages/execution/src/conversation-session.mjs, packages/execution/src/session-model.mjs, packages/execution/src/session-driver.mjs, packages/execution/package.json, packages/execution/test/conversation-session.suite.mjs, packages/execution/test/fixtures/stand-in-claude.mjs, packages/execution/test/session-model.suite.mjs, packages/execution/test/index.mjs, packages/diagrams/src/review-session.mjs, packages/diagrams/src/review-session.d.mts, packages/diagrams/src/commands/scene.mjs, packages/diagrams/package.json, packages/diagrams/test/review-session.suite.mjs, packages/diagrams/test/index.mjs, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams-ui/src/editor-state.d.mts, packages/diagrams-ui/test/editor-state.suite.mjs, packages/server/src/board-ui.mjs, packages/server/test/transports.test.mjs, packages/core/src/application/bindings/board-ui.mjs, packages/core/src/application/assemble.mjs, packages/core/assets/commands/diagram-review.md, .claude/commands/aof/diagram-review.md, .opencode/commands/aof/diagram-review.md, .agents/skills/aof-diagram-review/SKILL.md, .agents/skills/aof-diagram-review/agents/openai.yaml, .codex/aof/workflows/workflow-contract.md, packages/core/assets/variants/codex/workflow.md, packages/core/assets/manifest.json, .aof/aof.lock.json, test/diagrams/diagram-conversation-api.test.mjs, test/diagrams/diagram-scene-review.test.mjs, test/diagrams/index.mjs, test/arch/diagrams/acd-architect-session-never-bypasses-permissions.test.mjs, test/arch/diagrams/acd-diagram-review-session-one-home.test.mjs, test/arch/diagrams/acd-diagram-face-imports-nothing.test.mjs, test/arch/diagrams/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/arch/ui/acd-board-write-isolation.test.mjs, test/arch/mesh/acd-one-cost-meter.test.mjs, test/arch/work/acd-work-ui-no-core-import.test.mjs, test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs, test/loop/autonomous-shell-out-prompt.test.mjs, wiki/work/172_milestone_excalidraw-phase-3/VERIFICATION.md]
---
# 00 · The architect answers in a headless session

## User story

As **an operator asking the architect about a diagram**,
I want **the architect's session to run on the board's own server, out of sight, and its answer to
arrive on the diagram's events stream as it is written**,
so that **the editor can show the answer being written into the note's thread without opening a
terminal for every question (F-171-04).**

## Tasks

- [x] `tasks/00_stream-json-lines-become-conversation-events.feature` — the one reader of claude's stream-json output
- [x] `tasks/01_one-session-per-diagram-takes-turns-in-order.feature` — start, queue, end, and the launch that never bypasses permissions
- [x] `tasks/02_the-board-delivers-and-streams-the-turn.feature` — the conversation route, the `session` action and the stream's `conversation` events
- [x] `tasks/03_a-real-architect-answers-headless.feature` — the agent-run check against a real `claude`

## Notes

- **Two homes, one way.** `@aof/execution/conversation-session` knows `claude` and stream-json and
  nothing of diagrams; `@aof/diagrams/review-session` knows what to type and which tools to allow
  (FF-17202); core's board binding joins them for the face (ADR-001 §5, ADR-002 §1).
- **The env rule is the driver's.** `isSessionAttachmentKey` moves from `session-driver.mjs` into
  `session-model.mjs` and both launches import it; `session-driver.mjs`'s export set (FF-5302) does
  not change.
- **The editor is not touched beyond one import.** `diagramReviewInvocation` keeps its name in
  `editor-state.mjs` but imports the invocation from `review-session.mjs`; story 02 moves the editor
  onto the route.
- **Command renders.** The `diagram-review` source and its three tracked renders change together
  (171 RETROSPECTIVE R2: a bundle member declared without its renders).
- **Real session before review closes** (171 RETROSPECTIVE R1): task 03 runs a real `claude` once,
  agent-run — a small paid run, recorded in VERIFICATION.
- The execution and diagrams directory budgets each owe a raised row with its reason.
