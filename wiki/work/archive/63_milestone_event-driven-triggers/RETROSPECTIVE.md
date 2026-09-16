---
doc: retrospective
---
# 63 · Event-driven triggers — Retrospective

Distilled 2026-09-03 at the close, from `STATE.md`'s 64 `## Feedback (for retro)` notes, the
`VERIFICATION.md` findings register (F-63-A … F-63-Q) and the accept pass itself. Lessons only —
a clean catch with no process lesson stays in VERIFICATION and is not repeated here.

## R1 — A control can be green over a tree that has never held the defect

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** architect / QA

**What happened.** Twice, a control passed while the thing it forbids was present, and both were found
by PLANTING rather than by reading. A story's headline property had no behavioural check at all, and an
unobfuscated violation passed every control.
**Why.** Reading a control tells you what it says; only a plant tells you what it catches.
**Lesson.** The red probe is not paperwork at accept — it is the only evidence a control is armed.
**Refs:** `VERIFICATION.md#Fitness functions`; STATE feedback (63/01, 63/05).

## R2 — The mutation harness failed twice, in two ways, and both produced confident false greens

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** QA lane

**What happened.** Red-probing inside ONE `node` process reported a live control as vacuous; a separate
method error produced **six** false greens and invalidated every un-re-run probe taken that way.
**Why.** These controls snapshot source text at module load, so a warmed import cache cannot see a plant.
**Lesson.** Every probe runs in a FRESH process, and a harness error invalidates the batch, not the case.
**Refs:** STATE feedback (63/01, 63/05); `VERIFICATION.md` probe procedure.

## R3 — A control specified as a diff is vacuously true the moment it merges

**Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect

**What happened.** `FF-6306`'s fence was written as a self-comparison against HEAD — true only while the
story was unmerged, and vacuous exactly when the fence must hold.
**Why.** A fitness function asserts a property of the TREE, never of the DIFF.
**Lesson.** If a control's claim cannot be evaluated on a checkout with no branch context, it is not a
control. Restated structurally in `ARCHITECTURE.md#ADR-013` §3.

## R4 — Write-set and read-set escapes recurred across four consecutive stories

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner / architect

**What happened.** Four write-set escapes across four stories, 63/03 adding a NEW carrier species to the
two already ledgered; read-set gaps at 63/00 and 63/01, one a hard dependency the `reads:` list omitted.
The streak broke only at 63/04.
**Why.** The sets are authored from what the author expects to touch, not from what the work reaches.
**Lesson.** Derive the sets from the contract's own citations, and treat a repeat species as a tooling
gap rather than a lapse of care.

## R5 — The `?? <empty>` species was sighted six times, once inside the file whose header forbids it

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer

**What happened.** A silent fallback to an empty value appeared six times; the strongest instance was
inside the module whose header explicitly refuses it (`sources.mjs:351`).
**Why.** The idiom reads as defensive and costs nothing at the call site, so it survives review by
looking careful.
**Lesson.** A header that forbids a species does not enforce it. This is the milestone's signature bug
and wants a control, not another note.
**Refs:** `VERIFICATION.md` FF-6301's no-fallback leg.

## R6 — The blocker nobody's diff owned

**Kind:** blocker · **Area:** architecture · **Stage:** build · **Owner:** architect

**What happened.** The premature-done hazard (`F-63-A`) was a COMPOSITION defect: correct in every
individual diff, wrong in the assembly. No permissible edit inside 63/03 could fix it, and every
delivered lane was blind to it by construction — each injects a scripted PTY that exits on the tick
after spawn, so no inner transcript ever appears.
**Lesson.** Pre-authorising the follow-up story in the ADR, rather than leaving it to be re-litigated,
is the right way to leave a known blocker — and it worked: 63/06 landed with the fix and its red probe.
**Refs:** `ARCHITECTURE.md#ADR-013` §1, `#ADR-016`; `VERIFICATION.md` F-63-A.

## R7 — A story-scoped suite cannot see a control that lives in another milestone

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner

