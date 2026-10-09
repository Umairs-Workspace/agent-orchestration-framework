---
type: story
number: 156
slug: one-loop-selects-an-assistant-per-phase
title: "One loop selects an assistant per phase"
status: in-review
owner: product-owner
schema: 1
created: 2026-10-09
updated: 2026-10-09
reads: ["wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SPEC.md", "packages/execution/src/session-model.mjs"]
files: ["packages/contracts/src/loop-bounds.mjs", "packages/execution/src/runtime-selection.mjs", "packages/work-loop/src/", "packages/core/src/application/bindings/", "packages/mesh/src/worker-execution.mjs", "apps/ui/src/config/RuntimeSettings.tsx", "schemas/aof.schema.json", "packages/execution/test/runtime-selection.suite.mjs", "packages/work-loop/test/runtime/phases.suite.mjs", "packages/core/test/config-editor.suite.mjs", "packages/core/test/codex-ownership.suite.mjs", "test/support/runtime-loop/fixture.mjs", "test/integration/", "wiki/codex-support.md", "wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SPEC.md", "packages/work-loop/test/dispatch.test.mjs", "test/loop/loop-bounds.test.mjs", "test/loop/loop-command-wave.test.mjs", "test/arch/loop/acd-loop-concurrency-single-home.test.mjs"]
---
# 156 · One loop selects an assistant per phase

## User story

As an AOF operator, I want one `aof work loop` to refine with Codex/Astra at high
effort and implement with Claude/Sonnet at high effort, so I can use the model best
suited to each phase without manually handing work between separate commands.

## Tasks

- [x] `tasks/00_phase-selection-and-recovery.feature` — one loop selects and preserves native execution per phase.
- [x] `tasks/01_configure-and-prove-mixed-execution.feature` — configuration editing and lifecycle evidence.

## Notes

This corrects the scope of milestone 154: its explicit exclusion of mixed assistants
within one loop missed the user's intended outcome. Its single-runtime verification
remains evidence of those paths, not acceptance of this requirement.

Acceptance must cover configurable phase runtime/model/effort, a single automatic
refine/continue/verify loop, phase-specific CLI overrides, pinned recovery after
configuration changes, worker handoff, and unchanged legacy single-runtime behavior.
Review and repair inherit the implementation phase unless explicitly designed otherwise.
The concrete acceptance example is Astra/high refinement and Sonnet/high implementation
and verification, with solo mode and no manual phase handoff.
