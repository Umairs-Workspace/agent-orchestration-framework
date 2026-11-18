---
type: story
number: 01
slug: the-pick-is-a-model-call-a-project-can-see-and-set
title: "The pick is a model call a project can see and set — one lean claude call at haiku, run outside the project, turned off or retuned under memory.recall.pick, and named by memory status and project show"
parent: 201
depends: [00]
status: in-review
owner: product-owner
created: 2026-11-17
updated: 2026-11-17
adrs: [ADR-003, ADR-004]
reads:
  - wiki/work/201_milestone_memory-recall-pick/stories/01_story_the-pick-is-a-model-call-a-project-can-see-and-set/EXAMPLES.md
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-002
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-003
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-004
  - wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#ADR-001
  - packages/knowledge/src/memory/recall-pick.mjs
  - packages/knowledge/src/commands/memory.mjs
  - packages/execution/src/conversation-session.mjs
  - packages/execution/src/session-model.mjs
  - packages/execution/src/providers.mjs
  - packages/core/src/application/bindings/board-ui.mjs
  - packages/core/src/application/bindings/terminal-providers.mjs
  - packages/core/src/application/bindings/config-editor.mjs
  - packages/execution/test/conversation-session.suite.mjs
  - test/arch/diagrams/acd-architect-session-never-bypasses-permissions.test.mjs
  - test/bundle/core-workspace.test.mjs
files:
  - packages/execution/src/model-ask.mjs
  - packages/execution/package.json
  - packages/execution/test/index.mjs
  - packages/execution/test/model-ask.suite.mjs
  - packages/execution/test/fixtures/claude-stand-in.mjs
  - packages/core/src/application/bindings/commands/work/memory.mjs
  - packages/core/src/application/assemble.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/knowledge/src/memory-config.mjs
  - packages/knowledge/src/memory.mjs
  - packages/knowledge/test/memory-backend-config.suite.mjs
  - schemas/aof.schema.json
  - scripts/workspace-runtime-audit.json
  - test/memory/index.mjs
  - test/memory/recall-pick-model.test.mjs
  - test/memory/memory-status.test.mjs
  - test/command/work-memory-command.test.mjs
  - test/command/config-inspect.test.mjs
  - test/arch/memory/index.mjs
  - test/arch/memory/acd-recall-pick-launch.test.mjs
  - test/arch/memory/acd-memory-config-one-reader.test.mjs
  - test/arch/memory/acd-memory-node-schema.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/memory.md
  - wiki/codex-support.md
  - README.md
schema: 1
aofVersion: 0.1.0
---
# 201/01 · The pick is a model call a project can see and set

## User story

As **someone who runs aof on a project**,
I want **the pick to be one cheap `claude` call that I can see, retune or turn off, and that falls
back to the old block on a node where `claude` cannot answer**,
so that **recall gets the measured improvement where it can, and I am never surprised by a model
call I did not know about or by a recall that stalls**.

What lands (ADR-004): the one-shot call in a new execution leaf, the picker composed in core's
command binding, `memory.recall.pick` in the one config reader and the schema, the `recall:` line
in `aof memory status`, and the same facts in `aof project show`. FF-20103, FF-20104 and FF-20105
land here.

## Tasks

- [x] `tasks/00_the-pick-asks-claude-once-from-outside-the-project.feature` (R1): one `claude` process per recall, at the project's model, with no tools, the cards on stdin, and nothing of the calling session or the project in it.
- [x] `tasks/01_a-model-that-cannot-answer-leaves-the-lexical-block.feature` (R2): absent, slow, failing and garbled each give the lexical block and name their code.
- [x] `tasks/02_a-project-sets-the-pick.feature` (R3): `memory.recall.pick` turns it off or changes the model and the time limit, and a bad value is refused at its path.
- [x] `tasks/03_a-project-sees-what-the-pick-is.feature` (R4): `aof memory status` and `aof project show` name the pick, its source, and whether `claude` resolves here.
- [ ] `tasks/04_on-a-real-node-the-block-is-picked.feature` (R1, `@manual`): with the real `claude` on this node, a recall is picked inside the time limit and leaves no session behind.

## Notes

- The measured launch is in ARCHITECTURE, "Measured facts". It ran in 8 s and read 856 input
  tokens. The instruction and the card's content decide how well it picks; story 03's replay is
  what holds them to 177's numbers.
- This story adds a child process, so it owes an entry in `scripts/workspace-runtime-audit.json`,
  and a re-stamp for `config-inspect.mjs`, which holds audited calls.
