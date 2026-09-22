---
type: milestone
doc: retrospective
number: 127
slug: backlog-and-archive
title: "Retrospective — backlog and archive"
created: 2026-09-17
updated: 2026-09-17
---
# 127 · Retrospective

Milestone-level lessons — the ones no single story's retrospective states. Story lessons live in
`stories/*/RETROSPECTIVE.md` (01's carries the loop-harness lessons R4–R7 of the cascade that built
it). Findings are **referenced**, never restated: they live in `VERIFICATION.md`.

## R1 — The whole-tree gate bills the last milestone to reach the door for every lane's residue

- **Kind:** process · **Area:** gates · **Stage:** verify · **Owner:** the operator · **Raised by:** the gate's first run

**What happened.** Gate run 1 was red on 26 reproducible cases, and FIVE were this milestone's
(`F-13`, `F-14`, `F-15`). The other 21 were the public-root cut (`F-16`), 129/06's eighteenth driver
export (`F-18`), 130's plans and briefs (`F-19`, `F-22`), the docs-site suites (`F-20`), 129's
known fixture red (`F-21`) and 42's un-stamped import (`F-23`) — every one on the same branch,
none with a gate run between its landing and this door.

**Why.** `127-129` carries three milestones and a site, the gate runs at a milestone's accept, and
the first accept after five days of lane commits inherits every red those commits left. The memory's
rule — inherited reds are the door's to repair when mechanical — held, and it cost the afternoon.

**Lesson.** A branch that carries several milestones needs the gate run at EVERY story merge home
(the loop's reconcile could run `regression-gate` in the lane's own worktree, where `:4182` is not
the primary's problem), or the door pays for all of them at once. Until then, the door's reader
classifies by owner FIRST and repairs by class, never case by case.

## R2 — A resolver that trusts git history breaks on a history cut, and the cut is silent

- **Kind:** defect · **Area:** controls · **Stage:** verify · **Owner:** architect · **Raised by:** FF-11903, FF-6607b, loops-ledger leg 9

**What happened.** 119/ADR-004 made the cited-path resolver answer "at HEAD, or through a rename
this repository recorded", and forbade any stored map. The public-root cut (e4c8824) removed the
history the rule leaned on; 148 archived-doc tokens went unresolvable and every register of every
archived milestone read as unresolved, with no control able to say WHY (`F-16`).

**Lesson.** "Derived, never stored" needs its derivation source to be durable. The rename ledger
(`RENAME_LEDGER_PATH`) is the documented exception: derived once, in the tool's own line shape,
read after the live records. A future history rewrite must regenerate it the same way, and the
control's note says so.

## R3 — Derived pins outside a story's `files:` — the third milestone in a row

- **Kind:** process · **Area:** refine · **Stage:** build · **Owner:** product-owner · **Raised by:** FF-5307, FF-5301, the bundle census, shell/12

**What happened.** `F-14`: five pins moved by 03 and 04 (the command census, two digests, a reach
count, a harness allowlist), none in either story's declared writes, all red at the gate. `m126/F-05`
and `m126/F-07` were the same species; `127/F-05` recorded it at 01.

**Lesson.** The controls' own registers KNOW which files they pin; the refine brief can list, per
declared write, the pins that read it (a byte digest, a count, an allowlist) and make the story
declare them. Until it does, a story that adds a bundle member, touches a frozen seam or asks a
harness for more than its default declares the pin by hand.

## R4 — A suite that stores a fact about the tree is stale the next morning

- **Kind:** defect · **Area:** tests · **Stage:** verify · **Owner:** product-owner · **Raised by:** 05's own suite

**What happened.** `F-15`: 05's suite over the real tree pinned "three live milestones", "`42` is not
an item", "every archive entry matches `ITEM_RE`", a moved-files link equality and a scaffold's
date on the day of the move; 131's framing, 42's archive as an imported milestone, the GSD-era
record's dot-name and the calendar falsified all five within 24 hours.

**Lesson.** FF-11902's rule is written for `test/arch/` controls, and it reaches behavioural suites
over the real stream exactly as hard: assert the PROPERTY the scenario protects (the partition, the
equality with a derived set, the floor), and date a fixture with today's date.

## R5 — The objective tax, measured to the character

- **Kind:** defect · **Area:** briefs · **Stage:** refine · **Owner:** architect · **Raised by:** 70/05's stream-wide brief test

**What happened.** `F-22`: 130's `## Objective` alone exceeded the 8,000-char brief ceiling; 127's
and 129's took half of it; ADR headings ran to 320 chars; and the packer prices the section below
`tasks` at exactly its best form while its own ~1,000-char notice grows, so the architecture slice
lands ~50 chars short of naming every declared id with ~1,300 chars unspent. 126/R1 named the tax;
this is its mechanism.

**Lesson.** Two document rules until the packer is fixed: a milestone's `## Objective` carries the
argument and points at a `## Measured facts` section for the table; an ADR heading is a short
title with the sentence as a lede. The packer's fix is a design change (the below-need must include
the notice's growth; the condenser must read `### Decision`), and it is the architect's.

## R6 — Nothing runs the plan-restatement ban at refine

- **Kind:** process · **Area:** refine · **Stage:** refine · **Owner:** product-owner · **Raised by:** FF-9603

**What happened.** `F-19`: eight `PLAN.md` files across 127 and 130 listed whole `--only` suite
sets, and the ban is a stream property, so any refine since 96 could red every later gate.

**Lesson.** `aof:refine` writes the plan; it should run `restatementViolations` over what it wrote
before it hands back, exactly as it runs `aof work validate`.

## R7 — The loop's headless commits bypass two guards

- **Kind:** defect · **Area:** loop · **Stage:** build · **Owner:** the operator / 129 · **Raised by:** the pre-commit guard, FF-12405

**What happened.** `F-12`: lane commits run `git commit --no-verify`, so nine run records carrying
the private node id are on the branch and the guard first spoke at this door. `F-13`: the reconcile
resets `.aof/` before committing a lane, so 03's re-stamped lock never reached the branch.

**Lesson.** A headless commit needs the guards the interactive one has: run the private-terms scan
in the reconcile, and carry tracked `.aof/` files (the lock) through it. Both are 129's loop.

## R8 — A schema bump makes the deploy window loud

- **Kind:** process · **Area:** deploy · **Stage:** verify · **Owner:** the operator · **Raised by:** the fleet at `:4181`

**What happened.** `F-25`: the npm-linked CLI migrated the live store to schema 9 the moment 04
ran; the running daemon (pre-v9) then refused the store outright and the fleet was down until the
operator restarted the app.

**Lesson.** Every deploy needs a restart; a schema bump needs it BEFORE the next CLI call. The
installer's hand-back should say "restart REQUIRED — projection schema 8 → 9" when the constant moves.

## R9 — The move ran with its dependencies in review

- **Kind:** process · **Area:** loop · **Stage:** build · **Owner:** the operator · **Raised by:** 05's task 01 Given

**What happened.** `F-28`: task 01's Given reads "stories 01–04 accepted"; the loop's
`--through-review` walk offered 05 once 02–04 were in review, and the lane ran the real move then.
Nothing was wrong on the tree — 02–04's code was built and reviewed — but the contract's
precondition was the accept, not the review.

**Lesson.** A story whose act is irreversible on the real tree (a 2,289-file move) should gate on
`done`, not on `in-review`: declare it in `depends:` as an accept edge, or hold it out of the wave
until its dependencies are accepted. The door restored the order by accepting 02–04 before 05.
