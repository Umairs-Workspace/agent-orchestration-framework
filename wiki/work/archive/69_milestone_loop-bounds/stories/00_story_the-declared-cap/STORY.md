---
type: story
number: 00
slug: the-declared-cap
title: "The number four milestones are waiting on — declared, resolvable, and refused when it isn't"
parent: 69
status: done
owner: product-owner
created: 2026-08-21
updated: 2026-08-23
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The number four milestones are waiting on — declared, resolvable, and refused when it isn't

## User story

As the framework's own architect, blocked on four milestones that each defer the cap's value to a
milestone that did not exist,
I want the review round count, the build loop's failure bound and the attempt ceiling **named**, put
in one resolvable home, and pointed at from the loop registry that already has a slot for them,
so that milestone 54 can enforce a number instead of refusing to invent one.

Milestone 54 is `not-started` in its own words because *"it enforces a bound; it does not invent its
value"*. 53, 62 and 65 defer to the same arc. Meanwhile `.aof/loops/build-to-green.md` and
`.aof/loops/review-fix-rereview.md` both declare `ceiling: uncapped`, and `loop-ceiling-uncapped`
(`src/work-loops.mjs:299`) reports that at **warn**, gating nothing. The slot for the answer has
been sitting there, empty, the whole time.

The values are not taste. **N = 1** on review is Huang et al. (self-correction without an external
oracle is net-negative), MAST (step repetition 17.14%), and this repo's own m52 — 13
delta-application runs against 5 authoring runs, 41.8% of the milestone's tokens. Build's bound is a
*failure-to-progress* rule rather than an iteration count, because the success terminator already
exists and is correct.

## Tasks

- [x] `tasks/00_the-bounds-resolve.feature` — one leaf resolves every deadline and cap value from `work.loop.*`, with a documented default for each and a malformed value falling back rather than crashing
- [x] `tasks/01_review-round-is-one.feature` — a second review round is refused without a named blocker, and the refusal says which blocker class would admit it
- [x] `tasks/02_registry-declares-the-ceiling.feature` — no framework loop record reads `uncapped`, and a `ceiling:` pointing at a config key nothing resolves is a finding rather than a declaration
- [x] `tasks/03_the-cap-binds-the-loop.feature` — **amendment (F-6900)**: the declared review cap binds the production re-review path, the round count is counted apart from the engine cycle, and a blocker is an explicit claim rather than an inference from finding prose

## Notes

- **The one thing this story must not do is annex the two bounds that already have homes.**
  `work.dispatch.concurrency` has exactly one reader, pinned by `acd-dispatch-bound-single-home`;
  `work.autonomous.maxAttempts` has a closed reader set pinned by `acd-loop-cap-single-home`. Moving
  either into the new leaf breaks the guard that protects it. ADR-001 states this as a rule and
  FF-6901 makes it structural — the new leaf is *added to* the existing cap guard, never placed
  beside it as a sibling.
- **`work-loop.mjs` already has the enforcement vocabulary.** `cap`, `cap-exhausted`,
  `loop-bound-unresolved`, `retry-parked` and `boundedDrive` are shipped (m53). This story supplies
  the values those mechanisms were built to carry; it does not build a second decision engine.
- **Parallel-eligible from day one alongside 69/04 and 69/05.** Everything it touches has zero or
  one production dependent.
- **This story is what unblocks 54.** Say so in the outcome.
- **F-6900 — the cap was declared and never consumed (review, 2026-08-22).** `decideReviewRound`
  shipped with the three blocker classes and the exhausted-cap halt, and `src/` imports it nowhere;
  its only importer in the tree is `test/work-loop-review-bound.test.mjs`. The path that actually
  re-reviews — the `work:validate` gate after a `continue` phase, at `src/commands/loop.mjs:558`,
  decided by the findings branch of `decideLoopPhase` (`src/work-loop.mjs:326`) — re-drives on a
  non-empty findings list bounded only by the ENGINE cycle cap, and reads `work.loop.reviewRounds`
  not at all. `tasks/03` is the amendment that binds them. **The three delivered features are
  unchanged** — they are true of the leaf, and the gap was that the contract never demanded a
  consumer.
- **Two facts the amendment had to design around, both measured on this tree.** The gate's findings
  are `{ path, problem }` records (`src/commands/validate.mjs:27`), so the shipped prose classifier
  — three exact phrases in `REVIEW_FINDING_CLASSES` — can never match a real one; the blocker must
  therefore be an explicit structured claim carried alongside the findings. And the review-round
  count is a different quantity from the engine cycle the findings branch currently spends, which is
  why the cap sat declared while the loop ran unbounded.
