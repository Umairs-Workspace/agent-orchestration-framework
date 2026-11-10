---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 167 · The daemon stays within a resource budget — Retrospective

The story-level lessons live in each story's own retrospective. These are the ones only the
milestone sees.

## R1 — the objective's measurement came last, and it named two more stories

- **Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Promoted to:** none
- **Raised by:** the 04 build and the F-04 profile

**What happened.** The break-down ordered the soak (04) after every amplifier story, as their proof.
00–03 and 05 were each green on their own suites while the real daemon still idled at 12–14% of a
core. When the soak finally ran, it found the runs walk (06) and then the stat walk (07). Neither
had been planned, and each needed a profile before it could be framed.

**Why.** The refine took the SPEC's three motivating faults as the whole cause list. The soak was
treated as a verification of the plan, not as the instrument that would discover what the plan
missed.

**Lesson.** When a milestone's objective is a measured budget, schedule its end-to-end measurement
first, even red, and let what it measures name the stories.

**Refs:** 167/04/R1, 167/06, 167/07, VERIFICATION `@finding-F-04`.

## R2 — a red gate hides the reds behind it, and an attribution made through it was wrong

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Promoted to:** none
- **Raised by:** the milestone gate (2026-10-22)

**What happened.** The gate row read about 25 red cases. Clearing them uncovered five more. Several
suites stop at their first failing assertion: the kernel allowlist stops at the first package's
violation, and the runtime audit is one deep-equal over all its findings. The first attribution of
FF-5301's +1 (to 168) was made by swapping out 07's one new import. That ruled out the change it
tested, and nothing else; dumping the reach set showed the module was 06's `content-reads.mjs`.

**Why.** "This change is not the cause" was read as "the other milestone is the cause", without
listing what the measurement actually saw.

**Lesson.** Attribute a count or reach red by listing its members against the base, not by
removing one suspect. After a gate round, re-run every suite that was red, because one cleared
assertion can expose the next.

**Refs:** VERIFICATION `@finding-F-09`, STATE (milestone gate repair).

## R3 — two passing suites were passing on a broken path

- **Kind:** near-miss · **Area:** code · **Stage:** verify · **Owner:** developer · **Promoted to:** none
- **Raised by:** the milestone gate

**What happened.** session-spawn-handler 00 and 03 had been green because an injected clock function
made the launcher's publish throw, so the publish's membership rebuild never ran. 03 fixed the
clock. The publish then succeeded, read node records from the runner's home rather than the
fixture's, unlinked the node, and the cases timed out. The fix was the fixture's home, as the 03
suite's `withMesh` already does.

**Why.** A green case was taken as evidence that the path it drives works. It was only evidence
that the path never reached the step that would have failed.

**Lesson.** When a fix makes a previously failing step succeed, re-run every suite that drives that
step. And a fixture that writes node records must make its home the process's global home.

**Refs:** STATE (milestone gate repair), 167/03/R2.

## R4 — a budget measured in Linux was not a budget measured on the device

- **Kind:** near-miss · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Promoted to:** none
- **Raised by:** 168's gate row (167/04 E1 red on the Windows host)

**What happened.** 07 took the soak green in the container (serve at 0.8%), and it was accepted
there. On the Windows host, E1 was red at 2.9%. One extra walk, taken on the tick after a watch was
armed, costs ≈1.1 CPU-s there against ≈0.3 in Linux, and it fell inside the measured phase.
ADR-009 was amended to arm before the walk.

**Why.** The container was used because it does not disturb the host. It also measures a cheaper
file system than the user's device, which is what the budget is for.

**Lesson.** A budget that protects a user's device is proven on that device's OS. Use the
container for breadth, and take the budget's own suite on the host before accepting.

**Refs:** ADR-009 (amended), VERIFICATION `@finding-F-10`, 167/01/R2.
