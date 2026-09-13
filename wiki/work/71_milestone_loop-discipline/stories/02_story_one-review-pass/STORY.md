---
type: story
number: 02
slug: one-review-pass
title: "One review pass — lanes spawned together, mode read off the wave, and re-work confined to the delta"
parent: 71
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-006, wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-007, wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-003, wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-008, wiki/work/70_milestone_warm-start/ARCHITECTURE.md#ADR-004, src/bundle/commands/continue.md, src/bundle/commands/refine.md, src/bundle/commands/code-review.md, src/ready-wave.mjs, src/commands/next.mjs, src/work-loop.mjs, test/story-context-contract.test.mjs, test/work-next-ready-set.test.mjs, scripts/test.mjs]
files: [src/bundle/commands/continue.md, src/bundle/commands/refine.md, src/bundle/commands/code-review.md, src/bundle/manifest.json, test/story-context-contract.test.mjs, .claude/commands/aof/continue.md, .codex/skills/aof-continue/SKILL.md, .opencode/commands/aof/continue.md, .claude/commands/aof/refine.md, .codex/skills/aof-refine/SKILL.md, .opencode/commands/aof/refine.md, .claude/commands/aof/code-review.md, .codex/skills/aof-code-review/SKILL.md, .opencode/commands/aof/code-review.md, src/work-loop.mjs]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · One review pass — lanes spawned together, mode read off the wave, and re-work confined to the delta

## User story

As the operator waiting on a review that could have finished an hour earlier,
I want the review lenses spawned concurrently rather than one after another, a wave of one story to
run inline rather than paying a fan-out that buys nothing, and a second round to re-review only the
delta it was granted for,
so that the cost of a review pass is set by the diff being judged rather than by the orchestration
around it.

## Why

Three measured costs, one theme: re-work and serialisation the prompt layer never forbade.

- **Review concurrency is never stated.** `continue.md:135` says it for builds — *"Spawn the builds
  together … and wait for all of them"* — and the review step says no such thing. Measured in
  milestone 71's `SPEC.md`: `aof-architect` concurrency **1.00×**, serial-chain cost 30m46s;
  `aof-qa` 32m01s. **1h03m of pure serialisation in one milestone**, on a lane one sentence would
  have parallelised.
- **`orchestrated` is static when the right answer is derivable.** `aof:continue` already computes
  the ready set and its write-disjoint `wave` from the `depends` graph. A wave of one is knowably
  solo *before* any agent spawns; nothing checks, so a fan-out pays full cold-start cost for a lane
  that could not have been parallel. (This milestone is itself the example — ADR-008 puts its own
  honest wave width at one.)
- **Re-work is unbounded in two directions.** Round two today re-runs the full structural +
  behavioural + design pass over a fix that touched a handful of lines; and a contract amendment
  raised after authoring is re-applied in a later beat. Milestone 52 measured the second: **thirteen
  agent runs existed only to re-apply ADR deltas to contracts that had already been authored** —
  38% of agent-active time and 661.6k output tokens, **41.8% of the whole milestone**, against five
  authoring runs and one build run at 7%.

## Tasks

- [x] `tasks/00_the-lanes-are-spawned-together.feature` — the review lenses spawn concurrently with a
      stagger and are waited on together, in the same terms the build fan-out already uses.
- [x] `tasks/01_a-wave-of-one-runs-inline.feature` — execution mode is derived from the wave the CLI
      answered, and never adds fan-out against a solo setting.
- [x] `tasks/02_round-two-reviews-the-delta.feature` — a granted second round re-spawns only the
      lens(es) that raised a surviving Blocker, over the fix diff and the cited clauses.
- [x] `tasks/03_an-amendment-ratifies-in-its-own-beat.feature` — the ADR set closes before the
      contract fan-out, and a later delta is a finding routed by the triage rule, never a re-authoring
      wave.

## Notes

- **This story declares no fitness function, by decision** (ADR-006, ADR-007). "The lanes are spawned
  together", "the stagger is applied", "a wave of one runs inline" and "round two spawns only the
  lenses that raised a Blocker" are observable behaviours over a seam — a grep for the word
  "together" in a prompt would be a control that proves nothing. They belong here, in the contract.
- **The stagger is prose, not a knob.** It is deliberately not a ninth `work.loop.*` bound: a spawn
  ordering hint with no declared range is nothing `61/ADR-009`'s range probe could evaluate.
- **What this story does not touch:** no cache flag, no model routing, no session resume.
  `70/ADR-004` owns the flag and `70/ADR-008` owns "a review phase never resumes a build session".
- The round *cap* itself is 83's and stays exactly as written — including the literal
  `Three rounds is the hard cap`, which `test/story-context-contract.test.mjs` asserts.
- **The mode derivation lands as CODE** (ADR-009 §B): `decideExecutionMode()` joins `routeFinding()`
  as an additive pure decider in `src/work-loop.mjs`, shared with 71/01. The shared write costs
  nothing — ADR-008 already puts the wave width at one.
- **Preserve two literals verbatim.** `test/story-context-contract.test.mjs:188-189` pins
  "Do not recompute or widen `wave`" and "never substitute `readySet` for `wave`", which sit in
  `continue.md:126-128` — the exact paragraph the mode derivation edits. This is the highest-risk
  adjacency in the milestone.
- **One deduplicated Blocker re-spawns exactly one lens** (ADR-009 §F), chosen by claim class; on
  ambiguity, the lens whose report survived reproduction.
