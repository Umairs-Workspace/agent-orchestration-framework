---
type: story
number: 02
slug: the-observation-census
title: "The observation census — a count that says what it filtered, or it is not a count"
parent: 61
status: done
owner: product-owner
created: 2026-08-30
updated: 2026-08-31
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-006, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-004, src/work-audit/reads.mjs, src/mesh-worktree.mjs, src/effects/journal.mjs, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/work-acceptor/observations.mjs, test/arch/acd-observation-census-filtered.test.mjs, test/acceptor-observations.test.mjs, scripts/test.mjs]
---
# 02 · The observation census

## User story

As the operator who will be shown a number and asked to act on it,
I want every population the acceptor counts to declare what it read, against a floor, with fixtures
excluded and dispatch worktrees folded into their parent,
so that a count I am shown is a count of the thing it claims to be — and a sweep that found nothing
tells me so instead of reporting a confident zero.

The effects journal has no fixture boundary. Spike 60 measured 3,848 of 3,926 run-start events as
test fixtures sharing a store with production facts, and settled assignments at 245 synthetic of 328.
Separately, dispatch worktrees register as distinct workspaces and fragment per-workspace counts by
about 15%. A count that filtered neither is not a smaller truth; it is a different number wearing a
truth's clothes, and an acceptor whose evidence rests on it is p-hacking by accident.

The other half is a failure this system has already been bitten by. A sweep that reads nothing
returns zero, and zero is indistinguishable from "measured, and there was nothing" unless the sweep
says what it read. Milestone 59 settled the shape of that answer — a declared read record with a
floor, driven from the lane registry so that a lane added without one fails rather than passing
silently over nothing. This story reuses that shape rather than inventing a second one.

It is deliberately independent of the rule, the ledger and the command surface: it reads the journal
and answers how many observations there are. That is why it builds in stage 1 rather than behind
them.

## Tasks

- [ ] `tasks/00_the-census-says-what-it-filtered.feature` — fixtures are excluded and dispatch worktrees are folded into their parent, the report says what it excluded, and a census that filtered nothing is a finding rather than a count

## Notes

- **Lifted out of the face story at refine** (2026-08-30), on the developer's feasibility finding:
  this module has zero coupling to the rule, the ledger or the command surface, so keeping it behind
  them put stage-1 work on the critical path for no reason.
- **The read-record shape is IMPORTED, not re-spelled** (`ARCHITECTURE.md#ADR-006` §3, §6) — the
  audit family's zero-import leaf owns `readRecord`, `sweepDeclarationProblems` and `SWEEP_BASES`.
  Only the finding code differs, because that code is the auditor's; the acceptor builds its own from
  the same problems list, so the two shapes cannot drift.
- **The worktree convention is derived, never re-spelled.** The folding reads the module that owns
  the path convention rather than spelling the directory name a second time
  (`ARCHITECTURE.md#ADR-006` §5).
- **What this story does NOT do:** it does not decide what an observation means, price it, or rule on
  it. It counts, and it says what it counted.
- **Stage 1** — builds in parallel with 61/00, 61/01 and 61/03.
