---
type: story
number: 151
slug: add-diagram
title: "aof:add-diagram <work item> draws the architecture diagrams a refine left undrawn — through the same diagram plan/export the refine step uses"
status: in-progress
owner: product-owner
created: 2026-10-04
updated: 2026-10-04
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/archive/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-003
  - wiki/work/archive/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-004
  - wiki/work/archive/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-008
  - packages/core/assets/commands/loop-diagram.md
  - packages/core/assets/commands/refine.md
  - packages/work/src/commands/diagram/plan.mjs
  - packages/work/src/commands/diagram/export.mjs
  - packages/work/src/diagrams/layout.mjs
  - scripts/generate-bundle-manifest.mjs
  - test/diagrams/loop-diagram-command.test.mjs
  - test/bundle/bundle-architect-draws.test.mjs
files:
  - packages/core/assets/commands/add-diagram.md
  - packages/core/assets/bundle.json
  - packages/core/assets/manifest.json
  - .aof/aof.lock.json
  - .claude/commands/aof/add-diagram.md
  - .opencode/commands/aof/add-diagram.md
  - .codex/skills/aof-add-diagram/SKILL.md
  - packages/core/test/bundle.suite.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - test/arch/diagrams/acd-diagram-generator-named-once.test.mjs
  - test/diagrams/add-diagram-command.test.mjs
  - test/diagrams/index.mjs
---
# 151 · aof:add-diagram draws the architecture diagrams a refine left undrawn

## User story

As **the operator reading a refined item's ARCHITECTURE.md**,
I want **to run `aof:add-diagram <work item>` and get the missing ADR diagrams drawn after the
fact. That covers diagrams the refine skipped, diagrams it recorded as `diagram not drawn: <code>`,
and a diagram for an ADR I name**,
so that **a design with moving parts gets its picture without re-running the whole refine. Today
the diagram step is the architect's judgement and is "never a stop", so on several projects it is
quietly skipped and nothing brings it back. A reviewer is then left to rebuild the component and
flow picture in their head from the prose.**

## Tasks

- [ ] `tasks/00_the-bundle-ships-aof-add-diagram.feature` — renders for every runtime; the four command censuses and FF-13301 move with it
- [ ] `tasks/01_it-picks-the-adrs-a-refine-left-undrawn.feature` — R1/R2: undrawn briefs, all in one run; a named ADR, its brief drafted first; nothing to draw; already drawn
- [ ] `tasks/02_it-draws-each-through-the-diagram-steps-own-answers.feature` — R3: plan → instructions → export → paste; off, missing, delivered, PNG miss; a real run end to end

## Notes

- **Reuse only — no new capability.** The command is a manual trigger for refine's existing
  diagram step: `aof diagram plan <ref> <ADR-NNN> --slug <slug> --json`, the drawing agent follows
  the returned `instructions`, then `aof diagram export <ref> <ADR-NNN> --json` and the returned
  `block` is pasted under the brief. It is a thin bundle wrapper shaped like `aof:loop-diagram`, with
  no new CLI verb and no change to refine.
- Candidate selection: ADRs with a `### Diagram` brief but no exported block, plus
  `diagram not drawn:` lines in STATE.md. With no brief, an explicitly named ADR gets its brief
  drafted first. The ADR's design itself is never re-litigated.
- It honours the same outcomes: `enabled: false` is a no-op, and `available: false` is reported, not
  a stop. aof never edits ARCHITECTURE.md; the session pastes the returned `block`.
- The command needs CLI↔bundle parity: ship in `packages/core/assets/commands` so it reaches repos
  through `aof work update`.
