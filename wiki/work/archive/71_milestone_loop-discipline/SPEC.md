---
type: milestone
number: 71
slug: loop-discipline
title: "Loop discipline — one review round, and findings become work items"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-09-03
depends: [68, 69]
origin: [../../planning/PRD-acd-loop-performance.md, ../../planning/RESEARCH-agent-loop-economics.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context.
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 71 · Loop discipline — one review round, and findings become work items

## Objective

The uncapped loop in aof is **review**, not build. `continue.md:108-109` gives the build step a real
terminator — *"until every task's `@executable` scenarios/rows are green"*. `continue.md:118-120`
names three review lanes and *"apply confirmed fixes"* and then says nothing at all: no round cap,
no re-review bound, no exit criterion. The only written fix loop in the layer is
`code-review.md:77-81` — *"**Repeat until no blocking finding is open**."*

What that costs is measured. In milestone 52, **thirteen agent runs existed only to re-apply ADR
deltas to contracts that had already been authored** — 38% of agent-active time and **661.6k output
tokens, 41.8% of the whole milestone**, against five authoring runs and **one** build run at 7%.
Milestone 66 recorded **five closure rounds** and *"two review rounds"* per story: 91 findings
against 59 verification rows, and round five's own record says the milestone *"was refused by the
gate milestone 66 shipped."* Nobody asked for round five.

The literature says this is not merely expensive but counterproductive. Huang et al. (ICLR 2024)
show intrinsic self-correction without an external oracle is **net-negative** — GPT-4 on GSM8K falls
95.5% → 91.5% → 89.0% across rounds, and recovers to 97.5% only with oracle labels. MAST (NeurIPS
2025) attributes **17.14%** of multi-agent failures to step repetition and **9.82%** to being unaware
of stopping conditions. Anthropic's own guidance: *"A reviewer prompted to find gaps will usually
report some, even when the work is sound… Tell the reviewer to flag only gaps that affect
correctness or the stated requirements."*

**This is not "review is too expensive."** Milestone 52's first review round found real defects, and
the downstream story that prompted this arc had a live production 500 and three fitness functions
guarding nothing found in round one. The cap belongs on **rounds**, not on review.

Three further prompt-level defects sit alongside it, each with a measured price:

- **Review concurrency is never stated.** `continue.md:85` says "spawn the builds together … and
  wait for all of them"; the review step says no such thing. Measured: `aof-architect` concurrency
  **1.00×**, serial-chain cost 30m46s; `aof-qa` 32m01s — **1h03m of pure serialisation in one
  milestone**, on a lane one sentence would have parallelised.
- **The design lane cannot succeed here.** `continue.md:129` and `verify.md:91` mandate
  `npx playwright screenshot`, which this repo's own memory records as **policy-blocked** and which
  seven artefacts corroborate; the base URL is read from `work.ui.baseUrl`, and
  `.aof/aof.config.json` has no `work.ui` key. Every UI story therefore burns three breakpoints ×
  N surfaces of failed invocations plus two agent spawns to reach an `INCONCLUSIVE` the config had
  already determined — and `continue.md:134` forbids the cheap exit. There is no renderability
  precondition anywhere in the layer.
- **`orchestrated` is static when the right answer is derivable.** `aof:continue` already computes
  the ready set from the `depends` graph. A ready set of one is knowably solo before any agent
  spawns; nothing checks, so a five-agent fan-out pays full cold-start cost for nothing.

## Scope

In scope:
- **A stop condition, written down.** Build is done when every task feature is green, typecheck and
  lint are clean, and arch tests pass. **Review is one round by default**; a second requires a
  named blocker — a production defect, a guard that protects nothing, or a contract violation.
- **Findings after round one become work items, not more rounds.** This is the load-bearing part: it
  converts an unbounded loop into a bounded one with a queue behind it.
- **Contract amendments ratify in the beat that raised them**, not after the fix round — the defect
  that made a developer re-open files it had just closed.
- **Delta re-review.** A fix loop re-reviews the fixed findings, not the full structural +
  behavioural + design pass.
- **Validate before review.** Reorder so the free deterministic gate runs first and expensive
  reviews only run on green.
- **Review lanes run concurrently, with a stagger.** Say it in `continue.md` the way `:85` says it
  for builds; stagger the spawns by a few seconds so the first warms the prefix the rest read.
- **The render lane gated on renderability.** Record the reason and skip. Adopt the
  cached-Chromium-over-CDP path that already exists in seven records and no prompt.
- **Solo vs orchestrated derived from the ready set**, not from static config.
- **Reviewers told what to report.** Gaps that affect correctness or the stated requirements —
  not everything a reviewer can find.
- **The prompt layer agrees with the runtime.** Every bound 69 enforces is spoken here in the same
  terms; the loop registry's `ceiling:` fields stop reading `uncapped`.

Out of scope:
- **Enforcing the bounds in code** — timeouts, reapers, slots, budgets — is milestone 69. This
  milestone is the prompt layer's half of the same contract.
- **The context handed to each phase** — the build brief, cache flags, model routing — is
  milestone 70.
- **Removing review lanes.** The lanes earn their keep in round one; this changes how many rounds
  they get, not how many lenses exist.
- **Prompt-layer size reduction generally.** Real (`continue.md` is 12.4 KB, of which the story
  lane is ~4.6 KB; four sites carry 10 KB of duplicated graph-grounding prose) but a separate
  concern from loop discipline.

## Stories

<!-- Broken down 2026-09-01 (`aof:refine 71 --autonomous`). Cut by ARTEFACT OWNERSHIP, not by
     concern: with a wave width of one (ADR-008) the story count IS the serial cost. All four
     declare `depends: []` — the serialisation is a write fact `files:` already carries. -->

- [x] `stories/00_story_terminator-and-gate` — the build's terminator, and the free gate that runs
      before any reviewer is spawned *(ADR-001, ADR-002; lands FF-7101, FF-7105)*
- [x] `stories/01_story_findings-become-work-items` — a finding the cap stops chasing becomes a named
      work item, or a named question for a human *(ADR-003, ADR-004; the milestone's only runtime
      work; lands FF-7103, FF-7104)*
- [x] `stories/02_story_one-review-pass` — lanes spawned together, mode read off the wave, and
      re-work confined to the delta *(ADR-006, ADR-007; declares no fitness function, by decision)*
- [x] `stories/03_story_render-lane-gated` — the render lane gated on renderability, superseding 07's
      `npx playwright` clause *(ADR-005; lands FF-7102)*

## Dependencies

- **68 (loop-telemetry)** — the cycle-count drop has to be provable, and review-round counts are
  not currently recorded anywhere.
- **69 (loop-bounds)** — the value of the cap is chosen there. This milestone speaks it; it does not
  invent it.
