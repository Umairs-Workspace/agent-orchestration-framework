---
type: story
doc: retrospective
number: 01
parent: 124
slug: cap-exhaustion-returns-to-the-plan
title: "Retrospective — cap exhaustion returns to the plan"
created: 2026-09-08
updated: 2026-09-08
---
# 124/01 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A "dead code" ruling must enumerate every entry into the callee, not the wrapper it was read through

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** the feasibility beat

**What happened.** ADR-006 ruled the engine's cap dead on the strength of `nextDecision` passing no
cycle at any of its six call sites. There is a seventh entry that is not `nextDecision` — the
shell's direct `decideLoop` call, which passes a real cycle and gate — and a driven suite already
proved it reaches the guard. Two acceptance criteria asserted the branch unreached and would have
red against a passing suite; both were corrected before the build, and the ADR amended: three
branches dead, not four.

**Why.** The measurement was of the wrapper's call sites, and the ruling was about the callee.

**Lesson.** When ruling a branch unreachable, grep the callee's importers, not the convenience
wrapper's callers — and drive the claim before locking it into a `.feature`. Refs: ADR-006.

## R2 — The write set omitted the budget table its new control moves

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** the amigos · **Raised by:** developer

**What happened.** The story declared a new control under `test/arch/loop/` and not
`acd-source-directory-budget`, whose row for that layer is a shrink-only ceiling at the delivered
count. Adding the file reds five legs, and the only legal repair is a row raise in a file the story
never declared. `124/00` had hit the same shape and declared it; this story did not.

**Why.** The obligation is mechanical and nothing derives it.

**Lesson.** See `124/R5`. Refs: `m124/F-06`.

## R3 — The ledger had no headroom, so the ADR's append could not be honoured as written

- **Kind:** misunderstanding · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** `acd-debt-ledger-budget`

**What happened.** ADR-006's verbatim 12-line entry could not be appended: `TECH_DEBT.md` sat at
3,634 of 3,634 lines. Item 76 — the entry this story was already repairing — was compacted from 47
lines to 13, and item 91 landed inside budget, net −20 lines.

**Why.** An architecture pass that writes to a budgeted document without pricing the budget.

**Lesson.** See `124/R7`. Refs: `m124/F-10`.

## R4 — A story that changes how a loop terminates owns every harness whose timeout was sized against the old terminus

- **Kind:** near-miss · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** a suite outside the write set crossing its 20s spawn budget

**What happened.** The shell-out prompt suite spawns the real CLI with a budget sized for a range
that ended at its first cap exhaustion. Under this story a milestone derives itself as its plan and
takes one refine before the walk terminates, so the spawn ran one more real phase and crossed 20s.
Diagnosed rather than assumed — 180s passed in 47s — and raised to 60s with the reason at the
constant.

**Why.** `files:` has no way to name a harness the story has never run.

**Lesson.** When a story changes a loop's termination, run every shell-out suite in the loop family
before the review, and expect to own a timeout. Refs: `m124/F-11`.
