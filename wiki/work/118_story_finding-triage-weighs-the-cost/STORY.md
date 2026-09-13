---
type: story
number: 118
slug: finding-triage-weighs-the-cost
title: "Finding triage weighs what a driver costs"
status: done
owner: product-owner
created: 2026-09-05
updated: 2026-09-05
depends: []
schema: 1
aofVersion: 0.1.0
# DERIVED at refine by `src/story-contract-derive.mjs`, then subtracted. The proposal was INCOMPLETE:
# `src/bundle/commands/continue.md` is prose the graph does not carry. Subtracted — `command-core`,
# `insert-shared`, `fs` (the refusal precedes the insert) and the test-lane's two non-existent
# suites. ADDED — `src/work-loop.mjs`, unreachable from a `.md` subject, holding `routeFinding`, the
# decider both bounds land in; `test/promote-finding-to-chore.test.mjs` is its traceability suite.
reads:
  - wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-003
  - wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-009
  - wiki/work/71_milestone_loop-discipline/stories/01_story_findings-become-work-items/tasks/00_the-triage-rule-routes-every-finding.feature
  - wiki/work/71_milestone_loop-discipline/stories/01_story_findings-become-work-items/tasks/01_promote-a-finding-to-a-chore.feature
  - src/work-promote/promotion.mjs
  - src/work-promote/chore-seed.mjs
  - src/commands/promote-gap-to-chore.mjs
  - src/command-error.mjs
  - src/work.mjs
  - src/work-bundle.mjs
  - scripts/generate-bundle-manifest.mjs
  - test/arch/acd-declared-writes-include-generated-siblings.test.mjs
files:
  - src/work-loop.mjs
  - src/bundle/commands/continue.md
  - src/commands/promote-finding-to-chore.mjs
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
# 118 · Finding triage weighs what a driver costs

## User story

As an operator driving milestones through `aof:continue`,
I want the review close to weigh a finding's remedy against the ceremony of the driver that would
carry it — and to fix the cheap ones in the round that found them,
so that the backlog holds work worth scheduling rather than one driver per surviving lens remark,
and reviewing a chore stops minting the next chore.

## Why

`src/bundle/commands/continue.md` `<finding_triage>` routes every surviving non-Blocker finding
through four ordered questions. Question 2 reads:

> **Is it discharged by a checklist against existing code, with no new acceptance criteria?** → a
> **top-level chore**, created by `aof work promote-finding <ref> "<title>" --remedy "…"`

and the section then states its own closure:

> **The loop creates exactly one type, in exactly one place: a `chore`, at top level.**

**Two properties make that a treadmill rather than a queue.**

1. **It routes by SHAPE, never by COST.** "Discharged by a checklist against existing code" is
   equally true of a forty-line arch test and a three-day migration. There is no size floor, so the
   cheapest remedies draw the heaviest ceremony — a driver folder, a Definition of Done, a validate
   gate, and a whole `aof:verify` session.
2. **It has no termination condition.** A chore is itself a reviewable driver, so a chore's own
   review pass runs the same triage and emits the next chore. Nothing in the block asks whether the
   remedy is smaller than the item that would carry it, and nothing caps the depth.

**Measured on this repository, 2026-09-05.** Top-level items 88–117 are 28 chores, 1 milestone,
1 spike and 8 stories. Of those chores, **23 carry a `Promotion key`** — the marker
`aof work promote-finding` writes, so they were minted by a review close rather than raised by a
human. **Six were raised while reviewing another chore**: 88, 90, 94, 95, 97 and 78/02. The
recursion is not hypothetical; it is most of the recent stream.

