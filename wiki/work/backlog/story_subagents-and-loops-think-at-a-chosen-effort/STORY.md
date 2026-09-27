---
type: story
number:
slug: subagents-and-loops-think-at-a-chosen-effort
title: "Subagents and loops think at a chosen effort — high by default, overridable with --thinking"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
schema: 1
aofVersion: 0.1.0
tags: [loop, agents]
reads: []
files: []
---
# Subagents and loops think at a chosen effort

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

<!-- Authored by aof:refine. -->

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
