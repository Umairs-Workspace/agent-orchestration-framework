---
type: milestone
number: 96
slug: the-declaration-earns-its-keep
title: "The declaration earns its keep — a derived read/write set, a build scoped to it, and a test run that matches"
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-04
depends: [97]
origin: [../../issues/proposed-fixes/MEASURED.md, ../../issues/proposed-fixes/FIX-2-the-read-contract.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 96 · The declaration earns its keep — a derived read/write set, a build scoped to it, and a test run that matches

## Objective

Story 83 put a read/write declaration on every story and it worked — **on the reviewers**. Measured
across milestone 63 and a downstream milestone of comparable size, cache-creation per agent spawn fell
from **3,082,276** to **936,394** and **874,694** — a 69.6% and 71.6% reduction. `aof-qa` is now the
most frequent agent in the stream and the cheapest per run: 458,249 cache-create, 82 turns, a **9.5
minute** median.

The builder did not follow. `aof-developer` is **53% of milestone 63's subagent cache-creation at
2,059,059 per run**, and 55% of the downstream milestone's at 1,301,673 — four and a half times a QA
run. The reason is written down in this stream's own retrospectives rather than inferred:
63/R4 records **write-set and read-set escapes across four consecutive stories**, and the downstream
retro records `files:` **short of the test lane three stories running**. A reviewer handed a short set
loses little, because it reads the diff and the criteria. A builder must reach whatever the work
actually touches, so every short set is an unplanned cold read at full price.

**The declaration is sound and the authoring of it is not.** This milestone stops asking an author to
predict a read/write set from memory and derives it from what the codebase graph and the contract's
own citations already know — then spends that accuracy twice: once on a build brief the developer can
trust, and once on a test run scoped to the same set, with the whole-tree controls moved to a
milestone gate that must actually run.

And it makes the result measurable. `aof work observe` attributes an agent run to a work item by
joining on a run record's `sessionId` (`work-observe.mjs:670-693`). The phase commands mint no run
records — `find wiki/work -type d -name runs` returns milestones 38 and 40 and nothing since — so the
join is empty and every session is counted unattributed: **408** for milestone 63, **216** downstream.
Both committed snapshots report zero runs, zero tokens and zero active time. Every figure above came
from mining the raw transcripts by hand. That is the last milestone where that is acceptable.

## Scope

In scope:
- **A derived read/write set.** `reads:` and `files:` proposed from the codebase graph's imports and
  call sites plus the contract's own citations, with the test lane included by construction, and the
  author subtracting rather than recalling. Delivered by story 01.
- **A build brief the developer is given rather than assembles** — the optional `PLAN.md`, config-gated
  off by default, one page, authored at refine by the agent that already read the files, carrying the
  file table, the mechanism, what is out of scope, and the check that proves the story works.
  Delivered by story 02.
- **A test run scoped to the story.** Selection derived from `files:` — never from prose, never
  enumerated at refine, because the tests the developer is about to write do not exist yet.
  Delivered by story 03.
- **A milestone regression gate that is load-bearing, not ceremonial.** 63/R7 is explicit that
  story-scoped suites make the milestone gate the thing that catches a control living outside the
  story's lane, and F-63-H is the escape that proved it. A gate an agent can report as passed is not
  a gate. Delivered by story 04.
- **A run record on the phase-command path**, carrying `sessionId` and the item ref, so `aof work
  observe` measures the path an operator actually drives. Delivered by story 00.

Out of scope:
- **Bounding the build run** — no agent carries `maxTurns`, `effort` or a deadline, and the largest
  single run measured is `aof-developer` on 63/03 at **8h03m wall containing 36 minutes of tool time**.
  That is the next lever by size and it is a different subject: an envelope on the agent, not a
  contract on the story. Route to its own item once story 00 makes the before/after checkable.
- **Model routing.** Every agent runs `opus` except one researcher run. QA at 458k cache-create and
  9.5 minutes, twelve times a milestone, is the obvious candidate for a cheaper model — and it is a
  frontmatter change with its own risk profile, not part of this contract.
- **Fixing the downstream repo's slow controls.** The tree-scanning fitness functions, their budgets,
  and the shared database that stops worktrees isolating anything but source belong to that stream.
  This milestone gives it the selection mechanism; it does not reach into it.
- **Making `PLAN.md` mandatory or binding.** It ships behind a config flag, off by default, advisory
  in force. A document that blocks a lane when the architect misjudged is worse than no document.
- **Reviewers reading `PLAN.md`.** Deliberate and load-bearing: the whole win of the read contract was
  stopping agents ingesting prose, and QA is currently the cheapest agent in the stream. The plan is
  the builder's, and a deviation from it is not a finding.

## Stories

<!-- Populated at break-down (`aof:refine 96`). -->

- [x] `00_story_the-run-record-on-the-skills-path` — the phase commands mint a run record, so observe measures the path we drive
- [x] `01_story_the-sets-are-derived` — `reads:`/`files:` proposed from the graph and the citations, test lane included
- [x] `02_story_the-plan-document` — the optional one-page build brief, config-gated, developer-only
- [x] `03_story_the-test-run-matches-the-story` — selection derived from `files:`
- [x] `04_story_the-regression-gate-is-mandatory` — the whole-tree run at the milestone door, on a clean checkout

## Dependencies

- **97 (chore)** — `validate` refuses a stage-2 story's honest `reads:`, so an author who declares the
  modules a sibling story will create cannot reach PASS. 62/R8 records 62/04 dropping four real
  `src/work-tune/*.mjs` entries to get green. Deriving a set is pointless while the gate refuses the
  set that derivation would produce, so this lands first.
- **83 (story)** — supplies `reads:`/`files:`, `story-contract.mjs` and `ready-wave.mjs`. Done; this
  milestone makes its declaration accurate rather than aspirational.
