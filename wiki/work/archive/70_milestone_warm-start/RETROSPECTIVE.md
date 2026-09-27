---
type: milestone
doc: retrospective
number: 70
slug: warm-start
title: "Retrospective — the milestone that shipped five stories before anyone measured it"
created: 2026-08-24
updated: 2026-08-24
---
# 70 · Retrospective

Lessons from delivering and accepting the milestone. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson.

Distilled from `STATE.md`'s `## Feedback (for retro)` (now archived) and this milestone's
`VERIFICATION.md` findings (F-01…F-28), plus the two gate refusals — 2026-08-22 on F-11/F-12 and
2026-08-24 on F-21.

## R1 — Five stories passed their gates before anyone asked whether the milestone's headline artifact worked on real data, and it did not

The milestone's answer to a 927,588-token spawn was a ~2,000-token brief. At the first milestone
gate, compiled through the production reader against this milestone's own stories, that brief was
**244 characters** on a `verify` — an item ref plus a notice saying everything had been dropped — and
70/03's entire delivered capability reached no brief in the repository at all. Three story gates and
a structural review passed over it. **Checking took four minutes.**

The reason it hid is exact and reusable: **every `@executable` fixture was sized to fit the ceiling.**
No scenario in 70/00 or 70/03 ever compiled a brief for a real item under `wiki/work/`, so the packing
policy was only ever exercised where it could not fail. The tests were not weak; they were
*unrepresentative*, which no amount of coverage detects.

**The carryable form: a compiler, packer, formatter or truncator must have at least one assertion
that runs over the REAL corpus, not a fixture.** 70/05's fix is the shape to copy — its guard compiles
briefs for all 219 stories in the stream and floors the subject count so it cannot go vacuous when the
corpus shrinks. A fixture proves the algorithm; only the corpus proves the policy.

## R2 — "Without 68 this milestone ships on faith" was written at refine, stayed true through five stories, and nobody was assigned to make it false

The SPEC's own Dependencies note said the cache-hit ratio was *"the only way to prove any of this
worked."* Every run record in the stream still read `unmeasured` at the first gate. The three pieces —
the flags, the reading, the warm fix loop — existed and had **never been run together**.

Nothing was broken. Nothing had been exercised. The milestone had built an instrument and never
switched it on, and no story owned switching it on, because measuring was treated as a consequence of
building rather than as work.

**The carryable form: if a milestone's objective is stated as a number, one story must own producing
that number, and it must be scheduled at refine rather than discovered at the gate.** A milestone
whose success criterion is a measurement has a measurement story or it has faith.

## R3 — The measurement finally taken could not settle the question, and that was knowable before it was taken

70/06 delivered honestly: a real run through the loop door, a stamped envelope, a re-read 143-row
baseline, the delta stated for every headline figure, four figures reported *not taken* with reasons,
and a regression recorded in the direction it actually moved. The human gate then read it and said it
does not answer whether warm start paid for itself — because the before is hours-long production
milestones in one repository and the after is nine minutes on a one-function fixture in another.

**The confounders were structural properties of the setup, not surprises in the data.** The `before`
was always going to be this tree; the `after` was always going to be `aof-test-repo`, because
milestones 67–70 have no run record here. Read at refine, that pairing is visibly unable to isolate
the effect.

**The carryable form: for a comparison, decide what would make it interpretable BEFORE taking it —
what is matched, what varies, what the confounders will be — because a confounded measurement costs
the same to take as a clean one and answers nothing.** The one sentence that would have saved this:
*the before and after must come from comparable work in one repository.*

## R4 — A change to the bytes a directive crosses on invalidated 38 delivered scenarios across five milestones, and the story's own review reported the affected surface as 220/220 green

70/06's transport fix was correct, measured and necessary — production is provably fine, the live
transcript holds the directive as one message with no protocol byte in the content. It nonetheless
turned red 38 scenarios belonging to milestones 38, 53, 54, 69 and 70, four of them already accepted.
The story's review had reported *"the affected surface is 220/220 across 22 files."*

**The affected surface was self-selected.** Twenty-plus suites each re-derived the directive from the
raw PTY write, so the true blast radius was every suite that models a spawn — a set the author could
have computed (*who calls `createFakePtySpawn`?*) and instead estimated.

Two carryable forms, and the second is the sharper one:

- **A claimed blast radius must be derived from a reference query, not from judgement.** "Who consumes
  this seam?" is answerable mechanically; an answer that was not derived should be reported as an
  estimate.
- **A shared test double is a producer-fed contract, and it drifts silently.** Twenty suites reading
  raw bytes as if they were content is twenty copies of one assumption about the producer. The repair
  was one change in one file — `pty.writes`/`rawChunk` are the wire, `chunk` is the input — because
  the double was already single-homed. **Where the double is single-homed a transport change costs one
  edit; where consumers re-derive, it costs one per consumer and each is a separate chance to be
  missed.** The repair itself proved the point twice over: the three regressions it introduced were
  all in the places that had *kept their own* copy of the strip, and fixing them meant deleting the
  copy rather than updating it.

## R5 — Chore 64's pathology recurred three times inside the milestone whose ARCHITECTURE quotes it

