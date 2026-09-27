---
type: story
number: 83
slug: agent-layer-bounds
title: "The agent layer's four bounds — a reporting bar, a read contract, a wave partition, and a round cap"
status: done
owner: product-owner
created: 2026-08-24
updated: 2026-08-27
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/issues/proposed-fixes/FIX-1-reviewer-finding-discipline.md, wiki/issues/proposed-fixes/FIX-2-the-read-contract.md, wiki/issues/proposed-fixes/FIX-3-round-cap-and-stall-detection.md, wiki/issues/proposed-fixes/FIX-4-same-wave-file-overlap.md, wiki/issues/proposed-fixes/README.md, src/story-contract.mjs, src/ready-wave.mjs, src/commands/validate.mjs, src/commands/next.mjs, src/commands/loop.mjs, src/loop-bounds.mjs, src/work-loop.mjs, src/work.mjs, src/command-core.mjs, src/bundle/templates/story/STORY.md, src/bundle/commands/continue.md, src/bundle/commands/refine.md, src/bundle/commands/code-review.md, src/bundle/commands/add-story.md, src/bundle/commands/assimilate-code.md, src/bundle/agents/aof-developer.md, src/bundle/agents/aof-architect.md, src/bundle/agents/aof-qa.md, src/bundle/agents/aof-designer.md, src/bundle/agents/aof-security.md, src/bundle/agents/aof-compliance.md, test/story-context-contract.test.mjs, test/work-next-ready-set.test.mjs, test/work-loop-production-review-bound.test.mjs]
files: [src/story-contract.mjs, src/ready-wave.mjs, src/commands/validate.mjs, src/commands/next.mjs, src/commands/loop.mjs, src/loop-bounds.mjs, src/work-loop.mjs, test/story-context-contract.test.mjs, test/work-next-ready-set.test.mjs, test/work-loop-production-review-bound.test.mjs, test/loop-bounds.test.mjs, test/arch/acd-loop-cap-single-home.test.mjs, scripts/test.mjs, src/bundle/templates/story/STORY.md, src/bundle/commands/continue.md, src/bundle/commands/refine.md, src/bundle/commands/code-review.md, src/bundle/commands/add-story.md, src/bundle/commands/assimilate-code.md, src/bundle/agents/aof-developer.md, src/bundle/agents/aof-architect.md, src/bundle/agents/aof-qa.md, src/bundle/agents/aof-designer.md, src/bundle/agents/aof-security.md, src/bundle/agents/aof-compliance.md, src/bundle/manifest.json, wiki/issues/proposed-fixes/README.md]
---
# 83 · The agent layer's four bounds

## User story

As the operator of a work stream whose reviewers, refine passes and build waves are agents,
I want the agent layer to carry four explicit bounds — what a reviewer may report, what an agent may
read, which stories may run in one wave, and how many review rounds a story gets,
so that the loop's cost stops being set by each agent's own idea of thoroughness and becomes a
property of the framework that can be measured, argued with, and changed in one place.

## Why

`wiki/issues/proposed-fixes/` measured four unbounded surfaces and proposed a remedy for each. This
story is the assimilation of the delivered implementation of all four — the code already exists in
the working tree; nothing here re-decides it.

- **Nothing told a reviewer what NOT to report.** Five lenses were spawned, told to review, and left
  to treat their own thoroughness as the success criterion — 91 findings against 59 verification rows
  on one milestone, 19 `fix` and 18 `test` commits against 7 `feat`. → FIX-1.
- **"Read the milestone's ADRs/DESIGN" was unbounded and paid cold, per spawn.** An 87 KB
  `ARCHITECTURE.md` plus a 33 KB `STATE.md`, re-ingested by every reviewer, at a measured 538:1
  input-to-output ratio — and handed to the party whose job is to doubt the design it argues for. →
  FIX-2.
- **The direct review path could out-argue a prose cap, while Blockers could extend the runtime
  bound indefinitely.** Five consecutive commits from one run each declaring itself final; one
  `aof:continue` that ran 1h55m and delivered nothing. → FIX-3.
- **`readySet` is a `depends` set, and `depends` says nothing about files.** Two stories an architect
  had partitioned as independent both edited one file, ×9 and ×8 in a single milestone. Worktrees
  contained the corruption and left the cost. → FIX-4.

The four proposal documents are the contract; this story is the record that the contract was met.

## Tasks

- [x] `tasks/00_reviewer-reporting-bar.feature` — every reviewer lens (architect, QA, designer,
      security, compliance) ships a reporting bar: >80% confidence, a four-gate evidence checklist,
      "a clean review is a valid review", Blocker/Important/Nit severities, and a do-not-flag list.
- [x] `tasks/01_story-context-contract.feature` — the story record declares `reads:` and `files:`,
      the authoring prompts populate them, and `aof work validate` reports a malformed declaration,
      a missing read path, a drifting anchor and an entry that escapes the project root — while
      permitting an unwritten `files:` entry and leaving a story with no declaration valid.
- [x] `tasks/02_wave-partition-by-declared-writes.feature` — `aof work next --json` partitions each
      ready set by declared write sets and returns the write-disjoint `wave` plus `heldSet`; the
      prompt obeys the result rather than performing set arithmetic.
- [x] `tasks/03_bounded-review-rounds.feature` — the existing loop runtime owns the counter, default,
      structured Blocker deduplication, non-decreasing-count stop, and absolute three-round cap;
      `aof:continue` and `aof:code-review` document the same policy.

## Notes

**Assimilated, then revised from review feedback.** The first implementation existed before this
record. Operator review then moved the two deterministic decisions into code, added the developer
read contract, and added the low-confidence Blocker-question carve-out. This record ships with that
revised implementation.

**Revision after operator feedback.** `aof-developer` now carries the same read-depth and escape rule
as the review agents. `aof work next --json` owns write-set normalization and returns `wave` plus
`heldSet`. `work.loop.reviewRounds` remains the single configurable default and is clamped by an
absolute three-round runtime maximum; structured Blockers are deduplicated, persisted across resume,
and must decrease before another post-default round is admitted.

**One runtime authority.** `reviewRoundsFromConfig` resolves the configurable default in
`src/loop-bounds.mjs`; `src/commands/loop.mjs` owns the persisted counters; and
`src/work-loop.mjs` makes the admission, stall and hard-stop decisions. Prompt text is documentation
for the agents, not the enforcement mechanism.

**Only reviewer judgment remains prompt-owned.** FIX-1 can prove distribution but needs longitudinal
measurement to prove effect. The read declarations, review ceiling/stall, and write-set partition now
have executable code-level assertions in addition to their bundled instructions.

## Verification

The verification record — the evidence, the findings register, the gate result and the accept
decision — is `VERIFICATION.md` in this folder. The delivered product state is `OUTCOME.md`, and the
carried lessons are `RETROSPECTIVE.md`.
