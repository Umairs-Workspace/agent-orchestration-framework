---
type: story
number: 14
slug: one-channel-several-projects
title: "One channel, several projects — `/loop` finds the project by the loop the scope names, and a dispatch lane is never served as a project"
parent: 131
depends: [11]
status: done
owner: product-owner
created: 2026-09-26
updated: 2026-09-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-009]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-009
  - src/mesh/presence.mjs
  - src/work-acceptor/observations.mjs
files:
  - src/discord/commands.mjs
  - src/discord/bot.mjs
  - src/loop/stop.mjs
  - test/discord/discord-commands.test.mjs
---
# 14 · One channel, several projects

## User story

As **the operator running aof across many repositories**,
I want **one Discord channel for all of them, with `/loop stop` and `/loop resume` finding the
project by the loop the scope names**,
so that **I do not need a channel per repository, or a `workspace:` option every time**.

## Tasks

- [ ] `tasks/00_the-scope-finds-the-project.feature` — with several projects on the channel and no
      `workspace:`, `/loop` takes the one with a loop on the scope; none is `discord-loop-not-found`;
      two is `discord-scope-ambiguous` naming only those two; the served list folds a dispatch lane home

## Notes

- **Asked for by the operator at 07's leg 7 (2026-09-26):** "I wanted this to work on a single
  channel as well" and "If I create one channel per repo that will get rather unwieldly". A
  `/loop stop` was refused `discord-scope-ambiguous` because the aof repository and the test-bed
  share the channel.
- **It narrows 11/01's ambiguity rule by addition.** 11's delivered `.feature` is not edited: 11
  refused ANY several-project channel without `workspace:`, and this story's contract refuses only
  a real tie. `workspace:` still picks explicitly.
- **F-131-18, for the bot:** presence had recorded the test-bed's workspace as its lane worktree
  `dispatch-04-00`. The served list now folds each member through `foldDispatchWorktree`, so a lane
  is never a project. Presence itself still records the lane's root (routed to backlog).
