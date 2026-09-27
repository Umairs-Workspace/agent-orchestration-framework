---
type: story
number: 01
slug: cache-stable-launch
title: "A launch whose prefix is shareable — the four things aof never passed"
parent: 70
status: done
owner: product-owner
created: 2026-08-21
updated: 2026-08-22
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · A launch whose prefix is shareable — the four things aof never passed

## User story

As an operator paying for every phase aof spawns,
I want the spawn to **choose** its cache key — a system prompt with the per-machine sections moved
out of it, an explicit model and effort, and a deliberately-held 1-hour cache window,
so that two phases with identical configuration share a cache entry instead of each paying the
cache-*write* rate for the same prefix.

At Opus rates the same 927k tokens cost **$5.79** as cache-creates and **$0.46** as cache-reads — a
**12.6×** delta, roughly **$23 per work item** spent re-reading the world. aof currently passes no
flags at all (`src/agent-session-driver.mjs:634`), so its cache key is whatever the session happened
to default to.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_stable-prefix-flag.feature` — the spawn argv carries `--exclude-dynamic-system-prompt-sections`, alongside the append-only system prompt that is what makes it apply at all
- [x] `tasks/01_model-and-effort-chosen.feature` — `--model` and `--effort` are resolved per phase from their own config path and passed explicitly, never inherited
- [x] `tasks/02_one-hour-ttl-held.feature` — the spawn env sets the 1-hour prompt-cache window, after the IDE-attachment scrub, so billing mode cannot silently halve it

## Notes

- **The enabling condition was measured, not assumed.** STATE asked refine to verify the flag
  empirically before the design leaned on it. On the installed binary (`claude 2.1.233`) the flag's
  own help says it is *"ignored with `--system-prompt`"* — and `--system-prompt` appears **nowhere**
  in `src/**`. aof appends and has never replaced, so the flag applies. ADR-004 turns that
  condition into a control, because breaking it produces no error and no observable change.
- **Two model surfaces exist and this story owns one.** m30's `work.agents.models` is the *render-time
  role* model for Task subagents and is already shipped; this is the *session* model of the `claude`
  process aof spawns. ADR-005 keeps their config paths disjoint.
- **Independent of 70/00 by function** — this story owns the launch vector (argv + env), 70/00 owns
  the typed command. The one shared file is `src/commands/drive.mjs`; see 70/00's note.
- **No bounds.** Milestone 69 owns them (ADR-008) — and it measured that they are **unavailable on
  this path**, not merely declined: `--max-turns` is absent from `claude --help`, and
  `--max-budget-usd` works only with `--print`, which a shipped guard forbids on the worker launch.
