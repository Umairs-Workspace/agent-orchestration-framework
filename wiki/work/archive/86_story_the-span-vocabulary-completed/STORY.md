---
type: story
number: 86
slug: the-span-vocabulary-completed
title: "The story-grained scope vocabulary is completed — no shape is silently discarded, and the prompt lane is guarded"
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-09-04
depends: [84]
schema: 1
aofVersion: 0.1.0
reads: [src/work.mjs, src/work-read.mjs, src/commands/next.mjs, src/bundle/commands/continue.md, test/work-story-span-scope.test.mjs, test/work-dispatch-lanes.test.mjs, test/arch/acd-cache-read-surface-boundary.test.mjs, wiki/work/84_story_story-span-ref/OUTCOME.md, wiki/work/TECH_DEBT.md]
files: [src/work.mjs, src/commands/next.mjs, test/work-story-span-scope.test.mjs]
---
# 86 · The span vocabulary, completed

## User story

As an operator who has learned that `aof` understands story-grained scopes,
I want every story-grained shape I type to be either obeyed or refused,
so that a mistyped scope costs me an error message rather than a session spent building another
milestone's work while believing I built mine.

## Why

Story 84 taught a story-grained scope vocabulary that only `find` fully implements. It shipped with
three open gaps, all recorded in its outcome, and this story discharges them.

**The scope is silently discarded, not refused.** `inRange` returns `() => true` for every shape it
cannot parse, so the walk falls back to the whole stream with no signal. Measured with milestones 44
(stories 01–03) and 45 present:

| typed | `aof work next` returned |
|---|---|
| `44/01-03` | `44/01, 44/02, 44/03` ✅ |
| `44/01` | `44/01, 44/02, 44/03, 45/00` |
| `44/01-03x` | `44/01, 44/02, 44/03, 45/00` |
| `44/01–02` (en-dash) | `44/01, 44/02, 44/03, 45/00` |

`findWork` answers `[]` for all three of the bad shapes, so the two surfaces disagree about what a
story-grained ref means. This is the fail-open named in **TECH_DEBT item 49**; story 84 made it
reachable by teaching operators the vocabulary.

**A finished span reports drivers it does not name.** `skippedEntries` (`src/commands/next.mjs`)
resolves a span to no named driver, so it falls to reporting every held driver in the stream: a
finished `44/01-03` with milestone 12 held elsewhere renders `Nothing free in 44/01-03 — everything
actionable is being worked elsewhere: 12 …`. The driver is sitting in the parsed scope; only the
command face's separate scope vocabulary makes it unreachable.

**The prompt half is unguarded.** No test references the span form or any of `continue.md`'s span
branch. The branch could be deleted from the shipped prompt and the 12-lane suite plus the
bundle-manifest hash test stay green — the hash detects a change to the file, not the absence of a
claim within it. `test/work-dispatch-lanes.test.mjs` lane `dispatch/02` already asserts this same
file's prose for presence *and* absence, so the pattern exists and was simply not reached for.

## Scope

Discharges the three `## Gaps` in `84_story_story-span-ref/OUTCOME.md`. Each gap's discharge condition
is the acceptance bar — this story is done when all three read `discharged`.

**Not in scope:** migrating `inRange` into `src/work-ref-scope.mjs`. That is TECH_DEBT item 49's fix
and is unbuildable at HEAD — the session driver's root-inclusive reach measures the ADR-015 §5 ceiling
of 24 exactly, so `src/work.mjs` importing any leaf reddens FF-5301. Raising that ceiling needs an ADR
this story does not pay for. Refusing a bad shape does not require moving the parser.

## Tasks

- [x] `tasks/00_an-unparsed-scope-is-refused-not-ignored.feature` — a story-grained shape that is not
      a valid span is refused, and `find` and `next` agree about what a ref means.
- [x] `tasks/01_a-span-reports-only-the-driver-it-names.feature` — the command face resolves a span to
      its one driver rather than reporting the stream.
- [x] `tasks/02_the-continue-span-branch-is-pinned.feature` — deleting the span branch from the
      shipped prompt fails a test.
