---
type: story
number: 141
slug: subagents-and-loops-think-at-a-chosen-effort
title: "Subagents and loops think at a chosen effort — high by default, overridable with --thinking"
status: done
owner: product-owner
created: 2026-09-27
updated: 2026-09-28
schema: 1
aofVersion: 0.1.0
tags: [loop, agents]
reads:
  - wiki/work/archive/70_milestone_warm-start/ARCHITECTURE.md#ADR-005
  - src/loop-bounds.mjs
  - src/work/update.mjs
  - scripts/generate-bundle-manifest.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
files:
  - src/session-model.mjs
  - src/commands/drive.mjs
  - src/commands/loop.mjs
  - src/work/loop.mjs
  - src/loop/child-drive.mjs
  - src/loop/cycle.mjs
  - src/loop/wave.mjs
  - src/agent-session-driver.mjs
  - src/work/bundle.mjs
  - src/adapters.mjs
  - src/config-inspect.mjs
  - src/claude-settings.mjs
  - schemas/aof.schema.json
  - src/bundle/commands/continue.md
  - src/bundle/commands/refine.md
  - src/bundle/commands/verify.md
  - src/bundle/manifest.json
  - .claude/commands/aof/continue.md
  - .claude/commands/aof/refine.md
  - .claude/commands/aof/verify.md
  - .codex/skills/aof-continue/SKILL.md
  - .codex/skills/aof-refine/SKILL.md
  - .codex/skills/aof-verify/SKILL.md
  - .opencode/commands/aof/continue.md
  - .opencode/commands/aof/refine.md
  - .opencode/commands/aof/verify.md
  - .aof/aof.lock.json
  - .claude/settings.json
  - test/session/session-model.test.mjs
  - test/session/agent-model-override.test.mjs
  - test/session/agent-model-solo-inert.test.mjs
  - test/arch/session/acd-agent-model-source-map.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/unattended-launch-envelope.test.mjs
  - test/loop/work-loop-declaration.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/loop-command-narration.test.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/bundle/adapters.test.mjs
  - test/support/work-loop-story-fixtures.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/loop/acd-declaration-predicate-is-composed.test.mjs
  - test/arch/loop/acd-loop-level-l3-gated.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/bundle/claude-settings-merge.test.mjs
  - test/loop/loop-command-board-state.test.mjs
  - test/loop/loop-fix-transport-shape.test.mjs
  - test/loop/loop-record-reaches-the-redrive.test.mjs
  - test/loop/loop-resumed-redrive-declares-its-grade.test.mjs
  - test/loop/work-loop-declarations.test.mjs
  - src/run-spend-ingest.mjs
  - test/run/run-spend-ingest.test.mjs
  - test/store/cache-stable-launch.test.mjs
  - test/arch/work/acd-phase-door-not-a-driver.test.mjs
---
# 141 · Subagents and loops think at a chosen effort

## User story

As **the operator who picks which model each aof subagent and loop session runs on**,
I want **to pick how hard they think too (medium / high / extra-high). The default should be
`high`, and I should be able to override it for one run with `aof work loop --thinking
extra-high` or `/aof:continue --solo --thinking extra-high`**,
so that **effort is a decision I make and can see, like the model already is. Today a subagent
or loop session thinks at whatever Claude Code defaults to, so the same work can come out
thorough on one run and shallow on the next, and I have no setting to hold it steady or turn it
up for a hard item.**

## Tasks

- [x] 00 — one effort vocabulary, and a driven session thinks at high unless told otherwise
- [x] 01 — aof work loop --thinking sets the effort of every session the loop drives
- [x] 02 — a role can pin its own effort; an unpinned role thinks at its session's
- [x] 03 — an operator's session defaults to high, and a command's --thinking says how to set it

## Notes

What exists today (measured 2026-09-27):

- **Loop sessions**: `work.agents.session.effort` (per phase: refine / continue / verify) resolves
  in `src/session-model.mjs` and reaches the spawned `claude` as `--effort`
  (`src/agent-session-driver.mjs`). It is config only, with no CLI flag and no default. This
  repo's config does not set it.
- **Subagent models**: `work.agents.models` (role -> model) renders the `model:` frontmatter of
  `.claude/agents/aof-*.md`. Nothing renders effort.
- **Claude Code** (2.1.283): `--effort low|medium|high|xhigh|max` for a session. Agent
  frontmatter also accepts `effort:`; refine confirms this at the source before building on it.

Scope for refine to shape:

1. A role -> effort map, set up the same way as `work.agents.models`, that renders `effort:` into
   the agent frontmatter. Keep it on the role-model path, not the session path (ADR-005 split).
2. `high` as the default when nothing is configured, for loop sessions and rendered agents alike.
3. `aof work loop --thinking <level>` overrides every phase's session effort for that run.
   Subagents inherit it unless a role pins its own effort.
4. Accept `extra-high` as another name for Claude Code's `xhigh`. Pass other levels through
   unchanged and reject unknown ones at the CLI.
5. `/aof:continue --thinking` has a real limit. The command runs inside a session that has
   already started. The Agent tool takes a model but no effort, and the session's own effort
   comes from `/effort`. So the flag can only change the agent frontmatter, and Claude Code may
   only read that at session start. Refine decides whether the flag re-renders and warns, or
   just tells the operator to run `/effort <level>` first. It must never report an effort as set
   when it did not take.
