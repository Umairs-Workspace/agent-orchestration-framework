---
type: story
number: 03
slug: attribution-by-join
title: "One run, one item — the regex retired, and the classifier that reports zero"
parent: 68
status: done
owner: product-owner
created: 2026-08-20
updated: 2026-08-21
depends: [68/00, 68/01]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · One run, one item — the regex retired, and the classifier that reports zero

## User story

As anyone reading an observability report,
I want each agent run counted against exactly one work item, and each tool call classified by what
it actually was,
so that the totals can be added up without billing the same hours twice, and a category reading
zero means zero rather than a broken pattern.

## Why

**Two defects, one mining core, both measured.**

*The attribution defect.* `agentMatchesMilestone` (`src/work-observe.mjs:661-667`) decides which
milestone an agent run belongs to by matching **text**. The result: 18 of 143 agent rows appear in
two milestone reports, billing **7.07 h and 1,345k output tokens twice**. One 6h55m50s gap is
charged to both milestone 47 and milestone 49. Once 68/01 persists `sessionId`, attribution becomes
a join on a stored key — an agent run belongs to exactly one item because it belongs to exactly one
session, which belongs to exactly one run (ADR-005).

*The classifier defect.* `TOOLCHAIN_RE` (`src/work-observe.mjs:67-68`) matches `npm test`,
`vitest` and `jest`. This repo's own rules **forbid** `npm test`, and every real run is
`AOF_GLOBAL_HOME=$(mktemp -d) node …`, which classifies as `"bash"`. So **zero of sixty grind
reasons were toolchain-related** while a hand-written retrospective reported 33%. A classifier that
reports zero where the true figure is non-zero is worse than no classifier, because zero reads as a
finding. Reclassified by content on the same corpus: **340 test-ish calls averaging 30.5 s**, worst
at ≥600 s.

**Why they are one story.** Both live in the mining core of `src/work-observe.mjs` — a module `aof
graph impact` reports as importing **nothing** (→ 0), a self-contained leaf. They are the two ways
the miner's *core* lies about what it saw, as against 68/04's question of *what it can be asked* and
68/05's question of *whether it keeps what it found*.

**Absence is reported, never inferred.** A run with no resolvable session is reported as
unattributed, with a count. It is not guessed into a milestone and not silently dropped — a
fallback that double-counts is the defect, and a silent one is worse than a gap.

## Tasks

- [x] `tasks/00_one-run-one-item.feature` — attribution resolves through the run record's session id, no agent run lands in two items, and an unresolvable run is reported as unattributed
- [x] `tasks/01_toolchain-classifier-retired.feature` — the forbidden-command pattern is retired for classification over what the tool call actually was, and this repo's real test commands classify as such

## Notes

- **Fitness functions declared for this story:** FF-6805 and FF-6806 (`ARCHITECTURE.md` § Fitness
  functions), both landing in `test/arch/acd-observe-attribution-by-join.test.mjs`. `pending` until
  the file lands here; each owes a red probe in `VERIFICATION.md`.
- **Why a new arch-test rather than extending
  `test/arch/acd-session-attribution-single-authority.test.mjs`** — checked first, and rejected with
  a reason (ADR-005 § Alternatives): that guard governs which record owns a *session's work
  attribution* (presence vs. assignment). This story's fact is which item owns an *agent run's
  spend*. Two facts, two guards.
- **This story is sequenced behind 68/01**, not merely dependent on it: the join is testable against
  a record carrying a session id, but its live evidence needs 68/01's producer actually writing one.
- **ADR-006 governs the scope of the repair.** The miner stays as the diagnostic companion — its
  grind flag, edit↔test interleave and thrashed-file diagnostics have no OTel equivalent and are
  not touched here. Only the classifier is retired.
