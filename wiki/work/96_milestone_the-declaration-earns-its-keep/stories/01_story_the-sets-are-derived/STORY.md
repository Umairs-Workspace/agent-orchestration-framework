---
type: story
number: 01
slug: the-sets-are-derived
title: "The sets are derived, not recalled — reads and files proposed from the graph and the citations"
parent: 96
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-04
reads:
  - wiki/work/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-004
  - src/story-contract.mjs
  - src/ready-wave.mjs
  - src/graph-normalize.mjs
  - src/graph-impact.mjs
  - src/work-test-select.mjs
  - src/bundle/templates/story/STORY.md
files:
  - src/story-contract-derive.mjs
  - src/commands/validate.mjs
  - src/bundle/commands/refine.md
  - test/story-contract-derive.test.mjs
  - test/arch/acd-derivation-proposes-never-writes.test.mjs
  - test/arch/acd-codebase-grounding-no-parse.test.mjs
  - test/arch/acd-codebase-grounding-via-commands.test.mjs
  - scripts/test.mjs
  - src/bundle/manifest.json
  - .claude/commands/aof/refine.md
  - .codex/skills/aof-refine/SKILL.md
  - .opencode/commands/aof/refine.md
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 01 · The sets are derived, not recalled

## User story

As an architect authoring a story at refine,
I want the read and write sets proposed from the codebase graph and the story's own citations,
so that I subtract from a set the tooling derived instead of recalling one from memory — and the
builder that depends on it stops paying for the difference.

## Why

The declaration works. The authoring of it does not, and both facts are measured.

Story 83's read contract cut cache-creation per agent spawn from **3,082,276** to **936,394** in
milestone 63 and **874,694** downstream — a 69.6% and 71.6% reduction. It landed almost entirely on
the reviewers. `aof-qa` became the most frequent agent in the stream and the cheapest per run:
**458,249** cache-create, 82 turns, a 9.5-minute median.

`aof-developer` did not move: **53% of milestone 63's subagent cache-creation at 2,059,059 per run**,
and 55% downstream at 1,301,673. Four and a half times a QA run.

The asymmetry has a mechanism. A reviewer is handed the diff and the criteria, so a short `reads:`
costs it little. A builder must reach whatever the work actually touches, so a short set is not a
smaller context — it is an unplanned cold read at full price, plus the turns spent finding it.

And the sets are short, repeatedly, in two independent streams:

> **63/R4 — Write-set and read-set escapes recurred across four consecutive stories.** *"Four write-set
> escapes across four stories, 63/03 adding a NEW carrier species to the two already ledgered;
> read-set gaps at 63/00 and 63/01, one a hard dependency the `reads:` list omitted. The streak broke
> only at 63/04. **Why.** The sets are authored from what the author expects to touch, not from what
> the work reaches. **Lesson.** Derive the sets from the contract's own citations, and treat a repeat
> species as a tooling gap rather than a lapse of care."*

> **A downstream retro, R11** — `files:` *"was short of the test lane three stories running."*

63/R4 already names the fix. This story builds it.

**It is also load-bearing for two other stories.** `ready-wave.mjs` computes wave disjointness from
`files:`, so a short write set under-protects the partition it was built to protect. And story 03
selects the test run from `files:`, so a set short of the test lane selects no tests — which is the
downstream retro's exact finding, arriving as a silent green instead of a merge conflict.

## Tasks

- [x] `tasks/00_the-proposal-is-derived-from-three-sources-and-says-which.feature` — subject files, the graph's imports and call sites around them, and the contract's own `file:line` citations; every proposed entry carries a reason from a closed set, and an absent or unreadable graph yields a citation-only proposal that says so rather than an empty one
- [x] `tasks/01_the-test-lane-is-derived-not-recalled.feature` — a story writing a source file whose owning suite is missing from `files:` has an incomplete write set, derived by the repository's own root-and-extension rule and never inferred at build time
- [x] `tasks/02_it-proposes-and-never-writes.feature` — the author subtracts: the module holds no write path to a `STORY.md`, an author's narrowing survives a re-derivation, and the graph is read through the shipped reader and never built

## Notes

**Propose, do not impose.** The author subtracts; the tool never silently rewrites a declaration an
author wrote. An over-broad derived set costs a serialised wave, which is cheap and visible. A tool
that overwrites an author's narrowing is neither.

**Three sources, and they are already in the repository.** The codebase graph (`aof graph build`,
which refine already runs unconditionally before drawing story boundaries) gives imports and call
sites. The contract's own citations — the `file:line` references the SPEC and ADRs already carry —
give the prior art. And the test lane derives from the source set by the repository's own convention,
which is the leg the downstream retro says is missed three stories running.

**The test lane is not optional and not inferred at build time.** A story that writes `src/x.mjs` and
does not name its owning test file has an incomplete write set, whatever the author believed.

**Forward references are the known trap and chore 97 clears it first.** 62/R8: `validate` refuses a
`reads:` entry naming a path the story's own milestone has not built yet, so 62/04 dropped four real
`src/work-tune/*.mjs` entries and stood sibling `STORY.md` paths in their place to reach PASS. A
derivation that produces the honest set while the gate refuses it teaches the author to under-declare
faster than before. 97 lands first for that reason.

**Watch the trade at refine.** `aof-architect` costs 793,788 cache-create per run today. Deriving the
sets makes refine do more, and the milestone only pays if the developer's 2,059,059 falls further than
the architect's figure rises. Story 00 makes that a measurement rather than a discussion.

**Deliberately not in scope.** Enforcing the derived set at runtime, and any change to the escape
path — an agent that must read outside the set reads it and reports the contract as incomplete. The
escape is the reason a wrong set degrades rather than blocks, and the retros show agents using it.
