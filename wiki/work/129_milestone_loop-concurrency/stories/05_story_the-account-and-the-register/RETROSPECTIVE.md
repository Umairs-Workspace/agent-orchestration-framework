---
type: story
doc: retrospective
number: 05
parent: 129
slug: the-account-and-the-register
title: "Retrospective — the account and the register"
created: 2026-09-14
updated: 2026-09-14
---
# 129/05 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`. The run was nearly
clean — one solo build, three lenses inline, 0 Blockers, no grind — but two of the seven controls
were blind at first contact (`F-54`) and the accept took two test-only folds that had been routed
across three stories without landing (`F-39`, `F-51`).

## R1 — A non-vacuity guard and a rule share a subject; when the probe REPLACES the subject, the finding must carry both

- **Kind:** near-miss · **Area:** testing / controls · **Stage:** build · **Owner:** developer · **Raised by:** the build (`F-54`)

**What happened.** FF-12903's structural leg guards "the `resolveRefInWorktree(` binding was
FOUND" before it applies "the lane mint takes that binding". The register's probe replaces the
call with `resolveItemExact(ctx, ref)` — so the guard fired first and the leg answered a bare
`NOT FOUND`, which is the message for a REMOVED call, not a mint on the wrong item. Its fixture leg
asserted the wave's end state before its spawn-time observations, so the probe's halt hid the
claim under test. FF-12907's pass-through count was module-wide, and the wave run's own
pass-through masked the lane mint's removal. All three were caught because every register probe
was actually performed against the shipped bytes before the control was called green.

**Why.** A guard and a rule are written as two assertions on one subject, and the first to fire
owns the message. A probe that removes the subject and a probe that replaces it are different
defects with the same first assertion.

**Lesson.** A sweeping leg's finding names BOTH what it did not find and what it found instead
(`NOT FOUND — … and runLane calls transitionRunStart(laneItem, …) but laneItem is not bound from
…`); a fixture leg judges what it observed before what it ended on; a count that guards a per-site
rule is scoped to the sites the rule is about. And the register's probe is performed, not
reasoned about — the two blind legs were invisible to reading. Refs: `F-54`, task 01's
"a probe that reds nothing is a defect of the control".

## R2 — A test-only fold routed across three stories is taken by the accept that meets it, and the premise that deferred it is re-measured first

- **Kind:** mistake · **Area:** process · **Stage:** accept · **Owner:** product-owner · **Raised by:** the accept (`F-39`, `F-51`)

**What happened.** `F-39` (three spellings of `writeRel` / `mergeHeadAbsent` / `conflictMarkers`)
was raised at 03's accept, routed to 04 ("whose write set holds `test/support/`"), re-routed to 05
at 04's accept (04's fixture was born under `test/support/loop/`), and 05's build never touched the
three suites. The `classifySites` copy was left in `acd-number-null-safe` on the premise that the
file was "127/01's, untracked in this tree" — a premise that lapsed at the public-repo move, when
every file became committed at the root. Both folds were taken at this accept: four files, +42/−70,
211 / 0; one file, +5/−42, 13 / 0. Twenty minutes, twice deferred.

**Why.** Each routing was individually reasonable and collectively a chore nobody was going to own;
the `files:` declaration was read as a fence for the accept as well as for the build, and a
deferral's premise was carried forward as a fact rather than re-read.

**Lesson.** A finding re-routed once is taken by the next accept that can measure its blast radius,
inside the item, with the touched suites run — never routed a third time. Before honouring a
deferral, re-measure its premise at the source (`git log -- <file>`, `aof work find`); a premise
older than a repo move is stale by default. Refs: `F-39`, `F-51`; the standing rule "no chores —
fix inline; measure the blast radius instead of deferring on it".

## R3 — A procedure performed twice from a scratchpad is a script the repo owes

- **Kind:** near-miss · **Area:** tooling · **Stage:** build → accept · **Owner:** operator · **Raised by:** the review (`F-53`)

**What happened.** The build wrote a red-probe runner (edit → run the control under a fresh home →
restore → sha256) in its session scratchpad; the accept, unable to reuse it, wrote a second one
(`red-probe.mjs`, nine probes) — the same shape, the same CRLF trap (one probe's find string
matched zero times until the line ending was spelled), the same restore check. Neither survives
the session; the next `aof:verify` that must re-observe a probe after the bytes move writes a
third.

**Why.** The register asks for the probe's message but ships no way to re-perform it; 68's R8
already named the gap and it was routed as "a story shape for the operator" twice.

**Lesson.** A `scripts/red-probe.mjs` that takes a register row's `id`, applies its named plant
from a small table beside the control, runs the control under an isolated home and restores the
bytes — so a probe is re-observed by command at every accept, and a probe that reds nothing is a
red of the script. Routed to the operator as `F-53`; not created here. Refs: `F-53`, 68/R8.
