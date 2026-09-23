---
type: story
number: 05
slug: the-architect-draws
title: "The architect draws — one diagram step in the architect's ADR rule and refine's Decide stage, told how by `aof diagram plan` and never by name"
parent: 133
depends: [01, 02]
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-008, ADR-002]
reads:
  - wiki/work/133_milestone_architecture-diagrams/SPEC.md
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-003
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-004
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-008
  - src/commands/diagram/plan.mjs
  - src/commands/diagram/export.mjs
  - src/bundle/agents/aof-architect.md
  - src/bundle/commands/refine.md
  - src/bundle/frozen-set.jsonc
  - src/bundle/manifest.json
  - test/bundle/bundle-asks-runnable-path.test.mjs
  - test/bundle/bundle.test.mjs
  - test/bundle/index.mjs
  - test/arch/bundle/acd-bundle-install-eol-pinned.test.mjs
  - test/arch/diagrams/acd-diagram-generator-named-once.test.mjs
files:
  - src/bundle/agents/aof-architect.md
  - src/bundle/commands/refine.md
  - src/bundle/manifest.json
  - .claude/agents/aof-architect.md
  - .claude/commands/aof/refine.md
  - .codex/agents/aof-architect.md
  - .codex/skills/aof-refine/SKILL.md
  - .opencode/agents/aof-architect.md
  - .opencode/commands/aof/refine.md
  - .aof/aof.lock.json
  - test/bundle/bundle-architect-draws.test.mjs
  - test/bundle/index.mjs
schema: 1
aofVersion: 0.1.0
---
# 05 · The architect draws

## User story

As **the architect recording an ADR at refine (spawned, or the main session in solo mode)**,
I want **my instructions to say: when a design has moving parts, write its `### Diagram` brief, ask
`aof diagram plan`, and follow what it answers (skip when off, note and continue when the
generator is missing, otherwise draw, export and paste the block)**,
so that **diagrams appear where they earn their place, the prose never names a tool, and a config
change alone decides whether refine draws**.

What lands (ADR-008): the one diagram step in `aof-architect.md` and in `refine.md`'s Decide stage.
The bundle manifest is regenerated, and the six rendered copies are refreshed by `aof work update`.
A bundle suite pins the step's three branches and that the prose names the verbs.

## Tasks

- [x] `tasks/00_the-architect-and-refine-carry-one-diagram-step.feature` — one passage in each source doc, inside the ADR authoring it extends: the judgement, the brief, `plan`'s three branches, `export` and the pasted block, solo mode; no document names the generator; six rendered copies match a fresh render; tools unchanged

## Notes

- `.aof/aof.lock.json` is under `.aof/`, which a loop lane's reconcile resets before it commits
  (memory `lane-commits-drop-aof-config`). Commit it by hand on the lane branch.
- `available: false` is never a stop. It is a STATE note, because a refine on a node without the
  generator must still finish its ADRs.
