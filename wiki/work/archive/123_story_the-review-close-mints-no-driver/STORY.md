---
type: story
number: 123
slug: the-review-close-mints-no-driver
title: "The review close mints no driver"
status: done
owner: product-owner
created: 2026-09-06
updated: 2026-09-07
depends: []
schema: 1
aofVersion: 0.1.0
# DERIVED after the build rather than at refine, because the change was made in the beat the rule
# was decided. The sets are the real ones: what the decider and its two controls had to be read
# against, and what actually moved.
reads:
  - wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-003
  - wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-009
  - wiki/work/118_story_finding-triage-weighs-the-cost/tasks/00_the-cheap-remedy-is-fixed-not-scheduled.feature
  - wiki/work/118_story_finding-triage-weighs-the-cost/tasks/01_a-chore-review-mints-no-chore.feature
  - src/work-promote/promotion.mjs
  - src/commands/promote-finding-to-chore.mjs
  - src/commands/promote-gap-to-chore.mjs
  - test/support/source-slice.mjs
  - scripts/generate-bundle-manifest.mjs
files:
  - src/work/loop.mjs
  - src/commands/promote-finding-to-chore.mjs
  - src/bundle/commands/continue.md
  - test/promote-finding-to-chore.test.mjs
  - test/arch/acd-promotion-creates-one-type.test.mjs
  - src/bundle/manifest.json
  - .claude/commands/aof/continue.md
  - .codex/skills/aof-continue/SKILL.md
  - .opencode/commands/aof/continue.md
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 123 · The review close mints no driver

## User story

As an operator driving stories and milestones through `aof:continue`,
I want the review close to fix a chore-sized remedy in the round that found it and hand everything
larger back as a story shape — creating no item of its own, ever,
so that a review pass stops depositing driver folders in the stream as a side effect of being
thorough, and the only work scheduled is work a person chose to schedule.

## Why

118/00 gave the triage a cost test and 118/01 stopped a chore's review minting the next chore. Both
narrowed the creation authority; neither removed it. What survived is `routeFinding`'s question 3 —
`checklistDischargeable === true` and not cheap → a top-level chore — and it is still the loop's
open door.

**Measured on this repository, 2026-09-06.** Milestone 119's review closes minted chores 120, 121
and 122. The depth bound could not have caught them: the item under review was a milestone and a
story, not a chore, so the bound answered correctly and the chore was created anyway. The bound was
never the whole rule. The operator's rule is:

> Fix tech debt inline if it's small (a chore). Otherwise log as a story.

Question 2 is already the "small" half — a remedy cheaper than the driver that would carry it is
fixed at the close. This story deletes the other half. A checklist-shaped remedy that is *not* cheap
is not small, so it is not fixed inline; and it is not the loop's to schedule, so it becomes a story
shape handed to the operator. The loop's `creates` subset becomes empty by construction.

The cost question's own bar rises as a consequence, and that is intended rather than incidental: the
only driver left for it to weigh against is a story, which costs strictly more ceremony than the
chore it used to weigh against, so more remedies answer question 2 and are fixed in the beat that
found them. That is the operator's rule read literally.

## What this SUPERSEDES, deliberately and in the open

`118/00/tasks/00_the-cheap-remedy-is-fixed-not-scheduled.feature` maps *"is checklist-dischargeable
and not cheap"* to `chore` and delivers a routing table whose `chore` row reads
`creates: chore, owner: loop`. That feature is delivered and is therefore immutable: it is not
edited, not annotated and not tagged. The new rule lives in this story's own contract — the same
move 118/00 itself made against `71/01/tasks/00`, and 102 made against `53/01/05`.

**`FINDING_ROUTINGS` is not touched.** The exported set keeps all five members in their delivered
order, including `chore`: 118/00's *"no sixth member appears"* and *"in their prior order"* hold
unchanged. What changes is which routings the DECIDER can reach, not which routings exist — the
operator's own `work:promote-gap` still creates a chore by hand, so the routing name still names
something real.

**71/ADR-003 is narrowed to zero, not contradicted.** "The loop creates exactly one type, in exactly
one place" survives as an upper bound the loop no longer spends. `LOOP_CREATED_ITEM_TYPE` and the
`work:promote-finding` face both stay: the constant is what 118/01's depth bound compares against
and what FF-7103 pins to `PROMOTED_TYPE`, and the face stays reachable by a human exactly as
`work:promote-gap` is. Removing them would be a second change wearing this one's clothes.

## Two layers, because the prose layer has now failed twice

118/01 wrote that *"the prose layer already failed once"* and put the depth bound in both the
decider and the verb. The recurrence this story fixes says the same thing again. So the bound is
asserted where it can be driven: `routeFinding` returns `creates: null` for **every** combination of
its declared inputs, exhaustively — not for the combinations someone thought to list — and FF-7103's
prose leg asserts the block instructs no creation at all rather than merely asserting which one
creation it instructs.

## Tasks

- [x] `tasks/00_the-close-creates-nothing.feature` — a checklist-shaped remedy that is not cheap is
  handed back as a story shape; the decider's `creates` subset is empty for every input.

## Notes

The `<finding_triage>` block must stop naming a creating verb entirely. FF-7103 leg (b) currently
requires that any `aof work <verb>` the block names is `promote-finding`; with the invocation gone
the set is empty and the leg passes vacuously, so the leg is re-pointed at the stronger claim rather
than left to answer a question the block no longer poses.
