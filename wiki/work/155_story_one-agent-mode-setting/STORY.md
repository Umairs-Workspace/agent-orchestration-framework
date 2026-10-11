---
type: story
number: 155
slug: one-agent-mode-setting
title: "One agent-mode setting governs every session"
status: done
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/archive/140_story_refine-defaults-to-solo/STORY.md
  - wiki/work/archive/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-001
  - packages/mesh/src/assignment-directive.mjs
  - packages/core/assets/commands/verify.md
  - packages/core/src/application/bindings/commands/drive.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - scripts/generate-bundle-manifest.mjs
files:
  - packages/contracts/src/agent-mode.mjs
  - packages/contracts/src/loop-bounds.mjs
  - packages/contracts/package.json
  - packages/work-loop/src/commands/drive.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/core/assets/commands/refine.md
  - packages/core/assets/commands/continue.md
  - packages/core/assets/commands/review.md
  - packages/core/assets/commands/autonomous.md
  - packages/core/assets/commands/assimilate-code.md
  - packages/core/assets/commands/migrate.md
  - packages/core/assets/manifest.json
  - .claude/commands/aof/refine.md
  - .claude/commands/aof/continue.md
  - .claude/commands/aof/review.md
  - .claude/commands/aof/autonomous.md
  - .claude/commands/aof/assimilate-code.md
  - .claude/commands/aof/migrate.md
  - packages/core/assets/variants/codex/workflow.md
  - .agents/skills/aof-refine/procedure.md
  - .agents/skills/aof-continue/procedure.md
  - .agents/skills/aof-review/procedure.md
  - .agents/skills/aof-autonomous/SKILL.md
  - .agents/skills/aof-assimilate-code/SKILL.md
  - .agents/skills/aof-migrate/SKILL.md
  - .agents/skills/aof-refine/SKILL.md
  - .agents/skills/aof-refine/agents/openai.yaml
  - .agents/skills/aof-continue/SKILL.md
  - .agents/skills/aof-continue/agents/openai.yaml
  - .agents/skills/aof-review/SKILL.md
  - .agents/skills/aof-review/agents/openai.yaml
  - .agents/skills/aof-autonomous/agents/openai.yaml
  - .agents/skills/aof-assimilate-code/agents/openai.yaml
  - .agents/skills/aof-migrate/agents/openai.yaml
  - .codex/aof/workflows/workflow-contract.md
  - .opencode/commands/aof/refine.md
  - .opencode/commands/aof/continue.md
  - .opencode/commands/aof/review.md
  - .opencode/commands/aof/autonomous.md
  - .opencode/commands/aof/assimilate-code.md
  - .opencode/commands/aof/migrate.md
  - .aof/aof.lock.json
  - .aof/aof.apply-journal.json
  - schemas/aof.schema.json
  - test/loop/loop-bounds.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/work/story-context-contract.test.mjs
  - test/session/agent-model-override.test.mjs
  - packages/core/test/agent-model-solo-inert.suite.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - test/arch/session/acd-session-driver-mesh-blind.test.mjs
  - test/bundle/yarn-installation.test.mjs
  - test/work/migrate-claude-command.test.mjs
---
# 155 · One agent-mode setting governs every session

## User story

As an operator configuring how AOF sessions run their roles,
I want `work.agents.mode` to govern every session, loop-driven or hand-run, with one built-in default
of solo,
so that one setting means one thing, and I never discover by reading the source that a key I set is
ignored by half the sessions it appears to cover.

## Tasks

- [x] `tasks/00_the-loop-falls-back-to-the-workspace-mode.feature` — R1: the drive composes loop key,
  else `work.agents.mode`, else `solo`; the chain and default live in `@aof/contracts/agent-mode`
- [x] `tasks/01_every-prompt-defaults-to-solo.feature` — R2: every role-spawning prompt states the
  solo default and the loop's chain; schema, renders, manifest and lock follow; verify untouched
