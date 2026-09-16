---
type: story
number: 02
slug: the-plan-document
title: "The plan document — one page, config-gated, the builder's brief and nobody else's"
parent: 96
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-04
depends: [01]
reads:
  - wiki/work/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-005
  - wiki/work/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-006
  - src/story-contract.mjs
  - src/bundle/commands/refine.md
  - src/bundle/agents/aof-qa.md
  - src/bundle/templates/story/STORY.md
  - src/bundle/bundle.json
files:
  - src/bundle/templates/story/PLAN.md
  - src/bundle/manifest.json
  - src/bundle/agents/aof-developer.md
  - src/work-doctor-budget.mjs
  - src/work-doctor.mjs
  - src/config-inspect.mjs
  - test/story-plan-document.test.mjs
  - test/arch/acd-plan-restates-no-declared-path.test.mjs
  - scripts/test.mjs
  - .claude/agents/aof-developer.md
  - .codex/agents/aof-developer.md
  - .opencode/agents/aof-developer.md
  - .aof/templates/work/story/PLAN.md
  - .aof/templates/work/story/STORY.md
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 02 · The plan document

## User story

As a developer agent spawned to build one story,
I want a one-page brief naming the files, the mechanism, what is out of scope and the check that
proves it works,
so that I start from what the architect already discovered instead of rediscovering it cold, at
2,059,059 cache-creation tokens a run.

## Why

The architect reads these files to draw the story boundary. The developer then reads them again, from
a cold context, five or six times a milestone. The plan is the difference between paying for that
reading once and paying for it per spawn.

The vendor guidance arrives at the same artefact from the other direction: *"the most useful specs are
self-contained: they name the files and interfaces involved, state what is out of scope, and end with
an end-to-end verification step. Time spent making the spec precise pays off more than time spent
watching the implementation."*

Two of those four are already `files:` and `reads:`. The two this story adds are **the mechanism** —
the seam, in a few sentences — and **the verification step**, which is the one thing a builder
currently infers rather than being told.

**Why one page is the feature.** SWE-agent's published ablations on the 300-instance SWE-bench Lite
subset: a 100-line file window resolved **18.0%** where the entire file resolved **12.7%**; the last
five observations resolved **18.0%** where full history resolved **15.0%**. More context measured
worse, twice, on the same benchmark. A plan longer than the diff it describes is a liability, and an
architect who cannot fit one page is describing a story that should have been split — which is a
sizing signal this stream currently has nowhere.

**Why config-gated and off by default.** It costs refine to author, and refine is already the
expensive phase. `aof-architect` is 793,788 cache-create per run. Whether the trade pays is a question
for measurement on a real milestone, not a decision to bake in — and story 00 makes it measurable.

**Why the reviewers never see it.** The entire win of story 83 was stopping agents ingesting prose,
and `aof-qa` is now the cheapest agent in the stream at 458,249 per run across twelve runs a
milestone. A per-story document every spawn reads re-creates the cost story 83 removed, at story
scale, and lands hardest on the agent that currently costs least. The plan goes to the builder alone.

## Tasks

- [x] `tasks/00_the-plan-carries-the-mechanism-and-the-check-and-no-paths.feature` — the two things the frontmatter cannot hold, and nothing that restates it: no `files:`/`reads:` key, no path-shaped literal, no file column — asserted over the shipped template and over any `PLAN.md` in the stream
- [x] `tasks/01_its-length-is-the-existing-budget-familys-business.feature` — `PLAN.md` joins `BUDGET_KEY` and `DEFAULT_BUDGETS`; over-length fires the existing `doc-over-budget` at warn and refuses only in the accepting item's scoped preflight, with no new code, severity or check
- [x] `tasks/02_off-by-default-and-the-builders-alone.feature` — `work.plan.enabled` defaults false and is validated beside the other `work.*` keys; the developer's brief names the plan and the reviewer bars state that a deviation from it is not a finding

## Notes

**One home for the file table — decided: the frontmatter, and the plan restates no path**
(ADR-005). `ready-wave.mjs` consumes `files:` and `validate.mjs` checks it, and 96/01 now derives
it; a table in `PLAN.md` would be the second list, and 15/R1's lesson is that a sanctioned fact
generalised in two places ends up living in a third. The plan carries the mechanism and the
verification step, which is exactly the half the frontmatter cannot express — and a document
forbidden from listing files has little left to be long about, so ADR-005 does most of ADR-006's
work for it.

**Advisory, with the escape that already works.** A developer that finds the plan wrong says so and
continues — the same shape as the read-set escape, which the retros show agents actually using. Add
one line to the reviewer bars: **a deviation from the plan is not a finding; the task `.feature` is
the contract.** Without it, reviewers will report "did not follow PLAN.md" as an Important finding and
the milestone will have bought a third authority to argue with.

**The template needs a manifest entry, not a bundle change.** The story type directory is already a
declared member. Note F-73-G: a leading `<!-- aof-generated -->` comment placed BEFORE frontmatter
breaks frontmatter parsing — if this document carries frontmatter, the marker goes after it.

**A hard size check — decided: the existing lane, not a refine-time stop** (ADR-006). Milestone 16
already ships per-artifact line budgets with the right ladder: `doc-over-budget` at warn on a stream
sweep, a refusal in the accepting item's scoped preflight. A refine-time stop would be authored and
evaluated by the same agent, which is the thing story 04 of this milestone argues is not a gate —
arguing both sides in one milestone is not a design. `plan: 80` lines in `DEFAULT_BUDGETS`, template
guidance at ≈60, mirroring the `feature` kind's own advisory-ahead-of-warning convention.

**Deliberately not in scope.** Making the plan mandatory, binding, or readable by any agent other than
the developer; and test selection, which derives from `files:` in story 03 and never from this
document's prose — the architect cannot know at refine which test files the developer is about to
write.
