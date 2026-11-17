---
type: story
number: 03
slug: an-owned-system-stays-true-to-its-code
title: "When the project owns its design system, accepting a milestone re-syncs the system from the code, and drift that survives the re-sync is a finding"
parent: 198
depends: [00, 01, 02]
status: not-started
owner: product-owner
created: 2026-11-17
updated: 2026-11-17
adrs: [ADR-007]
reads:
  - wiki/work/198_milestone_design-system/SPEC.md
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-003
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-007
  - wiki/work/198_milestone_design-system/RESEARCH.md#R3
  - packages/core/assets/commands/verify.md
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/assets/templates/milestone/DESIGN.md
  - packages/design-system/assets/bundle.json
  - packages/design-system/assets/fragments/design-system/verify.md
  - packages/design-system/src/tokens.mjs
  - packages/design-system/src/commands.mjs
files:
  - packages/design-system/assets/bundle.json
  - packages/design-system/assets/fragments/design-system/verify.md
  - packages/design-system/assets/templates/milestone/DESIGN.md
  - packages/design-system/src/tokens.mjs
  - packages/design-system/src/commands.mjs
  - packages/design-system/test/tokens.suite.mjs
schema: 1
aofVersion: 0.1.0
---
# 198/03 · An owned system stays true to its code

## User story

As **the operator of a project that owns its design system** (the system is described by the
project's own code),
I want **each milestone that changes tokens or components to say so in its DESIGN.md, and accepting
it to re-sync the system from the code and then confirm that nothing drifted**,
so that **the system the next mock is drawn on is always the product as shipped, never an older
look or an edit someone made on the system's page**.

## Tasks

To be authored (`aof:refine 198/03`).

## Notes

- **Direction is code to system only** (ADR-007). The re-sync follows the Design System type's own
  merge, which keeps usage notes and edits made on the page, and lists removed tokens before
  removing them. `aof design-system check` then compares.
- **The `## Design-system changes` section** of DESIGN.md arrives as a template variant
  (192/ADR-004), so a project with the practice off keeps today's template.
- `reference` mode is untouched here; its rule landed in 02.
