---
doc: retrospective
---
# 72 · The inner loop — Retrospective

Distilled 2026-09-03 at the close, from `STATE.md`'s twenty-two `## Feedback (for retro)` notes, the
`VERIFICATION.md` findings register (F-72-A … F-72-AR), the five story gates, and the
`observability/` snapshot (0 attributed agent runs). Lessons only — a clean catch with no process
lesson stays in VERIFICATION and is not repeated here. Where 71's retrospective already carries the
lesson, it is cited rather than restated.

## R1 — A SPEC written a sprint before its architecture pass was re-read, not re-derived

**Kind:** misunderstanding · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** architect

**What happened.** The SPEC was written 2026-08-16; architecture ran 2026-09-02. In the seventeen days
between, three of its six levers were closed or reduced by DIFFERENT items that shipped in between —
the QA `Edit` grant by chore 76, the observability classifier by 68/ADR-006, the binding doc budget by
70/ADR-007 — and every number in the objective was still stated as live. One number moved the other
way: `scripts/test.mjs` grew from 275,100 B to 349,485 B.
**Why.** Nothing between scheduling and architecture asks whether the objective's claims still hold;
the refine pass reads the SPEC as input rather than as a set of claims to verify.
**Lesson.** A milestone SPEC older than a sprint gets a **re-derivation step** at refine — each
measured claim checked at source and each lever checked against what shipped since — not a re-read.
Three of six is not an outlier rate.
**Refs:** `ARCHITECTURE.md` §Context, "Three corrections to 72/SPEC"; `STATE.md` closure record.

## R2 — A claim was written from a grep hit rather than from the function

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** architect

**What happened.** The SPEC cited `src/claude-settings.mjs:346` as the cause of the duplicated hook
blocks and prescribed changing the merge. That line is the PERMISSIONS splice; the hook behaviour is
`spliceSettings` turning on `isAofEntry`, and the carry-through is deliberate — the escape hatch that
keeps this repo's own unmarked `guard-test-isolation` hook alive across every `aof work update`. The
SPEC's remedy would have deleted it.
**Why.** A search landed on a plausible line and the claim was written from the hit, not from reading
the function the line belongs to.
**Lesson.** A line citation in a record is a claim about a **function**: read the function, name it,
and state what it does before prescribing a change to it. A remedy derived from a grep hit inherits
the hit's credibility without its correctness.
**Refs:** `ARCHITECTURE.md` §Context "Hooks"; ADR-005 §3; `STATE.md` closure record.

## R3 — An ADR asserted a change to a file without reading the controls already pinned over it — three amendment rounds, two review catches, one species

**Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** architect (self), QA, developers 72/02 and 72/04, architect review 72/04

**What happened.** Round 2: ADR-004 said `scripts/test.mjs` gains an argv reader and an extracted
loop, additively — but REG-MUT-11 digests every non-registration runner line and anchors four cuts
inside `runSuite`, so no conforming implementation left it green; and ADR-007 hung the prepare step on
`addWorktree`, one of four materialisation doors and not the dominant one. Round 3: importing
`scripts/test.mjs` to run ONE suite costs 3.4–6.5 s, a 47× fixed-cost regression in the headline
lever's commonest case that no ADR had priced. At build, 72/04 found two more frozen counters ADR-007
never priced — `acd-session-driver-mesh-blind`'s exact reach ceiling (68, which a static import took
to 70) and `acd-no-new-silent-catch`'s `mesh-worktree.mjs: baseline 0`.
**Why.** Each ADR read the file it was changing and not the guards over it, priced a new import by the
module's own size and not by the ceilings that module already sat inside, and did not measure the
thing it claimed to make cheaper. The counters that pin a module are named after OTHER milestones, so
a search for the subject does not find them.
**Lesson.** Before an ADR proposes a change to a file: **(a)** grep `test/arch` for the file's PATH
and its FILE NAME, not just its subject; **(b)** enumerate its sibling entry points; **(c)** MEASURE the
thing the ADR claims to make cheaper, on its commonest input. The counter-examples in this same
milestone show what the habit buys: ADR-004 §5 (parameterise in place; the extraction mis-cuts one
region in silence), ADR-007 §1 (one choke point; the reuse door is argv-identical) and ADR-005 §5
(pin the literal; the two alternatives refused on the record) each named the arrangement that works
AND the one that fails silently, and each was implemented without a decision to make.
**Refs:** `VERIFICATION.md` F-72-A, F-72-B, F-72-AC, F-72-AD, F-72-Y, F-72-Z; ADR-004 §5–§6; ADR-007
§1; `STATE.md` closure record (the 72/04 review note).

