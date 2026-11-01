---
type: story
number: 02
slug: aof-teach-opens-and-holds-the-boundary
title: "`aof:teach` opens and holds the boundary — a Claude-only command that says what the human owns, and never writes their code on any turn"
parent: 188
depends: [01]
status: in-review
owner: product-owner
created: 2026-10-28
updated: 2026-11-01
adrs: [ADR-003, ADR-004, ADR-005, ADR-007]
reads:
  - wiki/work/188_milestone_human-led-problem-solving/SPEC.md
  - wiki/work/188_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-003
  - wiki/work/188_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-004
  - wiki/work/188_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-005
  - wiki/work/188_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-007
  - wiki/work/187_spike_guided-mode-boundary/SPIKE.md#finding
  - packages/learning/src/mode.mjs
  - packages/core/assets/commands/manual.md
  - packages/core/src/integrations.mjs
  - packages/core/src/asset-base.mjs
  - packages/core/src/work/bundle-synthesis.mjs
  - packages/core/src/work/bundle-manifest.mjs
  - scripts/generate-bundle-manifest.mjs
  - scripts/build-sea.mjs
  - scripts/install-local.mjs
  - packages/integration-hyperagent/assets/bundle.json
  - packages/integration-hyperagent/src/contribution.mjs
  - packages/work/src/effects.mjs
  - packages/core/assets/commands/review.md
  - test/arch/command/acd-integration-registry-one-home.test.mjs
files:
  - packages/core/src/practices.mjs
  - packages/core/src/work/bundle.mjs
  - scripts/sea-asset-manifest.mjs
  - packages/core/assets/manifest.json
  - packages/learning/package.json
  - packages/learning/src/contribution.mjs
  - packages/learning/assets/bundle.json
  - packages/learning/assets/commands/teach.md
  - packages/learning/test/index.mjs
  - packages/learning/test/teach-frame.suite.mjs
  - .claude/commands/aof/teach.md
  - .codex/aof/workflows/workflow-contract.md
  - .aof/aof.lock.json
  - README.md
  - docs/acd.md
  - packages/core/test/bundle.suite.mjs
  - test/bundle/bundle-asset-manifest-complete.test.mjs
  - test/bundle/core-workspace.test.mjs
  - test/arch/bundle/acd-bundle-membership.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/work/archive/142_milestone_yarn-workspace-modularization/plans/09-test-ledger.json
  - packages/learning/test/mode.suite.mjs
  - packages/learning/README.md
  - packages/core/package.json
  - packages/core/src/work/bundle-runtime.mjs
  - packages/core/test/bundle-runtime-variants.suite.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - wiki/prompt-audit.md
  - packages/core/test/hyperagent-runtime.suite.mjs
  - packages/core/test/planning-cowork-plugin.suite.mjs
  - test/arch/planning/acd-cowork-skills-from-command-source.test.mjs
  - test/arch/command/acd-cli-entry-executes.test.mjs
  - test/bundle/yarn-installation.test.mjs
  - packages/core/assets/commands/review.md
  - .claude/commands/aof/review.md
  - .opencode/commands/aof/review.md
  - .agents/skills/aof-review/SKILL.md
  - .agents/skills/aof-review/procedure.md
  - .agents/skills/aof-review/agents/openai.yaml
schema: 1
aofVersion: 0.1.0
---
# 188/02 · aof:teach opens and holds the boundary

## User story

As **an operator who types `/aof:teach <ref>`**,
I want **the session to open by telling me the mode I am in, what I own, what AOF may do and what it
will write, and then to hold that line on every later turn, never editing my files and answering
"just write it" by naming the visible way out rather than doing it**,
so that **I keep the keyboard for the whole session, and I know the boundary is the session's word,
not a lock I can lean on**.

What lands (ADR-003, ADR-004, ADR-005, ADR-007): `practices.mjs` and the bundle walking it, the
`teach` member for Claude Code only, `teach.md`'s frame (entry through the door, banner, every-turn
boundary, run and hand-back), and the docs. The help ladder and the problem-solving map are 03's.

## Tasks

- [x] 00 [aof:teach ships for Claude through the practices registry](tasks/00_teach-ships-for-claude-through-the-practices-registry.feature)
- [x] 01 [the teaching session opens and holds the boundary](tasks/01_the-teach-session-opens-and-holds-the-boundary.feature)
- [x] 02 [a teaching session never strands its run](tasks/02_a-teaching-session-never-strands-its-run.feature) — @bug, F-02 at aof:verify 188

## Notes

- `packages/core/src` gains `practices.mjs` (root-mjs ceiling 29 → 30), with the reason stated.
- `packages/work/src/effects.mjs` is in `reads:` because the command mints and closes a run (149/R3).
- Codex and OpenCode render no `teach` command (ADR-007). Only the Claude render is in `files:`.