**What happened.** 63/06's positive-control import put a file outside milestone 53's closed driver
allowlist and moved its census split. The story's own lane was green; the failure appeared only at the
full-suite gate (`F-63-H`).
**Lesson.** The scoping trade is sound and should stay — but it makes the milestone gate load-bearing,
not ceremonial. Never accept a milestone on story-scoped greens alone.
**Refs:** `VERIFICATION.md` F-63-H.

## R8 — Two reviewers re-made a mistake the milestone had already written down

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** architect

**What happened.** A reviewer made the exact mistake a previous review had recorded, one story later;
a second instance was self-reported by the lane that made it.
**Why.** A lesson recorded in STATE is not in the next lane's context unless something puts it there.
**Lesson.** This is the argument for `aof work memory ingest` at the close rather than a longer STATE
file. Recorded lessons must graduate into recall, or they are archaeology.

## R9 — Graph edges harvested from comments nearly misled reviewers, twice

**Kind:** near-miss · **Area:** architecture · **Stage:** verify · **Owner:** architect

**What happened.** Coupling that existed only in prose was read as a real dependency edge; a reach pin
is not the graph. Two sightings in one milestone.
**Lesson.** Derive coupling from imports and call sites; treat a comment-derived edge as a hypothesis to
check, never as evidence.

## R10 — A generic error message asserting a specific cause cost the accept pass an hour

**Kind:** mistake · **Area:** code · **Stage:** verify · **Owner:** mesh owner · **Raised by:** the accept pass

**What happened.** `onFrameSkipped` reports EVERY refused frame with hardcoded text about a missing
workspace descriptor and discarded items. It fired for `clone-credential-mint-failed`, which concerns
neither — and the accept pass acted on the text, re-enrolling workspaces for nothing.
**Lesson.** A diagnostic that names a cause it did not verify is worse than one that names none. The
same lane also hit a silent admission refusal (`F-63-L`) and a settlement with no reason (`F-63-O`) —
one family, and together they made every diagnosis an inference.
**Refs:** `VERIFICATION.md` F-63-L, F-63-M, F-63-O.

## R11 — A month of untested cross-machine surface surfaced four latent defects in one evening

**Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** mesh owner

**What happened.** The live lane found a build id describing git HEAD rather than the deployed files
(`F-63-K`), an invite emitting a loopback relay URL (`F-63-L`), a github-app provider with no "this repo
needs no credential" path (`F-63-M`, `F-63-P`), and a worker that clones the WRONG REPOSITORY when it
has no descriptor for the assigned workspace (`F-63-Q`) — which failed safe only because the minted
token happened to lack access.
**Why.** Every mesh test drives in-process fixtures on ONE host, so three classes are unreachable by
construction: a value correct on loopback and wrong for a peer, a frame well-formed when a fixture
builds it, and an identity derived correctly but describing the wrong artefact.
**Lesson.** A `@manual` lane is a periodic instrument, not a guard — it fires only when someone runs it.
The cross-machine path needs a real two-node lane in CI or a scheduled soak.
**Refs:** `VERIFICATION.md` F-63-K … F-63-Q; F-63-N for the gap itself.

## R12 — The milestone was accepted with two Outline rows unobserved, and that was a product-owner call

**Kind:** misunderstanding · **Area:** process · **Stage:** verify · **Owner:** product-owner

**What happened.** `tasks/03`'s live skewed-pair lane is observed on two of four rows. The remaining two
need a workspace where the worker is enrolled WITH a local clone AND the configured provider can mint
for that repo; no such workspace exists in this environment today, and three separate attempts each hit
a different environmental wall. The operator elected to accept rather than hold finished work behind
another subsystem's setup.
**Why.** The lane's premise — a healthy two-node mesh — turned out to be the thing under test.
**Lesson.** A manual lane that depends on infrastructure should say so in its own prose, so the cost of
running it is visible at refine rather than discovered at accept. The obligation is carried as an open
gap on `63/03`'s `OUTCOME.md` with a discharge condition, not silently dropped — and the task box stays
UNTICKED, because an unobserved lane must never read as observed.
**Refs:** `63/03/OUTCOME.md#Gaps`; `VERIFICATION.md` F-63-B, F-63-P, F-63-Q.