- [x] `tasks/02_the-inert-map-notice-follows-the-default.feature` — R3: `aof config inspect` reports a
  per-role map inert under the effective solo mode, not only an explicit one

## Decisions taken at refine

- **Q1 (operator, 2026-10-06): verify stays out.** It reads no mode today and keeps spawning its
  QA, designer and developer roles. The rule covers refine, continue, review, assimilate-code,
  migrate and the autonomous wrapper session.
- **The drive composes the whole chain into a flag (Q2).** Every driven refine and continue still
  carries `--solo` or `--orchestrated`, so the loop's narration shows the mode it ran in. The
  alternative (flag only when the loop key is set, prompt resolves the rest) would leave the
  resolution to prose, and a driven command that says nothing.
- **One home for the default and the chain: `packages/contracts/src/agent-mode.mjs` (Q3).**
  `loop-bounds.mjs` declares `work.loop.*` keys and nothing else (FF-6901, and 129/07's "the home
  reads no workspace twin" case), so the fallback cannot live there. Precedent: an unset
  `work.loop.dispatch.concurrency` inherits its workspace twin at the consumer, not in the leaf.
  The new leaf imports `LOOP_AGENT_MODES` and the per-phase loop resolvers from `loop-bounds.mjs`,
  so the vocabulary keeps one home. `packages/contracts/src` grows 7 → 8; if that crosses the
  flat-layer threshold, the directory budget gains a row stating this ownership.
- **The inert-map notice follows the effective mode (Q4).** With the default solo, an unset mode
  plus a populated map is the exact state the notice exists to report.

## What this supersedes, deliberately and in the open

- 140/00 ("each prompt states its own default") and 140/01 ("the loop never inherits
  `work.agents.mode`"), and 129/ADR-001 §5's narrower fallback. 140's split table is gone.
- Story 30 task 03's "no mode set → no solo-mode notice".
- All stay delivered and untouched. The test cases backing them are re-pointed to 155 and renamed,
  as 140 did against 129/07.

## Boundary

- **The mesh directive is untouched.** `assignmentDirectiveCommand` stays flagless; a worker's
  continue now resolves solo through the prompt unless the worker's config sets a mode.
- **`aof work audit` is untouched.** It already routes an unset mode inline.
- **`decideExecutionMode` (`packages/work-loop/src/engine.mjs`) is untouched.** Its caller hands it
  the configured value; nothing here changes its inputs.
- **This repo's config is untouched.** Its `work.agents.mode: "solo"` now equals the default.
- **Overlap with 154 in flight.** 154's uncommitted work also edits `loop-bounds.mjs`,
  `config-inspect.mjs`, the schema and the directory-budget test. Build after 154 lands, or in a
  lane off `main`, and expect a rebase on those files.

## Notes

- Verification repair (2026-10-08, milestone 154 D-03): declared every tracked Codex sibling
  of the edited bundle members, including native skill entries, launcher metadata and the shared
  workflow contract. The actual FF-7106 failure was reproduced before the declaration repair.
  Focused validation passed 405 mode/driver/prompt/control cases, seven manifest/install cases
  and 35 directory/native-asset cases. Validate returned no findings; doctor is healthy with
  zero errors and three existing metadata warnings. These are focused checks, not milestone
  acceptance; the clean full gate will follow this committed batch.

- **The rule.** Every session resolves its mode through one chain:
  1. `work.loop.agents.<phase>.mode`, for loop-driven sessions only, as an override;
  2. `work.agents.mode`;
  3. one built-in default, `solo`, for every role-spawning command except verify.
- **Before (measured 2026-10-06).** The loop never read `work.agents.mode`
  (`loopAgentModeFromConfig`, `packages/contracts/src/loop-bounds.mjs:241`; `drive.mjs:122-127`).
  A hand-run refine defaulted to solo while continue and review defaulted to orchestrated
  (`refine.md:30-31`, `continue.md:46-47`, `review.md:21-22`); assimilate-code and migrate sent
  any non-solo value to orchestrated.
