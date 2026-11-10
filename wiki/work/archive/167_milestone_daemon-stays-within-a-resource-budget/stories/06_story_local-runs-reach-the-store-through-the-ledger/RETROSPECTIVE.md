---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 06 · Local runs reach the store through the ledger — Retrospective

## R1 — a failure scenario drove a verb whose guard refuses on that same failure

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** qa · **Promoted to:** none
- **Raised by:** the 06 build

**What happened.** Task 00's E4 sets up "the global store cannot be opened" and then runs `aof work
run-start`. In a mesh-enabled workspace that verb's item lock fails closed on exactly that condition
(m43/ADR-003 R1.4), so it refuses the mint. The build proved the property at the transition seam
the verb wraps, and the scenario's wording still names the verb.

**Why.** The scenario was written from the effects journal's side (a publish step stays owed), and
nobody checked the verb's own guards against the planted failure.

**Lesson.** When a scenario plants a failure and then drives a verb, check that verb's guards
against the same failure at refine. Name the seam the property actually holds at, not the verb.

**Refs:** VERIFICATION `@finding-F-01`, ADR-008, `packages/mesh/src/item-lock.mjs`.

## R2 — PLAN named the tests that would move, and `files:` listed none of them

- **Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** architect · **Promoted to:** none
- **Raised by:** the 06 build

**What happened.** PLAN.md said that every test seeding run JSON on disk and reading presence
"moves with" the change. The declared `files:` set listed none of them. The build touched four arch
suites outside it, plus `runs.mjs`, the run-store binding and a new `content-reads.mjs`, which the
store's line ratchet forced.

**Why.** The class of tests was described in prose instead of being enumerated. The ratchet that
sat at its limit was not checked against the writer the story added.

**Lesson.** When a PLAN names a class of tests that must move, grep for it at refine and list each
file in `files:`. Before adding to a module, check its line ratchet.

**Refs:** STATE.md `## Feedback (for retro)` (167/06 build), 43/ADR-012 B4.
