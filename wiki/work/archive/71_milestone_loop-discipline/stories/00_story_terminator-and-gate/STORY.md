---
type: story
number: 00
slug: terminator-and-gate
title: "The build's terminator, and the free gate that runs before any reviewer is spawned"
parent: 71
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-02
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-001, wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-002, wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-008, src/loop-bounds.mjs, src/work-loop.mjs, src/commands/loop.mjs, src/bundle/commands/continue.md, src/bundle/commands/code-review.md, src/bundle/loops/build-to-green.md, src/bundle/loops/review-fix-rereview.md, test/story-context-contract.test.mjs, test/arch/acd-loop-cap-single-home.test.mjs, scripts/generate-bundle-manifest.mjs, scripts/test.mjs, src/loop-progress.mjs]
files: [src/bundle/commands/continue.md, src/bundle/commands/code-review.md, src/bundle/manifest.json, test/arch/acd-prompt-bounds-name-their-home.test.mjs, test/arch/acd-prompt-gate-ladder-parity.test.mjs, test/story-context-contract.test.mjs, scripts/test.mjs, .claude/commands/aof/continue.md, .codex/skills/aof-continue/SKILL.md, .opencode/commands/aof/continue.md, .claude/commands/aof/code-review.md, .codex/skills/aof-code-review/SKILL.md, .opencode/commands/aof/code-review.md]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The build's terminator, and the free gate that runs before any reviewer is spawned

## User story

As the operator paying for every reviewer `aof:continue` spawns,
I want the build phase to state where it stops when it stops making progress, and the free
deterministic gate to run before any expensive review lane is spawned,
so that a stuck build is reported instead of ground at, and a red tree is never reviewed by three
agents that all rediscover the same red.

## Why

Two halves of one defect: the prompt layer does not speak the bounds the runtime already enforces.

- **The build has no spoken terminator.** `continue.md`'s build step says only "until every task's
  `@executable` scenarios/rows are green". The runtime carries a failure-to-progress bound —
  `work.loop.buildNoProgressRounds` (`src/loop-bounds.mjs`) — and the prompt names it nowhere, so an
  agent driving the build inline has nothing telling it to stop when the failing count stops falling.
  Milestone 71's own `STATE.md` records why this is the right shape: *"a failure-to-progress bound
  instead of an iteration count — stop after two consecutive rounds with no reduction in the failing
  scenario count — which is a stronger condition and needs no arbitrary N."*
- **Review runs before validate.** The loop shell already walks a gate ladder before its review gate
  (`invokeGateLadder`, `src/commands/loop.mjs`): `work:validate`, then `work:doctor`, both scoped to
  the driven item, the first red rung short-circuiting. A direct `aof:continue` walks no ladder at
  all — so the free deterministic gate runs *after* the expensive lanes, or not at all.

And a third, smaller, which is what makes both durable: a numeral stated in a prompt with no home
drifts from the declaration silently. ADR-002 keeps the numeral and adds its home beside it, so a
change to `src/loop-bounds.mjs` that the prompt does not follow fails CI rather than shipping.

## Tasks

- [x] `tasks/00_the-gate-ladder-runs-first.feature` — the story lane walks validate→doctor at the
      item's own scope before spawning any reviewer, and a red rung short-circuits.
- [x] `tasks/01_the-build-says-where-it-stops.feature` — the build step states its full terminator
      including the failure-to-progress stop, and hands back rather than starting another round.
- [x] `tasks/02_a-stated-bound-names-its-home.feature` — every loop bound a bundled asset states
      carries its `work.loop.*` home, and equals that key's declared default.

## Notes

- **Do not delete the phrase `Three rounds is the hard cap`** from `continue.md` or `code-review.md`.
  `test/story-context-contract.test.mjs` asserts that literal, and no delivered 83 scenario justifies
  changing it. ADR-002 **adds** the citation beside the numeral; it never replaces the sentence.
- This story is the sole writer of `continue.md`'s build step and of the gate insertion. The review
  step's round rules are 83's and are not re-opened here.
- `src/bundle/manifest.json` is in `files:` because any bundle edit changes the whole-bundle content
  address (`scripts/generate-bundle-manifest.mjs`); `scripts/test.mjs` because an arch test that is
  imported and not spread is not registered.
- **The ladder re-runs after every fix round** (ADR-009 §A), before any re-review is admitted — and a
  **red ladder after a fix round does not consume a review round**. Without that clause ADR-001's
  safety argument for the delta re-review does not close: a fix that reddens the gate would otherwise
  be caught only by lenses ADR-007 has just decided not to re-spawn, and would burn one of three
  rounds on work no reviewer ever saw. A rung that **throws** is a red rung — `continue.md:276-279`
  already says a non-zero exit from a work verb is a stop signal, always.
- **The bundle renders to git-tracked runtime copies**, so `files:` names them: `.claude/commands/aof/`,
  `.codex/skills/aof-*/SKILL.md`, `.opencode/commands/aof/`. A bundle edit that leaves them stale is a
  three-file regression no test in service catches — FF-7106 is the ratchet, widened by ADR-009 §3.