*A genuinely new red hides in a suite that is already expected to be red.* It happened to F-13
(70/04's control added a second violation to a rule milestone 69 had already turned red, so the new
offender was invisible), and it is the standing condition F-18 records — **45 of the 46 failures at
the final gate are inherited from a red baseline nobody owns.** Quoting the lesson in the architecture
record did not prevent it; this is not a knowledge problem.

**The carryable form: a red baseline is not a backlog item, it is an active hazard that consumes the
signal value of the whole suite.** Every gate this milestone ran had to attribute its failures by hand,
in a detached worktree at a pristine commit, to separate the inherited from the real. That attribution
is mechanical and was done by a human every time. Either the baseline gets an owner and shrinks, or
the attribution gets automated — a `known-red` ledger the runner diffs against — but "remember to
check" has now failed three times in one milestone.

## R6 — Three destructive losses of uncommitted work in one milestone, every one silent

70/05's structural review lost `ARCHITECTURE.md` to `git checkout --`. 70/06 lost the **entire 124-file
`ui/` tree** to `git worktree remove --force`, which walked a symlinked `node_modules/@aof/ui` — an
npm-workspace edge pointing back into the real tree — and deleted its target's contents. And at the
accept itself, `STATE.md` was compacted **prematurely**, destroying ~70 lines of uncommitted story
feedback that no commit, editor history or reflog holds; the gap is marked in the file because it
cannot be filled.

**Carryable form, mechanism:** an npm workspace makes `node_modules` a graph with edges back into the
source tree, so `rm -rf` on any directory containing one is not a local operation. Copy the dependency
tree, set `NODE_PATH`, or work from a clean clone — never link from a disposable directory into the
real one.

**Carryable form, recovery:** after a destructive accident, *"git status is clean"* is not
*"recovered."* Git knows only about tracked files, so it cannot tell you which build artifacts, caches
or `node_modules` you also destroyed. The check that closes an accident is re-running the suite and
comparing against the known-good failure set.

**Carryable form, and the one that would have prevented all three:** *uncommitted work has no undo.*
Every one of these losses was of content that existed only in the working tree. A destructive
operation against a tree carrying uncommitted work needs a copy first — not a plan to be careful.

## R7 — Doing the accept work before the accept destroyed data and proved nothing

`OUTCOME.md`, `RETROSPECTIVE.md` and the `STATE.md` compaction were authored while the milestone was
still `in-progress`, 70/06 was still `in-review`, and the gate that would justify accepting was still
running. They had to be removed, and the compaction took ~70 lines of feedback with it (R6).

The ordering is not ceremony. **These three artifacts assert that a delivery happened; writing them
before the evidence exists means writing a claim you cannot yet support** — which is the exact defect
F-11 and F-12 refused this milestone for, committed by the gate that refused it. The previous gate's
own accept block had already written the rule down: *"no `OUTCOME.md` and no `RETROSPECTIVE.md` are
authored for the milestone… all three belong to accept, and there is no accepted delivery to state."*

**The carryable form: the status transition is the gate, not a formality that follows the paperwork.**
Author the record after `aof work status <ref> done` succeeds, never before — and treat a written-down
rule from ten minutes ago as binding on the person who wrote it.

## R8 — The budget bound at accept, and the first thing it refused was the milestone that invented it

ADR-007 (70/03) makes the artifact budget refuse a `→ done` transition rather than warn about it. At
the accept, recording the ADR-004 amendment that F-21 required pushed `ARCHITECTURE.md` to 740 lines
against its own 700-line budget — and the transition could not proceed until the document was
compacted back to exactly 700.

That is the control working, and it is worth recording as a *positive* rather than as friction. The
document earned its addition by giving up prose that had stopped paying: a verbatim CLI help block
compressed to the one sentence that was load-bearing, and a measurement table replaced by a citation
to the finding that holds it in full. **The carryable form: a budget that binds converts "should we
write this down?" into "what is this worth more than?" — the question that keeps a record readable.**
A budget that only warns never asks it.

## R9 — The one `@uat` scenario in seven stories was the only thing that could answer the milestone's actual question

Six of seven stories carried no human-acceptance scenario, correctly — they are technical and their
contracts are machine-checkable. The seventh asked a human to read the delta and say whether it
answers *did this pay for itself*. No suite could have answered that, and the honest answer was no.

**The carryable form: reserve `@uat` for the question whose answer is a judgement about whether the
evidence is sufficient, not for re-checking behaviour a test already covers.** One such scenario in a
milestone is not too few; it was the highest-value gate this milestone had, and it produced the
finding (`m70/F-22`) that bounds every claim the milestone makes.

## R10 — Every finding re-measured at a gate rather than re-read had moved, and the ones that mattered most inverted

F-11's 244-character brief became 7,298 characters carrying the contract index. F-02's remedy landed
and the control went red again from a *different* cause (F-14), which would have read as "the fix did
not work" to anyone carrying the earlier note forward. F-06's two controls were green at the following
gate, discharged by another lane's later fixes. F-09 was fixed between gates, making a delivered
Examples row predict behaviour the code no longer had (F-27).

**The carryable form: a finding's status is a measurement with a shelf life, and the shelf life is one
gate.** Every finding carried across a gate boundary was re-measured rather than trusted, and doing so
changed the disposition of four of them. Carrying a status forward on trust is how a closed finding
becomes a false claim and an open one becomes a phantom.
