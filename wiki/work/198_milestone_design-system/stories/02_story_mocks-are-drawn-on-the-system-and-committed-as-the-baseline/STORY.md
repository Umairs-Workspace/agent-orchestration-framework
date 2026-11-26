---
type: story
number: 02
slug: mocks-are-drawn-on-the-system-and-committed-as-the-baseline
title: "At refine a UI milestone's mocks are drawn as a Design canvas on the configured system, and once the operator approves them they are committed under mocks/ as the offline baseline"
parent: 198
depends: [00, 01]
status: not-started
owner: product-owner
created: 2026-11-17
updated: 2026-11-26
adrs: [ADR-002, ADR-005, ADR-006]
reads:
  - wiki/work/198_milestone_design-system/SPEC.md
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-001
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-002
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-003
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-005
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-006
  - wiki/work/198_milestone_design-system/RESEARCH.md#R1
  - wiki/work/198_milestone_design-system/RESEARCH.md#R2
  - wiki/work/198_milestone_design-system/RESEARCH.md#R7
  - wiki/work/archive/07_milestone_design-conformance/ARCHITECTURE.md
  - wiki/work/archive/47_milestone_fleet-repo-filter/mocks/README.md
  - packages/acd/assets/agents/aof-designer.md
  - packages/acd/assets/commands/refine.md
  - packages/acd/assets/commands/verify.md
  - packages/core/src/work/bundle-compose.mjs
  - packages/acd/assets/variants/codex/workflow.md
  - packages/acd/assets/templates/milestone/DESIGN.md
  - packages/design-system/assets/bundle.json
  - packages/design-system/src/commands.mjs
  - packages/execution/src/svg-rasterizer.mjs
  - test/arch/ui/acd-design-role-split.test.mjs
  - test/arch/ui/index.mjs
files:
  - packages/acd/assets/agents/aof-designer.md
  - packages/acd/assets/commands/refine.md
  - packages/acd/assets/commands/verify.md
  - packages/acd/assets/variants/codex/workflow.md
  - packages/design-system/assets/bundle.json
  - packages/design-system/assets/fragments/design-system/aof-designer.md
  - packages/design-system/assets/fragments/design-system/refine.md
  - packages/design-system/assets/fragments/design-system/verify.md
  - packages/design-system/src/mocks.mjs
  - packages/design-system/src/commands.mjs
  - packages/design-system/test/index.mjs
  - packages/design-system/test/mocks.suite.mjs
  - test/arch/ui/acd-design-role-split.test.mjs
  - test/arch/ui/acd-imported-mock-self-contained.test.mjs
  - test/arch/ui/index.mjs
  - test/arch/practices/acd-runtime-scoped-prose.test.mjs
  - packages/acd/assets/manifest.json
  - .claude/agents/aof-designer.md
  - .codex/agents/aof-designer.toml
  - .opencode/agents/aof-designer.md
  - .claude/commands/aof/refine.md
  - .opencode/commands/aof/refine.md
  - .agents/skills/aof-refine/SKILL.md
  - .agents/skills/aof-refine/agents/openai.yaml
  - .agents/skills/aof-refine/procedure.md
  - .claude/commands/aof/verify.md
  - .opencode/commands/aof/verify.md
  - .agents/skills/aof-verify/SKILL.md
  - .agents/skills/aof-verify/agents/openai.yaml
  - .agents/skills/aof-verify/procedure.md
  - .codex/aof/workflows/workflow-contract.md
schema: 1
aofVersion: 0.1.0
---
# 198/02 · Mocks are drawn on the system and committed as the baseline

## User story

As **the operator refining a UI milestone in a Claude project that names its design system**,
I want **the session to draw the milestone's mocks as a Design canvas on that system, hand me the
link to review, revise them from my feedback, and, once I approve, commit them under the milestone's
`mocks/` with their runtime, frames and a record of which canvas version I approved**,
so that **I stop doing the prompt, draw, import, expand, capture and README chore by hand for every
UI milestone, and the fidelity judge still has a local baseline it can trust**.

## Tasks

To be authored (`aof:refine 198/02`).

## Notes

- **Prose** (all `runtimes: ["claude"]`, via 00):
  - Refine's designer step offers a canvas when the practice is on. Without it, the step elicits
    mocks exactly as today.
  - The designer brief's fragment relates a mock to the system. Its `reference`-mode rule (raise a
    gap, never write to the system) lands here too.
  - Verify's fragment pulls back an approved canvas that has not yet been imported.
- **Slot markers this story adds:** `aof-designer.md`, and `verify.md` with its Codex twin in
  `workflow.md` (192/ADR-002 §7). With nothing on, they leave nothing behind (FF-19205).
- **Verbs:** `aof design-system mocks import` and `mocks capture` (ADR-006), on the rasterizer.
- **The designer's tools are unchanged** (FF-19803, in m07's control).
- @manual: one real canvas, drawn, approved, imported and captured, then judged CONFORMS against a
  matching build. That run also confirms RESEARCH A1–A3.
