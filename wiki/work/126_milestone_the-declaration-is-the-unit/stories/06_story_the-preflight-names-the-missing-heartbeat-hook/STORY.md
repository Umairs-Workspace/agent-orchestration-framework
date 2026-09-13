---
type: story
number: 06
slug: the-preflight-names-the-missing-heartbeat-hook
title: "The preflight names the missing heartbeat hook — a fourth check, and the count it supersedes"
parent: 126
status: done
owner: product-owner
created: 2026-09-10
updated: 2026-09-10
adrs: [ADR-007]
reads:
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-007
  - wiki/work/126_milestone_the-declaration-is-the-unit/stories/04_story_the-installer-fixes-the-daemon-environment/tasks/03_the-preflight-is-reported-not-repaired.feature
  - src/bundle/bundle.json
  - src/mesh/presence.mjs
  - src/workspace.mjs
files:
  - src/commands/mesh/desktop.mjs
  - test/mesh/desktop/mesh-desktop-install.test.mjs
  - test/mesh/desktop/mesh-desktop-run.test.mjs
  - test/mesh/desktop/mesh-desktop-preflight-heartbeat.test.mjs
  - test/mesh/desktop/index.mjs
  - test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 06 · The preflight names the missing heartbeat hook

## User story

As **the operator of the control node**,
I want **the preflight to tell me when a workspace on this node has no `claude-run-heartbeat` hook
installed**,
so that **a supervised loop there cannot silently lose its only evidence of liveness — which is what
turns a one-minute death into a declaration whose whole compute budget was spent by an idle
machine**.

Measured on this node, 2026-09-10, and it is the reason this story exists rather than a hypothetical
it guards against. A supervised loop was declared in a workspace whose `.claude/settings.json`
registers four `aofManaged` hooks and **not** `claude-run-heartbeat`. Its runtime died after roughly
one minute. With no hook there was no `heartbeatAt` on the record, so the attempt's last observed
liveness fell back to the `updatedAt` the reclaim itself wrote 8½ hours later: `aof work loop 01
--resume` halted **`deadline-exhausted, elapsedMs=30851979` against `ceilingMs=7200000`** — the
declaration permanently unresumable, which is milestone 126's own framing failure. Nothing warned,
at any point, that the evidence was missing. `aof work update --dry-run` in that workspace answers
*"Would create .claude/hooks/aof/run-heartbeat-enqueue.mjs"*, so the condition is both detectable
and fixable — it was simply never reported.

The clock is NOT what is wrong here, and this story does not touch it: `126/00`'s rule is right, and
`FF-12601`'s fixture asserting that a reclaimed attempt with no beat ends at `updatedAt` is right
given a beat exists. What was missing is a report that it does not.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_a-fourth-check-and-the-count-it-supersedes.feature` — `heartbeat-hook-installed`
      joins `PREFLIGHT_CHECKS` last; the preflight reports **four** checks in a stated order on both
      faces, superseding `126/04 task03`'s three; the check reads each workspace's own
      `.claude/settings.json` and hook file through injected seams, names every workspace that lacks
      the hook, writes nothing on any path, and fails closed when it cannot answer

## Notes

**This story exists because a delivered contract may not be edited.** `126/04 task03` asserts
"exactly three checks", "an ordered list of three" and "the same three check lines" in three
scenarios. Those are delivered acceptance criteria and stay exactly as they are — they remain the
true record of what `126/04` shipped. This story's `.feature` states the new count of four and names
the supersession, and the SUITE that implements `126/04 task03` is updated to the new count, because
tests are code and acceptance criteria are not. `FF-12607`'s control asserts the count too and moves
with it.

**The check is per WORKSPACE, like its sibling.** `workspace-identity-pinned` already enumerates this
node's workspaces and reads each one's own config; this check walks the same list and asks two
questions of each: does its `.claude/settings.json` register `aofManaged: "claude-run-heartbeat"`,
and does the file that registration names exist on disk. Both halves are needed — the aof repository
itself has the registration AND the file, and the test-bed has neither, but a registration pointing
at a missing file is the shape that fails silently at hook time.

**It reports; it does not repair.** ADR-007 §4 is unchanged: no `aof work update` is run, nothing is
written, and a failing check refuses neither verb. The remedy is named in the message.
