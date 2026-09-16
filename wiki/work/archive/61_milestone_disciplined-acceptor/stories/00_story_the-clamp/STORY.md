---
type: story
number: 00
slug: the-clamp
title: "The clamp — the one bound that is missing a ceiling gets one, and the key that is two bounds is refused"
parent: 61
status: done
owner: product-owner
created: 2026-08-30
updated: 2026-08-31
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-009, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012, wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-001, src/loop-bounds.mjs, src/loop-progress.mjs, src/commands/run-retry.mjs, src/commands/loop.mjs, test/arch/acd-loop-cap-single-home.test.mjs, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/loop-bounds.mjs, test/arch/acd-loop-cap-single-home.test.mjs, test/loop-bounds.test.mjs, scripts/test.mjs]
---
# 00 · The clamp

## User story

As the operator whose harness may one day tune itself,
I want every knob that can be stepped to declare a floor and a ceiling in the place its value is
resolved — and any key that turns out not to be a single bound refused outright rather than given an
invented range,
so that a bounded one-notch step has something real to be bounded against, and so that the machinery
never manufactures a range in order to have one.

This story exists because the milestone's scope says "bounded step within declared floors and
ceilings", and spike 60 measured that the ranges were not all there. What the feasibility pass then
found is more interesting than the gap it was looking for. Only **one** clamp is actually missing:
`work.loop.buildNoProgressRounds` has a floor and no ceiling, and it has a single resolution funnel,
so one edit binds every door.

The third knob is the finding. `work.autonomous.maxAttempts` resolves to **two unrelated bounds** —
an attempt ceiling in one place and a per-phase drive-cycle ceiling in another — measured in
different units and exhausted by different events. A single one-notch step moves both at once, which
is a compound step, which this milestone already forbids. So no range is declarable for it, and the
honest answer is to refuse steps on it rather than to invent one. Inventing a range here would be
precisely the p-hack this milestone exists to refuse, wearing a clamp.

Refusing it is not a narrowing of what may be tuned: the key stays proposable, and the refusal is
about committing, not proposing. The conflation itself is recorded as debt rather than repaired here.

## Tasks

- [ ] `tasks/00_every-steppable-knob-has-a-range.feature` — each knob that can be stepped resolves within a declared floor and ceiling, and a value past either end comes back inside
- [ ] `tasks/01_a-key-that-is-two-bounds-is-refused-as-a-step.feature` — a key resolving to more than one bound is refused by name rather than clamped, stays proposable, and no other door's behaviour changes
- [ ] `tasks/02_admissibility-is-the-resolvers-own-answer.feature` — a proposed step is in range exactly when the knob's own resolver returns it unchanged, and no second table of ranges exists to disagree with it

## Notes

- **One clamp, one funnel.** `resolveBuildNoProgressRounds` is the single door — both stall paths and
  the config path arrive through it — so unlike the attempt cap there is no second spelling to chase
  (`ARCHITECTURE.md#ADR-009` §3). The floor is already enforced.
- **69/FF-6901 and 53/FF-5310 are left byte-intact.** This story does not annex the attempt cap into
  the bounds home and does not touch its four resolution sites (`ARCHITECTURE.md#ADR-009` §4a). That
  is a constraint on the build, not an accident.
- **The refusal is derived, not invented.** `step-would-be-compound` follows from the
  one-knob-one-notch rule (`ARCHITECTURE.md#ADR-001` §4); it is the only refusal in the vocabulary
  that no budget increase and no instrumentation can ever lift.
- **The conflation is ledgered as TECH_DEBT item 76**, not repaired here — splitting the key collides
  with a closed key set and a four-site record, which is why it is a milestone and not a rename.
- **Stage 1** — builds in parallel with 61/01, 61/02 and 61/03.
