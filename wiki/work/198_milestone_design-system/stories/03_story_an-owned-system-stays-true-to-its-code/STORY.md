---
type: story
number: 03
slug: an-owned-system-stays-true-to-its-code
title: "When the project owns its design system, accepting a milestone re-syncs the system from the code, and drift that survives the re-sync is a finding"
parent: 198
depends: [00, 01, 02]
status: in-progress
owner: product-owner
created: 2026-11-17
updated: 2026-11-26
adrs: [ADR-005, ADR-007]
reads:
  - wiki/work/198_milestone_design-system/SPEC.md
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-001
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-003
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-005
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-007
  - wiki/work/198_milestone_design-system/RESEARCH.md#R3
  - wiki/work/198_milestone_design-system/stories/03_story_an-owned-system-stays-true-to-its-code/EXAMPLES.md
  - wiki/work/198_milestone_design-system/stories/01_story_a-project-extracts-its-design-system-and-names-it/tasks/02_tokens-reads-the-system-from-the-code.feature
  - wiki/work/198_milestone_design-system/stories/01_story_a-project-extracts-its-design-system-and-names-it/tasks/03_check-reports-drift-between-a-system-and-the-code.feature
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-002
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-004
  - packages/acd/assets/commands/verify.md
  - packages/acd/assets/variants/codex/workflow.md
  - packages/acd/assets/templates/milestone/DESIGN.md
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/src/work/bundle.mjs
  - packages/specification-by-example/assets/bundle.json
  - packages/design-system/assets/bundle.json
  - packages/design-system/assets/fragments/design-system/verify.md
  - packages/design-system/src/tokens.mjs
  - packages/design-system/src/check.mjs
  - packages/design-system/src/config.mjs
  - packages/design-system/src/commands.mjs
  - packages/design-system/test/tokens.suite.mjs
  - packages/design-system/test/practice.suite.mjs
  - test/arch/practices/acd-runtime-scoped-prose.test.mjs
  - test/arch/practices/acd-design-system-verbs-offline.test.mjs
  - test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs
files:
  - packages/design-system/assets/bundle.json
  - packages/design-system/assets/fragments/design-system/verify.md
  - packages/design-system/assets/templates/milestone/DESIGN.md
  - packages/design-system/src/tokens.mjs
  - packages/design-system/src/commands.mjs
  - packages/design-system/test/tokens.suite.mjs
  - packages/design-system/test/practice.suite.mjs
  - packages/acd/assets/commands/verify.md
  - packages/acd/assets/variants/codex/workflow.md
  - packages/acd/assets/manifest.json
  - test/arch/practices/acd-runtime-scoped-prose.test.mjs
  - .claude/commands/aof/verify.md
  - .aof/templates/work/milestone/DESIGN.md
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

- [ ] `00_the-design-template-records-design-system-changes` — R1: the practice's variant of the milestone DESIGN.md template
- [ ] `01_tokens-merge-re-syncs-a-system-from-the-code` — R2: `aof design-system tokens --merge`, the type's merge as a verb
- [ ] `02_verify-re-syncs-an-owned-system-at-accept` — R3, R4: verify's Claude-only `checks.design-system` fragment and its slot; FF-19802, FF-19804
- [ ] `03_a-real-re-sync-leaves-no-drift` — R3, R4 (@manual): one real re-sync on a probe system

## Notes

- **Direction is code to system only** (ADR-007). The re-sync follows the Design System type's own
  merge, which keeps usage notes and edits made on the page, and lists removed tokens before
  removing them. `aof design-system check` then compares.
- **The `## Design-system changes` section** of DESIGN.md arrives as a template variant
  (192/ADR-004), so a project with the practice off keeps today's template.
- `reference` mode is untouched here; its rule landed in 02. The template variant gives 02's
  `## Design-system gaps` its place beside `## Design-system changes`.
- **The merge is a verb** (`tokens --merge`, EXAMPLES Q2): merging two token files is file
  assembly, which ADR-003 keeps out of prose. The session publishes what it writes. Within
  ADR-003's verb family; no ADR changed.
