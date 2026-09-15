---
type: story
doc: retrospective
number: 07
parent: 129
slug: the-loop-settings-are-self-contained
title: "Retrospective — the loop's settings are self-contained"
created: 2026-09-15
updated: 2026-09-15
---
# 129/07 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`. The run was nearly
clean — scoped from the operator's sign-off finding at the milestone door, built solo in one
session with three lenses inline, 0 Blockers — but the contract named three standing controls and
the lane found a fourth (`F-56`), and the first measurement of "two lanes at once" measured the
fixture instead of the product (`F-57`).

## R1 — A new key whose name contains another key's name is scanned by every control that greps the other; list them all in the contract, from `test/arch/**`, before the first line lands

- **Kind:** near-miss · **Area:** contract / controls · **Stage:** refine → build · **Owner:** architect · **Raised by:** the lane (`F-56`)

**What happened.** `work.loop.dispatch.concurrency` ends in the same nine characters as the pool's
`work.dispatch.concurrency`. The contract named the three controls known to scan that text —
FF-6901's annexation leg, FF-12901's leg 2, FF-7101's key regex — and re-pointed each with a
self-check. The story lane then redded 65's `acd-dispatch-bound-single-home`, whose
`boundSiteOffenders` FF-6907 also reuses, on exactly the same substring. Same fix, same
self-check, one more file in `files:` — found by the run, not by the contract.

**Why.** The three were found by asking "which controls of THIS milestone's family read the
bound?"; nobody asked "which control anywhere greps `dispatch.concurrency`?" — a one-line
`grep -rl` over `test/arch/**` that answers in a second.

**Lesson.** When a story adds a config key, a constant or a verb whose NAME contains an existing
one, the refine session greps `test/arch/**` for the shorter name and lists every scanner in the
contract, each with the amendment it needs. A textual control that must tell two keys apart tells
them apart by the object the read hangs off (`loopConfig(…)?.` vs `work?.`), never by the last
segments — and erases the new key's own forms before asking the old key's pattern. Refs: `F-56`,
04/R3 (the same shape for a bound seam).

## R2 — A fixed dwell cannot measure "at once": hold the first until the second has started

- **Kind:** mistake · **Area:** testing · **Stage:** build · **Owner:** QA · **Raised by:** the build (`F-57`)

**What happened.** The "unset key runs both lanes at once" leg gave each fake child a 40 ms dwell
and asserted a peak of 2. It measured 1: each lane's prelude (open, mint, baseline) is serialised
behind the previous lane's, and on this machine it outlasts 40 ms, so the second child started
after the first had finished. The product was concurrent; the ruler was too short. The leg now
holds the first child until the second has started (bounded at 1.5 s), and the narrowed leg keeps
its plain dwell because admission itself forbids the overlap.

**Why.** Overlap is a relation between two starts and one end, not a duration; a timer stands in
for the relation only while the fixture is faster than the timer, which is a property of the
machine.

**Lesson.** A concurrency assertion holds one party until it has observed the other (a deferred
released by the second's start), and its negative twin is proved by the mechanism that forbids
the overlap (a refusal, a bound), never by a second timer. Refs: `F-57`; 04's `pause` /
`deferred` pattern in `lane-fixture.mjs`, which this leg should have reached for first.