**The worked example is chore 101, accepted 2026-09-05.** It was itself promoted out of 78/02's
review round to add one line to `.gitattributes`. Its own review round then produced an Important
finding — the new pin had no platform-independent guard — which question 2 promoted to a top-level
**chore 118**. That remedy was a ~40-line arch test
(`test/arch/acd-loop-document-eol-pinned.test.mjs`, mirroring `acd-runs-eol-pinned`'s `check-attr`
method). At verify the operator deleted the stub and folded the remedy back into 101, where it took
one build round including its red probe. Three drivers were opened to pin one file; two of them
were the rule firing, not a person deciding.

**What this story does NOT claim.** Question 2 is not wrong to exist — deferring genuinely
chore-shaped work is what stops a capped review round dropping it. The defect is the missing cost
test and the missing depth bound, not the routing itself. Nor is this a request to delete the
existing chores: they are real work already scheduled, and this story changes the rule that mints
them, not the stream it has already produced.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine.
     Authored by `aof:refine 118` — deliberately empty at creation. -->

- [x] `tasks/00_the-cheap-remedy-is-fixed-not-scheduled.feature` — the **cost test**. `routeFinding`
      gains a cost question ahead of the checklist question, and `FINDING_ROUTINGS` grows from four
      to five with `fixed` appended last. A remedy cheaper than the driver that would carry it is
      applied at the close, creates no item, and mints no review round.
- [x] `tasks/01_a-chore-review-mints-no-chore.feature` — the **depth bound**. `routeFinding` gains
      the reviewed item's type as an additive second argument; reviewing a chore, the checklist
      question routes `amendment` into that chore's own `## Definition of Done` instead of minting a
      sibling. `aof work promote-finding` refuses the same case at the act, because the verb is
      reachable by hand. The operator's `work:promote-gap` face is untouched.

## Notes

- **The change surface is at least two homes, and refine must enumerate them.** The rule is prose in
  `src/bundle/commands/continue.md`; the act is `aof work promote-finding` (`src/work-promote/`,
  `promotion.mjs` + `chore-seed.mjs`). A cost test stated only in the prompt is a rule with no gate
  behind it — the exact defect chore 101's own review found one layer down. Whether the bound is
  enforceable in the CLI or only assertable over the prompt text is a refine question, not settled
  here.
- **A prompt change is not delivered until the rendered bundle carries it** — chore 108 records this
  repository running pre-story prompts because the rendered bundle was stale. Whatever lands here
  needs `aof work update` parity in scope.
- **Raised by:** the operator, at `aof:verify 101`, 2026-09-05 — question 3's own answer ("needs new
  acceptance criteria a `.feature` must state → story (operator)"), taken deliberately rather than
  by the loop.

### Refine (2026-09-05)

- **Both bounds are CODE — the refine answer to the question `## Notes` left open.** The rule is not
  prose-only: `routeFinding` (`src/work-loop.mjs:211`) is a pure decider, because 71/ADR-009 §B holds
  that a router stated only in prose is a claim no scenario can drive. The cost question is one more
  declared input on the finding, like `checklistDischargeable`; the depth bound is an additive second
  argument carrying the reviewed item's type. The prose follows the decider, never stands in for it.
- **The depth bound takes a SECOND gate at the verb** — `aof work promote-finding` is reachable by
  hand and all six measured recursions arrived through it. It binds the LOOP's face only, never
  `src/work-promote/`: 71/ADR-009 §1 separates the two seams at the face, which is why
  `work:promote-gap` keeps its delivered `--at`.
- **71/ADR-003 is narrowed, never contradicted**, so no superseding ADR is owed and FF-7103 is
  widened rather than retired. What IS superseded is a delivered criterion —
  `71/01/tasks/00_the-triage-rule-routes-every-finding.feature`'s "four ordered questions" and its
  un-costed chore row — and that supersession lives here. The delivered feature is not edited.
- **The four render entries in `files:` are FF-7106's requirement**, not padding; chore 108 is the
  open record of what happens when they are missed. No new suite file exists, so `scripts/test.mjs`
  is absent. No `PLAN.md` — `work.plan.enabled` is absent from config, which is false.