## R4 — The partition assigned deliverables to stories whose write sets held no vehicle for them

**Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** developers 72/00, 72/01, 72/02

**What happened.** Three times. 72/00's note asked this repo to declare `work.worktree.prepare`, but a
portable declaration needs `node scripts/prepare-worktree.mjs` and no story owns a file under
`scripts/` — so the key stayed undeclared and 72/04's lever is unexercised here (chore `m90`). 72/01's
route census and ADR-002 §5 could not both hold in one module — "starts no child" against "author a
bounded git reader" — so the reader went into a new module outside the story's `files:`, and the
story shipped a third refusal code the ADR does not name. 72/02 was assigned ADR-004 §4's registration
report by two ADRs that disagree about which half is missing, and the only provenance producer belongs
to milestone 59.
**Why.** ADR clauses were assigned to stories by subject, and nobody walked each clause to the file
that would discharge it and checked the story's `files:` contained one.
**Lesson.** At partition time, walk **every ADR clause to the file that discharges it** and confirm
that file is in some story's write set; a clause with no vehicle is re-assigned, given a file, or
declared undischarged in the register at refine — never discovered at build and named in a module
header.
**Refs:** `VERIFICATION.md` F-72-AI, F-72-AJ, F-72-AO; ADR-008 §2; 72/02 `OUTCOME.md` `## Gaps`.

## R5 — A control that censuses its own source, or path literals, has traps that are invisible until one bites

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developers 72/03, 72/04

**What happened.** FF-7205's no-wall-clock lane reads its own source, so its detector table would
have reddened on itself — the story's note warned of that — and so would its NON-VACUITY ROWS, the
planted strings that prove the detector fires, which the note did not name. Both had to be assembled
from fragments. FF-7207's link census reads path literals out of source text, where a Windows path
arrives with its separators escaped; `path.resolve` reads a leading doubled backslash as a UNC prefix,
so the classifier was answering about a network share and every planted Windows-path row passed as
clean — a bug POSIX cannot see.
**Why.** A self-referential census makes the control's own test data look like a detector; and a
census over literals assumes the literal is the path rather than the source-text spelling of one.
**Lesson.** When a control's subject is its own source, **assemble every literal it hunts for — the
table AND the plants** — and expect the plants to be the one forgotten, because they are written last
and look like data. When a control classifies path literals, **unescape before classifying** and
drive a Windows-path row on every platform.
**Refs:** `test/arch/acd-session-verb-boots-no-registry.test.mjs` §"spelled in pieces";
`test/arch/acd-worktree-never-linked.test.mjs` `reachesAWorktree`; `STATE.md` closure record.

## R6 — "That control's technique" was read as a shape to copy, not a function to call

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** architect review 72/03

**What happened.** FF-7205 shipped to review with a PRIVATE closure walker, re-derived, while
`importClosure` already ships one directory over as an exported, injectable function over
`(roots, load)` — named by ADR-005 §2 as "the technique". Swapped at review; the planted fixture
collapsed from a temp directory to an injected Map and four imports went with it.
**Why.** "Technique" read as a pattern to reproduce. In a milestone whose whole subject is that a
second answer agrees until it does not, the developer wrote the second answer.
**Lesson.** When an ADR says a control uses another control's technique, the review question is not
"does it look the same" but **"is the other one exported"** — and if it is, import it.
**Refs:** `test/arch/acd-session-verb-boots-no-registry.test.mjs` header; 59/FF-5904; `STATE.md`
closure record.

