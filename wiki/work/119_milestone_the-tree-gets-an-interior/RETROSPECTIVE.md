---
type: milestone
doc: retrospective
number: 119
slug: the-tree-gets-an-interior
title: "Retrospective — the tree gets an interior"
created: 2026-09-07
updated: 2026-09-07
---
# 119 · Retrospective

Milestone-level lessons. Each story carries its own `RETROSPECTIVE.md` for the lessons of its own
build; these are the ones no single story could state. Findings are **referenced**, never restated:
they live in `VERIFICATION.md`.

## R1 — "Rule the class before moving the tree" was the whole bet, and it paid in a way the framing did not predict

- **Kind:** confirmation · **Area:** sequencing · **Stage:** whole milestone · **Owner:** product owner · **Raised by:** five reproductions of the ruled defect

The SPEC forced the order: `119/00` rules the guards, then three stories move three layers, then the
god-node splits. The prediction was that the rulings would UNBLOCK the moves — a `src/<name>/` family
is illegal under a zero-import purity reading, and a move trips stored censuses.

What actually happened is stronger and was not framed: **the ruled defect reproduced inside the work
that was ruling it, at least five times** — `119/00`'s own write set was missing two entries
(`m119/R1` of that story), `119/01`'s review found four instances in one story, `119/02` found a
non-recursive walk and a second path spelling, `119/03` found four stale controls one directory over,
and `119/04`'s write set could not see four controls that store a number about the file it shrinks.

**Lesson.** When a milestone's subject is a defect CLASS, the class is the best available predictor of
where that milestone's own defects will be. Budget for finding it in your own work, and read each
reproduction as evidence for the ruling rather than as an embarrassment — the alternative reading
(that the ruling is failing) is exactly wrong, and would have stopped the milestone at story 1.

## R2 — The species has at least NINE forms, and each was found by a different mechanism — the taxonomy is the deliverable, not the count

- **Kind:** blind spot · **Area:** controls · **Stage:** whole milestone · **Owner:** architect · **Raised by:** `m119/F-15`, `F-16`, `F-20`, `F-21`, `F-34`

Item 81 named three families with six carriers. This milestone added: a stored import SPECIFIER (a
fact about where the importer sits, not about which module is meant); an `existsSync`-guarded early
return with NO subject set at all; a NON-RECURSIVE walk of a directory that has just been given an
interior; a path spelled as `path.join` argument SEGMENTS; and a control that stores a NUMBER ABOUT a
file, invisible to that file's write-set declaration. FF-11902 catches none of these, and is not wrong
to miss them — its subject is a sweep narrowed by a filename PREFIX.

**Lesson.** This is why item 81 was NOT deleted at accept despite being the milestone's own subject.
A class ruling is discharged when the class is covered, not when the ruling lands, and the count of
carriers is the least informative thing about it. Each new form was found by a different mechanism —
one by reading the readers, one by seven suites going red, one by running the tree, one by a sweep —
which is itself the finding: no single instrument reaches this class.

## R3 — Story-scoped lanes structurally cannot catch a cross-story poisoner, and this milestone measured why

- **Kind:** confirmation · **Area:** testing · **Stage:** build · **Owner:** the test face · **Raised by:** `m119/F-31`, four instances

Four reds on this branch were never 119's. Each was a shipped change that left a control ONE DIRECTORY
OVER asserting the behaviour it replaced — a registry roster, a contract list, a census. **`--scope
impacted` cannot see any of them, because the stale control's file is not in the changed set.** Two
came from a single `aof:pay-debt` session, the lane most likely to change behaviour a distant control
pins.

**Lesson.** This is the milestone-gate argument stated from the inside, and it is why the regression
gate is a refusal rather than a report. 63/R7 recorded a story lane green while the failure appeared
only at the full-suite gate; this milestone gives four more instances and names the mechanism. The
honest cost of story-scoped lanes — a poisoner caught at the gate, not immediately — is the intended
trade, and this milestone is the evidence it is the right one.

## R4 — The gate ran in a clean WORKTREE, and that is the reusable answer to a shared checkout

- **Kind:** process · **Area:** gates · **Stage:** verify · **Owner:** the operator · **Raised by:** the gate's own refusal

`aof work regression-gate 119` refuses a dirty checkout, and this tree held three other lanes' (123,
124, 125) in-flight work that this milestone had no right to commit or stash. The escape taken was
NOT `--gate-override`: a detached worktree at the accept commit, prepared through the declared
`work.worktree.prepare` step (a 12-second cache-warm `npm ci`, no cross-tree link), gave a genuinely
clean checkout to run in.

**Lesson.** The refusal message already names this option and it should be the default reading of it,
because the override's honest use is an ENVIRONMENT that cannot host the run — never a checkout that
merely has someone else in it. On a machine where several lanes share one tree, the clean worktree is
the gate's normal habitat rather than its fallback. It also costs almost nothing: the install is
cache-warm and the prepare script exists precisely to make it safe.

## R5 — A measurement claim needs its command AND proof the command is not narrower than the class

- **Kind:** blind spot · **Area:** contract · **Stage:** refine · **Owner:** the amigos · **Raised by:** ADR-004's own numbers, twice

The rule "every number carries the command that produced it" held throughout and was not enough.
ADR-004's 157/175/20 never reproduced — the contract re-measured 163/188/21 and the build measured
357/8,249/77. `tasks/00`'s Examples table named eleven purity sites in nine files; widening the
extractor to two more spellings found thirteen in eleven. Both times the command was recorded, and
both times the command was narrower than the class its row named.

**Lesson.** Add the second half: show the extractor is not narrower than the class. The cheapest
version is to run two independent extractors and reconcile the difference — which is exactly what
found the two extra purity guards, and exactly what nobody did for ADR-004.
