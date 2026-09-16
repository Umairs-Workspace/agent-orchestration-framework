---
type: story
doc: retrospective
number: 00
parent: 126
slug: the-loop-says-what-it-is-doing-and-counts-what-it-did
title: "Retrospective — the loop says what it is doing and counts what it did"
created: 2026-09-09
updated: 2026-09-09
---
# 126/00 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A contract that enumerates call sites by line number is a snapshot, and a control must re-derive the count

- **Kind:** near-miss · **Area:** contract · **Stage:** build · **Owner:** architect · **Raised by:** the story's own fitness function

**What happened.** ADR-002 §3 and FF-12602 named the drive sites by their refine-time line numbers —
two of them. The tree has three. An act line written only at the two named sites left the third
silent, and that third is where a milestone-scoped invocation spends nearly all of its wait.

**Why.** The control was authored to DERIVE the site count from the source rather than to assert the
two the contract listed, so it failed on the site the contract had not seen. Had it been written to
the enumeration, the build would have been green and the loop would still have been silent in the
place it most needed a voice.

**Lesson.** When a contract enumerates sites in a file it does not own the future of, write the
control against the derivation, never against the enumeration — the enumeration dates from the
moment it was read. Refs: `m126/F-03`, `FF-12602` leg 3.

## R2 — A contract row can state a precondition the shipped defaults cannot reach

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer

**What happened.** FF-12602's row "a story whose gate stays red, at cap 3" expects three act lines.
At the default `work.loop.reviewRounds` of 1 a red gate re-drives ONCE and stops on the review bound
at cycle 2, so cap 3 is never reached and the third line cannot exist. The claim was right; the
precondition was not reachable as written.

**Why.** The row was reasoned from the cap alone, and the review bound — a second, lower ceiling on
the same path — was not carried into the example.

**Lesson.** A contract example that names a bound must name every bound that fires before it, or the
build discovers the missing one by having to construct a fixture the defaults forbid. Refs:
`m126/F-04`.

## R3 — A story's `files:` cannot foresee the ratchets its own new files trip

- **Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer

**What happened.** The build necessarily wrote two files the story never declared:
`test/arch/loop/acd-loop-level-l3-gated.test.mjs` (it deep-equals the `work:loop` schema's property
list, which task 03 requires `quiet` to join) and `test/arch/testing/acd-source-directory-budget.test.mjs`
(the shrink-only directory ratchet, whose `test/arch/loop` and `test/loop` rows this story's three
new suites push past, and which demands a stated reason rather than a silent bump).

**Why.** Both are ratchets working exactly as designed — they exist to be tripped by a new file — and
neither is derivable from the story's own write set at refine time. The wave planner trusts `files:`,
so under a fan-out these two would have been written by a lane that never declared them.

**Lesson.** A story that adds a flag to a closed schema, or a suite to a budgeted directory, should
declare that schema's control and that directory's ratchet in `files:` — they are the two ratchets a
new file reliably meets. Refs: `m126/F-05`.

## R4 — A milestone's ARCHITECTURE reddens a shrink-only ceiling for the whole of its own build

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** architect · **Raised by:** the whole-tree gate

**What happened.** `arch/119 FF-11903` reads 50 unresolvable `src/` citations against a ceiling of 47,
and four of the 50 are this milestone's own: three forward references from `ARCHITECTURE.md` to
modules its later stories will create, and one illustrative placeholder in a task feature the sweep
cannot tell from a real path. The red is inherited by every story gate in the milestone and lands on
the milestone door.

**Why.** The citation sweep evaluates a path the moment the document naming it lands, and a
milestone's ADRs necessarily name the modules its stories have not written yet. The ceiling can only
fall, so the milestone is over it from its own refine until its last story lands.

**Lesson.** A refine that forward-references modules should expect to open its milestone over the
citation ceiling and say so in `STATE.md` at the refine, rather than have each story's verify
rediscover it as an inherited red. An illustrative path in a feature must be spelled so the sweep
cannot read it as a citation. Refs: `m126/F-02`.

## R5 — A ratchet that pins a call-site COUNT forced a better shape than the one that would have broken it

- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** a delivered control

**What happened.** `69/00`'s blocker-fix control pins `heartbeatFromConfig(` to exactly two call
sites in `src/commands/loop.mjs`. The clock needed a third consumer, which would have broken it. The
threshold is now resolved ONCE per invocation and shared by the reclaim sweep and both deadline
sites.

**Why.** The shared resolution is not merely a way past the pin: a run the sweep calls stale and the
clock calls alive is exactly the disagreement that manufactures the eleven-hour bill this story
exists to delete. One resolution per invocation makes that disagreement unrepresentable.

**Lesson.** When a delivered control refuses a third call site, look for the invariant it is
protecting before working around it — here the pin was pointing at a correctness property, not at a
style preference. Refs: `69/FF-6901`.

## R6 — The story that gives the loop a voice was itself built by a run that recorded nothing

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** the run store · **Raised by:** this accept

**What happened.** `aof work observe 126/00 --write` reports one run, `no declared phase`, 9h20m
wall-clock, 0 tokens, spend `unmeasured`, and `Sessions: none`. The run record carries
`heartbeatAt: null`, `spend: null` and no `brief.loop`, so nothing on disk distinguishes nine hours
of work from nine hours of a closed lid — the exact ambiguity ADR-001 was framed to resolve.

**Why.** The run was not loop-minted, and the heartbeat and spend buckets are stamped by loop
consumption. A run created outside that path is observable only by its two instants.

**Lesson.** The clock this story delivers reads `heartbeatAt`, so a run with none is charged to `now`
by construction. Where a build is driven outside the loop shell, its own duration is unattributable
and its record is one the new summer must treat as fresh-running — worth knowing before the summer
is asked to price it. Refs: `observability/snapshots/2026-09-09T14-08-34-566Z/report.md`.

## R7 — A `pending` marker in a register is cleared by nobody but the accepting command

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** this accept

**What happened.** `ARCHITECTURE.md` still marked FF-12601 and FF-12602 `*(pending — 126/00)*` after
both control files had landed and gone green. `aof work doctor` reads the disk rather than the
marker, so it resolved both and nothing refused the stale text.

**Why.** The marker is prose, and the only check that reads it uses it to DOWNGRADE a real finding —
so a marker that has outlived its truth is invisible to every gate.

**Lesson.** Dropping the `pending` marker is part of accepting the story that delivers the control,
not a tidy-up for later; `124/F-03` found six such cells stranded across five already-accepted
registers. Refs: `m126/F-06`, `m124/F-03`.
