---
type: story
number: 145
slug: loop-diagram
title: "A milestone's loop plan can be drawn — /aof:loop-diagram shows which stories the loop will build in parallel, through the one diagram engine"
status: in-review
owner: product-owner
created: 2026-10-03
updated: 2026-10-03
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/archive/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-003
  - wiki/work/archive/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-004
  - wiki/work/archive/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-005
  - packages/work/src/readiness.mjs
  - packages/work/src/records.mjs
  - packages/work/src/discovery.mjs
  - packages/work/src/story-contract.mjs
  - packages/work/src/commands/next.mjs
  - packages/work/src/commands/tasks.mjs
  - packages/work/src/commands/diagram/file.mjs
  - packages/contracts/src/loop-bounds.mjs
  - packages/work-loop/src/dispatch.mjs
  - packages/work-loop/src/commands/loop.mjs
  - packages/core/src/diagrams/generators.mjs
  - packages/core/src/diagrams/generator-diagram-design.mjs
  - packages/core/src/application/bindings/commands/next.mjs
  - packages/core/assets/commands/observe.md
  - test/diagrams/diagram-plan-command.test.mjs
  - test/diagrams/diagram-export-command.test.mjs
  - test/arch/diagrams/acd-diagram-generator-named-once.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
files:
  - packages/work/src/ready-wave.mjs
  - packages/work/src/diagrams/layout.mjs
  - packages/work/src/commands/diagram/plan.mjs
  - packages/work/src/commands/diagram/export.mjs
  - packages/core/src/application/bindings/commands/diagram/plan.mjs
  - packages/core/src/application/bindings/commands/diagram/export.mjs
  - packages/core/src/application/assemble.mjs
  - packages/core/src/cli.mjs
  - packages/core/assets/commands/loop-diagram.md
  - packages/core/assets/bundle.json
  - packages/core/assets/manifest.json
  - packages/core/test/bundle.suite.mjs
  - packages/work/test/diagram-layout.suite.mjs
  - test/work/loop-wave-plan.test.mjs
  - test/work/index.mjs
  - test/work/story-context-contract.test.mjs
  - test/diagrams/loop-diagram-command.test.mjs
  - test/diagrams/index.mjs
  - test/arch/diagrams/acd-diagram-layout-single-home.test.mjs
  - test/arch/diagrams/acd-diagram-generator-named-once.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/work/acd-number-null-safe.test.mjs
---
# 145 · A milestone's loop plan can be drawn

## User story

As **the operator debugging `aof work loop` under `refine_first`**,
I want **`/aof:loop-diagram <ref>` to draw the milestone's planned waves (which stories build
together, which are held, and why) into `<item>/execution/`**,
so that **I can see before or after a run what the loop will fan out in parallel. A story held
back by a `files:` collision or a `depends:` edge shows up on a picture, not as a cause I rebuild
from the loop-diag log after a wave has already gone wrong.**

## Tasks

- [x] `tasks/00_the-wave-plan-is-replayed-from-the-loops-own-rules.feature` — the plan replays nextWork + the files partition, held reasons, lane bound, built shading
- [x] `tasks/01_diagram-plan-loop-writes-the-plan-or-says-why-not.feature` — `aof diagram plan <ref> loop`: the three stops, loop-plan.json, the engine's instructions
- [x] `tasks/02_diagram-export-loop-writes-the-png.feature` — `aof diagram export <ref> loop` through toSvg + the rasterizer, PNG only
- [x] `tasks/03_aof-loop-diagram-draws-it-in-the-session.feature` — `/aof:loop-diagram`, FF-13301/13302 extended, a real run on 135

## Notes

- **One engine for every diagram (operator ruling, 2026-10-03).** The drawing goes through the
  same `diagram-design` generator as ADR diagrams (`packages/core/src/diagrams/`). The skill is
  agent-only: it ships `SKILL.md`, references and example HTML, with no renderer. So the drawing
  half is a Claude command run in-session. No `claude -p` spawn, and aof never draws in code.
- **Two halves:**
  - **CLI half** (an aof registry command): computes the plan and writes
    `execution/loop-plan.json` plus a brief. It answers with the generator's drawing instructions,
    the way `aof diagram plan` does: `locate` / `instructions`, with the off / generator-missing
    answers kept.
  - **Bundle half** (`/aof:loop-diagram`): the session draws `execution/loop.html` with the skill.
    The SVG/PNG export goes through the engine's `toSvg` and `rasterizeSvg`, as `aof diagram
    export` does. The CLI ships with its bundle wrapper (the work-command-implies-claude-command
    rule).
- **The plan is replayed, not re-derived.** Run `nextWork(..., { throughReview: true })` with a
  `view.meta` overlay that marks each wave's members `in-review`, then
  `partitionReadySetByDeclaredFiles` on each `readySet`, until nothing is ready. Each wave records:
  - its members;
  - its held members and why (a `files:` overlap, or an unknown write set);
  - the `depends:` edges;
  - the loop's lane bound (`work.loop.dispatch.concurrency` / `work:dispatch`'s bound).
- **The plan's limit, stated on the diagram.** The live loop re-asks as each lane finishes, not
  once per wave. So the waves are the plan if every lane in a wave finishes together, and the
  diagram has to say so.
- **Short-circuits:** each answers a clear message, writes nothing, and spends no drawing step.
  - The milestone is not refined: it has no stories, or a not-done story has no tasks. This is
    the loop's own `unrefinedStories` test.
  - `work.loop.concurrency` is not `refine_first`. `sequential` refines and builds one story at a
    time, so it has no upfront wave plan.
