---
type: story
number: 03
slug: the-test-run-matches-the-story
title: "The test run matches the story — selection derived from the declared write set"
parent: 96
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-04
depends: [01]
reads:
  - wiki/work/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-007
  - src/work-test-select.mjs
  - src/work-test-changed.mjs
  - src/work-toolchain.mjs
  - src/story-contract.mjs
  - src/graph-impact.mjs
  - src/commands/resolve.mjs
files:
  - src/work-test-declared.mjs
  - src/commands/test.mjs
  - src/bundle/commands/continue.md
  - test/work-test-declared.test.mjs
  - test/arch/acd-one-selector-one-changed-set.test.mjs
  - scripts/test.mjs
  - src/bundle/manifest.json
  - .claude/commands/aof/continue.md
  - .codex/skills/aof-continue/SKILL.md
  - .opencode/commands/aof/continue.md
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 03 · The test run matches the story

## User story

As a build or review lane working one story,
I want the test command derived from that story's declared write set,
so that a fifty-minute review lane stops spending half its wall-clock re-running suites that no line
of this story could have touched.

## Why

Measured from the session transcripts, because the committed snapshots report zero (story 00):

| | this repo | a downstream repo |
|---|---:|---:|
| test wait | 3h14m / 1,243 calls | 7h19m / 902 calls |
| mean per call | 9.4s | **29.3s** |
| share of milestone span | 7.8% | 10.9% |

At milestone scale that is a modest line item. **Per run it is the largest thing in the lane**, and it
concentrates precisely on the agent story 83 made cheapest:

```
aof-qa · Behavioural review 361/04    0h39m wall   0h23m test   58.6%
aof-qa · Behavioural review 361/07    0h53m wall   0h28m test   54.3%
aof-developer · Fix round 361/06      2h01m wall   0h55m test   45.6%
aof-developer · Apply review fixes    0h46m wall   0h21m test   46.0%
```

A behavioural review that is 59% `vitest` is a review lane the operator is waiting on for no
information. And the tail is worse than the mean: test invocations are dying at the **600-second tool
ceiling** in both repos (maxima of 603.2s and 602.3s), which produces no result at all and is then
retried.

**The selection input already exists and is already checked.** `files:` is machine-readable,
`validate` holds it to account, and `ready-wave.mjs` consumes it — this makes the declaration pay for
a third time. It must not come from prose, and it must not be enumerated at refine: the architect
cannot name the test files the developer is about to write.

**What this story deliberately does not claim.** In this repo the saving is small — 7.8% of span, and
the single largest run measured (`aof-developer` on 63/03, **8h03m wall**) contains **36 minutes of
tool time, 30 of it tests: 6.3% of its own wall**. Selection is worth building for the downstream
repos and for the review lanes. It is not the answer to why a milestone takes a day.

## Tasks

- [x] `tasks/00_the-declared-write-set-is-a-changed-set-source.feature` — a story's `files:`, read through the existing parser, supplies `changed` where git supplies it today; `--story` with `--since` is refused, and an unresolvable ref is a refusal rather than an empty set
- [x] `tasks/01_a-declared-path-the-graph-does-not-know-widens.feature` — the test the developer is about to write does not exist yet, so its declared path widens under an existing widening reason and is never dropped; no fifth reason, no narrowing path, no flag to disable it
- [x] `tasks/02_one-selector-and-the-lane-that-calls-it.feature` — `selectSuites` stays the only selection authority and `TEST_SCOPES` stays three; the build and review lanes ask for `--scope impacted --story <ref>` and report the scope the run actually ran as

## Notes

**Selection is a new INPUT to the shipped selector, not a new selector** (ADR-007). Milestone 72
already shipped `src/work-test-select.mjs` — `selectSuites`, four frozen widening reasons, three
refusals — with `src/work-test-changed.mjs` as its git-backed changed-set producer and
`aof test --scope impacted|file|all` as its face. This story adds a second producer beside that one
and calls `selectSuites` unchanged. The `src/test-selection.mjs` this story originally declared is
deleted from the partition: a second selector is the "confidently wrong once" failure m72's module
exists to prevent, rebuilt beside it.

**The trap the story flagged is already handled, for free.** A declared path the graph reports
`present: false` — the test file the developer has not written yet — WIDENS under `not-in-graph`,
exactly as a file created this turn already does on the git path. Nothing new handles it, and
nothing may be added that narrows it.

**A narrowed run is only safe because story 04 exists.** 63/R7: *"The scoping trade is sound and
should stay — but it makes the milestone gate load-bearing, not ceremonial. Never accept a milestone
on story-scoped greens alone."* F-63-H is the escape that proved it — a story lane green, the failure
appearing only at the full-suite gate. Sequence 04 immediately behind this, and do not narrow the
story lane before the gate is mandatory.

**This repo already half-does it and the rule should be stated once.** The build-and-deploy rule says
never run the full suite on the control node and to run focused suites via test-array imports. That is
this story, applied by hand, in prose, on one machine.

**Whole-tree controls are not selectable and should not be attempted.** A downstream retro records
four in one milestone — a compiler control building a fresh `ts.createProgram` per row at 41s under a
5,000ms budget, a sibling at 201s for one file, a control walking ~1,900 files, and a cold
module-graph import. A control that asserts a property of the whole tree cannot be narrowed to a
story's files by definition. They belong to story 04's gate, and their budgets belong beside them.

**Deliberately not in scope.** Fixing any downstream repo's controls or its shared database — a retro
there records worktrees isolating source but not the database, so lanes contend and tests serialise
however well the wave was partitioned. That is a real cost and it is that stream's to pay. This story
ships the mechanism.