## R7 — Two correctly-ADR'd halves composed into an unpriced whole

**Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** developer 72/02

**What happened.** `aof test --scope impacted` on a working tree carrying an untracked file — the
commonest inner-loop state — widens to `all` (ADR-002 §3, correct) and then runs the whole suite with
no output until it finishes (ADR-003 §3, correct): measured here at more than ten minutes before the
first character. The tool that replaces a focused run became a silent whole-suite run.
**Why.** Each clause priced its own cost; nobody priced their composition on the commonest input.
**Lesson.** When two ADRs each state a cost, **price the composition on the commonest input** before
the build. The honest fix is not a suppressing flag — ADR-002 forbids one, correctly — but announcing
the selection BEFORE the launch: the widening, the count and the fact that this is now a whole-suite
run are all known before the child starts.
**Refs:** `VERIFICATION.md` F-72-AN; ADR-002 §3; ADR-003 §3.

## R8 — A number in an ADR without the method that produced it sends a later reader after a phantom regression

**Kind:** misunderstanding · **Area:** contract · **Stage:** build · **Owner:** architect · **Raised by:** developer 72/03

**What happened.** ADR-005 §1 states the CLI entry's static closure drops from 277 modules to 31.
The delivered walk measured **25**. Nothing regressed: the story's walker follows `export … from` as
well as `import … from`, drops the entry itself from the count, and resolves only specifiers that
exist on disk. A later reader comparing "31" against a control reporting 25 would go looking for a
regression that is not there.
**Why.** The ADR recorded the number and not the walk that produced it, and the shipped control uses
a different (better) walk.
**Lesson.** A measurement in an ADR carries **its method**, or it is a floor the control asserts and
not a figure the record states. The control's own floor (≥ 5, with named members present) is the
durable form.
**Refs:** ADR-005 §1; `test/arch/acd-session-verb-boots-no-registry.test.mjs` floors; `STATE.md`
closure record.

## R9 — Two of the build terminator's three legs have no instrument in this repository

**Kind:** misunderstanding · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer 72/02

**What happened.** The build terminator names lint, typecheck and tests. This repo has no linter and
no typechecker, and `npm run check` runs the FULL suite, which `.claude/rules` forbids on the control
node. What was actually run for 72/02: `node --check` on every touched module, the new suites, the
full `test/arch` lane, the supply-chain audit and the child-process smoke — every leg of `check.mjs`
except the one the machine's own rules exclude.
**Why.** The terminator is written for a project with instruments this one does not have, and a
developer under it either claims "lint clean" for a leg that cannot be measured or says which legs ran.
**Lesson.** Where an instrument does not exist, the record says **which legs ran and which could
not**, so the next story does not read "lint clean" as a claim nobody could have made.
**Refs:** `STATE.md` closure record (the 72/02 note); `scripts/check.mjs:8`;
`.claude/rules/build-deploy-restart.md` §Tests.

## R10 — The milestone about loop cost has no measurement of its own agents' cost

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** aof:verify

**What happened.** At the close, `aof work observe 72` reported **0 agent runs across 0 sessions, 410
unattributed** — the same shape 71 reported, and 71's R1 already carries the cause: a milestone driven
interactively rather than through the loop door produces no run records. The milestone whose objective
is measured in tokens per story shipped its own saving unmeasured.
**Why.** See 71/R1. Nothing at refine names which run will emit the artefact the measurement reads.
**Lesson.** Not restated — 71/R1 states it. Recorded here so 72's absence of a snapshot is read as the
same known gap and not a fresh one.
**Refs:** `wiki/work/71_milestone_loop-discipline/RETROSPECTIVE.md` R1;
`observability/snapshots/2026-09-03T09-16-36-895Z/report.md`.
