---
type: story
number: 02
slug: a-prototype-draws-its-diagrams
title: "A prototype draws its diagrams — `aof:add-diagram <prototype>` writes a brief under `## Diagrams`, draws it into `diagrams/`, and can redraw it when the wants change"
parent: 168
status: done
owner: product-owner
created: 2026-10-22
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [00, 01]
reads: [wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-006, packages/work/src/diagrams/layout.mjs, packages/work/src/commands/diagram/plan.mjs, packages/work/src/commands/diagram/export.mjs, packages/work/src/commands/diagram/file.mjs, packages/work/src/records.mjs, packages/work/src/discovery.mjs, packages/work/src/doctor/diagrams.mjs, packages/core/src/application/bindings/commands/diagram/plan.mjs, packages/core/src/application/bindings/commands/diagram/export.mjs, packages/core/assets/commands/add-diagram.md, packages/core/assets/templates/prototype/PROTOTYPE.md, packages/core/assets/bundle.json, test/diagrams/diagram-plan-command.test.mjs, test/diagrams/diagram-export-command.test.mjs, test/arch/diagrams/acd-diagram-layout-single-home.test.mjs, test/work/doctor-diagrams-lane.test.mjs]
files: [packages/work/src/diagrams/layout.mjs, packages/work/src/commands/diagram/plan.mjs, packages/work/src/commands/diagram/export.mjs, packages/core/assets/commands/add-diagram.md, packages/core/assets/variants/codex/workflow.md, packages/core/assets/manifest.json, test/diagrams/diagram-plan-command.test.mjs, test/diagrams/diagram-export-command.test.mjs, test/arch/diagrams/acd-diagram-layout-single-home.test.mjs, test/diagrams/add-diagram-command.test.mjs, packages/work/test/diagram-layout.suite.mjs, test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs, test/loop/autonomous-shell-out-prompt.test.mjs]
---
# 02 · A prototype draws its diagrams

## User story

As **the operator building a prototype**,
I want **to ask `aof:add-diagram` for a picture of what I am building, and to redraw it when
what I am building changes**,
so that **the prototype shows how it fits together without an ADR to hang the picture on, and
the picture does not go stale when the wants change.**

## Tasks

- [x] [00 · On a prototype, `aof diagram plan` and `export` take a diagram name, and a drawn diagram can be redrawn](tasks/00_plan-and-export-take-a-diagram-name.feature)
- [x] [01 · `/aof:add-diagram` takes a prototype ref, to add a diagram, draw the missing ones or redraw one](tasks/01_add-diagram-takes-a-prototype.feature)

## Notes

- **A third subject** (ADR-006 §1). `plan` and `export` check the item's type before the ADR
  checks. On a prototype, the subject is a diagram name, the brief is the prose under
  `### <name>` in `PROTOTYPE.md`, and the stem is the name. `--slug` and
  `diagram-item-delivered` do not apply. A prototype with no `### <name>` heading is refused with
  a new code naming the heading.
- **One home** (FF-13302). The prototype brief reader, stem and paths go in `layout.mjs`. The
  single-home control's sweep is extended to them, not copied.
- **The command** (ADR-006 §4). `add-diagram.md` gains the three prototype forms and keeps the
  ADR path word for word. Telling a name from a description: an argument matching an existing
  `### <name>` heading is a redraw, and anything else is a description of a new diagram.
- **Redraw overwrites** (EXAMPLES Q1, answered 2026-10-22): `diagrams/` keeps only the current
  picture; git history keeps the old one once the operator commits.
- **Ratified at Contract:** a missing heading is `diagram-name-unknown`, and `--slug` on a
  prototype is `diagram-slug-not-applicable`. A heading with no prose reuses `diagram-brief-missing`.
- **After 01** only because both stories change the bundle's shipped `manifest.json` hashes and
  the codex `workflow.md`. They share no code.
