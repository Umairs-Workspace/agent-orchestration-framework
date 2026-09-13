---
type: story
number: 06
slug: the-ledger-binds-the-build-loop
title: "The progress ledger stops being prose — the leaf 69/03 built, reached from the loop that needs it"
parent: 69
status: done
owner: product-owner
created: 2026-08-23
updated: 2026-08-23
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 06 · The progress ledger stops being prose — the leaf 69/03 built, reached from the loop that needs it

## User story

As the framework paying for runs that are busy and getting nowhere,
I want the progress ledger 69/03 delivered to be **called by the build loop**, so a stalled attempt
is actually reset, a repeatedly-reset attempt is actually escalated, and a build that has stopped
reducing its failing count actually halts,
so that the one signal that would have caught the two 11h07m burns is a property of the runtime
rather than a module that passes its own tests.

**This story exists because of finding F-69-V7**, raised at `aof:verify 69` (see the milestone
`VERIFICATION.md` § Findings and § Production-consumer audit). `src/loop-progress.mjs` resolves,
validates, and passes 23 green assertions — and has **zero importers in `src/`**. All nine exports
(`progressSample`, `sampleWorktreeProgress`, `progressLedgerPath`, `appendProgressSample`,
`readProgressSamples`, `madeProgress`, `progressPolicyFromConfig`, `evaluateProgressPolicy`,
`decideBuildProgress`) are unreferenced outside their own module. `src/work-loop.mjs` — the loop
shell — contains no progress, stall or failing-count logic at all, and nothing in `src/` reads or
writes the `runs/<runId>.progress.ndjson` ledger.

That is the milestone's own opening diagnosis reproduced inside the story written to end it:
*"The heartbeat is a producer nobody calls"*, *"The concurrency bound is prose"*. ADR-005's
Consequences assert the runtime effect — *"The one signal that would have caught the 22 hours
exists"* — and today it does not.

## Tasks

<!-- Authored at `aof:refine 69/06` (2026-08-23). Both tasks are **amendments (F-69-V7)**: the
     delivered 69/03 features are NOT edited, and this story adds the caller they never demanded —
     exactly as 69/00's `03_the-cap-binds-the-loop.feature` amendment closed F-6900. The split is
     producer then consumer: 00 makes the ledger exist at runtime, 01 makes the loop act on it. -->

- [x] `tasks/00_the-loop-writes-the-ledger.feature` — **amendment (F-69-V7)**: a production build round takes a progress sample from the tree it drove and appends it to the run's own `runs/<runId>.progress.ndjson` sibling; the run record gains nothing, a sample that cannot be taken degrades the round rather than failing it, a round with no failing count appends no sample at all, and this repo declares the rubric that keeps the ledger from being wired-but-dormant
- [x] `tasks/01_the-ledger-halts-the-build-and-resets-the-attempt.feature` — **amendment (F-69-V7)**: the loop resets a stalled attempt carrying its summary, escalates instead of resetting again at the reset bound, and halts a build that has stopped reducing its failing count — with the count read from `work:grade`'s own `cases.failed`, an indeterminate grade read as absent rather than zero, the sample policy consulted before the failing-count bound, and the declared `build-to-green` ceiling owing a consumer rather than a resolvable pointer

## Notes

- **The precedent is inside this milestone.** F-6900 was the identical defect on 69/00: the review
  cap shipped as a decision leaf whose only importer was its own test. It was triaged as a contract
  gap, and closed by an amendment task (`03_the-cap-binds-the-loop.feature`) that bound the declared
  cap to the production re-review path — **not** by editing the three delivered features, which were
  all true of the leaf and none of which demanded a caller. This story is that remedy applied to
  69/03. `decideReviewRound` → `src/work-loop.mjs:180` → `src/commands/loop.mjs` is the worked
  example of the shape to copy.
- **Nothing in 69/03 is wrong; it is unreached.** The leaf's behaviour is contracted and green, its
  fitness control FF-6906 is green with a recorded red probe, and ADR-005's design (deterministic
  proxies, no model judge, append-only sibling file invisible to `readRuns`) stands. The missing
  piece is exclusively the call site.
- **`build-to-green.md` declares `ceiling: [config:work.loop.buildNoProgressRounds]`** — a config
  pointer that FF-6902 confirms *resolves*. A resolvable pointer is a declaration, not a caller, and
  FF-6902 is satisfied either way. Whatever guard this story lands should be able to tell those two
  states apart, which is the generalisation of F-6900 the milestone did not make the first time.
- **`laneChanges(worktreePath)` already exists** in `work-dispatch.mjs` and is already in service for
  the lane sweep; `sampleWorktreeProgress` is built on it. The caller does not need a new measurement
  source.
- **Scope discipline.** This story wires an existing leaf. It does not redesign the policy, does not
  add a key to `src/run-store.mjs` (FF-6908 is a negative control over that file and must stay
  green), and does not touch the delivered 69/03 features.
- **Decided at refine (2026-08-23), by the operator, from the developer's feasibility pass.**
  (a) **The failing count comes from `work:grade` invoked directly** for its `cases.failed`, not from
  the declared-but-unwalked `work:grade` rung in `GATE_ORDER` — wiring that rung and its verdict→act
  routing is **54/03's** contract and is in flight, so 69/06 reads one number and touches
  `invokeGateLadder` not at all. The gate ladder's own findings were rejected as a substitute: they
  report on documents, so a story with a clean contract and twelve red scenarios yields zero
  findings, which `decideBuildProgress` reads as a finished build.
  (b) **This repo declares a `work.rubric`** as part of this story. Without one every round grades
  `indeterminate`, `progressSample` refuses a sample with no failing count, and the ledger would be
  wired but never written on the very tree that raised F-69-V7.
  (c) **69/06 absorbs 69/02's stop-vocabulary debt** while widening the same array for its own stops.
- **Two arch assertions are ALREADY red in this working tree, and are not 69/06's doing.** 69/02
  added `deadline-exhausted` to `LOOP_STOPS` (`src/work-loop.mjs:25`, uncommitted) without widening
  the two frozen literals that pin it — `test/arch/acd-loop-probe-contract.test.mjs:14` and
  `test/work-loop-stop-set.test.mjs:32`. Both were run in isolation at refine and both FAIL. Three
  literals must move in step, and **54/03 independently claims the same array** for a
  `grade-indeterminate` stop. Whoever builds this reconciles all three, not one.
- **Two measurement hazards found at refine, both silent rather than loud.** `readBuildBaseline`
  returns a `write-tree` **tree** hash, not a commit; passing it to `sampleWorktreeProgress` as
  `baseCommit` makes `git rev-list --count <tree>..HEAD` return the whole repository history with
  exit 0 (measured: 234) — a plausible constant that never moves. The HEAD sha is already computed
  and discarded at `src/commands/loop.mjs:66`. Separately, the sample measures **uncommitted** work,
  so a maker that commits its round drops `filesTouched` and `linesChanged` to zero and reads as
  stalled unless `commitsMade` is real. Task 00 contracts both.
- **The milestone is `done` and its other five stories are correctly wired** — see the
  production-consumer audit table in `VERIFICATION.md`. This story is the single outstanding item
  between milestone 69 and the runtime behaviour its SPEC scope claims.
