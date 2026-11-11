---
type: story
number: 02
slug: prompts-spell-aof-memory
title: "Every bundle prompt, skill and doc spells aof memory"
parent: 178
status: done
owner: product-owner
created: 2026-10-29
updated: 2026-10-29
schema: 1
aofVersion: 0.1.0
depends: [01]
reads: [wiki/work/178_milestone_memory-top-level-with-corpora/ARCHITECTURE.md#adr-003, wiki/work/178_milestone_memory-top-level-with-corpora/ARCHITECTURE.md#adr-001, packages/knowledge/src/commands/memory.mjs, test/arch/command/acd-readme-names-what-ships.test.mjs, test/arch/bundle/index.mjs, wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-002, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-007, test/arch/planning/acd-cowork-skills-from-command-source.test.mjs, test/integration/features/work-memory.feature]
files: [packages/core/assets/commands/assimilate-code.md, packages/core/assets/commands/continue.md, packages/core/assets/commands/refine.md, packages/core/assets/commands/retrospective.md, packages/core/assets/commands/shatter.md, packages/core/assets/commands/verify.md, packages/core/assets/references/workflow-contract.md, packages/core/assets/variants/codex/workflow.md, packages/core/assets/loops/retrospective-memory-ingest.md, packages/integration-hyperagent/assets/skills/aof-add-milestone/SKILL.md, packages/integration-hyperagent/assets/skills/aof-add-story/SKILL.md, packages/integration-hyperagent/assets/skills/aof-add-task/SKILL.md, packages/integration-hyperagent/assets/skills/aof-refine/SKILL.md, packages/integration-hyperagent/assets/skills/aof-shatter/SKILL.md, packages/integration-hyperagent/assets/skills/aof-validate/SKILL.md, README.md, packages/knowledge/README.md, schemas/aof.schema.json, .claude/commands/aof/assimilate-code.md, .claude/commands/aof/continue.md, .claude/commands/aof/refine.md, .claude/commands/aof/retrospective.md, .claude/commands/aof/shatter.md, .claude/commands/aof/verify.md, .opencode/commands/aof/assimilate-code.md, .opencode/commands/aof/continue.md, .opencode/commands/aof/refine.md, .opencode/commands/aof/retrospective.md, .opencode/commands/aof/shatter.md, .opencode/commands/aof/verify.md, .agents/skills/aof-assimilate-code/SKILL.md, .agents/skills/aof-continue/procedure.md, .agents/skills/aof-refine/procedure.md, .agents/skills/aof-retrospective/procedure.md, .agents/skills/aof-shatter/SKILL.md, .agents/skills/aof-verify/procedure.md, .codex/aof/workflows/workflow-contract.md, .aof/loops/retrospective-memory-ingest.md, .aof/aof.lock.json, test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, packages/core/test/planning-init.suite.mjs, packages/integration-hyperagent/test/hyperagent.suite.mjs, .agents/skills/aof-assimilate-code/agents/openai.yaml, .agents/skills/aof-continue/SKILL.md, .agents/skills/aof-continue/agents/openai.yaml, .agents/skills/aof-refine/SKILL.md, .agents/skills/aof-refine/agents/openai.yaml, .agents/skills/aof-retrospective/SKILL.md, .agents/skills/aof-retrospective/agents/openai.yaml, .agents/skills/aof-shatter/agents/openai.yaml, .agents/skills/aof-verify/SKILL.md, .agents/skills/aof-verify/agents/openai.yaml, packages/core/assets/manifest.json, .aof/aof.apply-journal.json, .opencode/agents/aof-architect.md, .opencode/commands/aof/add-diagram.md, .opencode/commands/aof/explain.md, .opencode/commands/aof/review.md, .opencode/commands/aof/prototype.md, test/arch/memory/acd-assets-spell-aof-memory.test.mjs, test/arch/memory/index.mjs, test/arch/command/acd-work-memory-routed.test.mjs]
---
# 02 · Every bundle prompt, skill and doc spells aof memory

## User story

As an agent following a bundle prompt (refine, continue, verify, retrospective, shatter, in Claude
Code, Codex or Cowork),
I want every memory step to spell `aof memory`,
so that I call the command memory actually lives under, and the alias stops being load-bearing for
every run.

## Tasks

- [x] `tasks/00_bundle-assets-spell-aof-memory.feature` — every asset and the folders rendered from it spell `aof memory`; the planner skills change spelling only (FF-17802)
- [x] `tasks/01_docs-spell-aof-memory-and-controls-read-it.feature` — README, schema and knowledge README spell `aof memory`; tests and history keep the alias; the learning-edge control reads the new spelling

## Notes

- 178/ADR-003. It depends on 01, because README lines resolve against the route table (story 125's
  control) only once `aof memory` is routed.
- The generated folders (`.claude/`, `.opencode/`, `.agents/`, `.codex/`, `.aof/loops/`) are
  re-rendered with `aof work update`, never hand-edited.
- `acd-learning-edge-reaches-every-cut` parses the prompts' `aof work memory <verb>` invocations by
  regex. It must read the new spelling, or the edge control goes vacuous.
- Hyperagent skills: spelling only, and their search substitution stays. Hand-over names the
  operator's steps: `aof work integrations hyperagent package` plus a manual re-upload, and
  `aof planning init --runtime cowork --force` plus a re-upload of the Cowork `.plugin`.
- Tests and work-stream history keep the old spelling where they test or record the alias.
- FF-17802 lands here. It matches `aof`, `work` and `memory` separated by any whitespace, so a
  line wrap cannot hide one. Measured 2026-10-29: 53 occurrences in 15 asset files.
- The new FF file moves the `test/arch/memory` budget row (allowance 0), so the budget control is
  in `files:`. (Refined as `test/arch/bundle`; moved at build, because FF-12405 leg 10 freezes
  that directory's controls at 23. STATE, 178/02 built.) That file is also in 01's and 03's `files:`, so the three serialise on it.
