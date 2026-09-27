---
type: milestone
doc: retrospective
number: 129
slug: loop-concurrency
title: "Retrospective — loop concurrency"
created: 2026-09-22
updated: 2026-09-22
---
# 129 · Retrospective

Milestone-level lessons: what this milestone learned that no single story's retrospective states —
the seven story retros (33 `R<n>` between them) hold the per-story craft. Findings are **referenced**,
never restated; they live in `VERIFICATION.md` (`F-01`–`F-77`). The shape of the run: seven stories
over ten days, 01–05 and 07 built and accepted in lanes, 06 a live measurement that took three
operator runs, and a milestone gate that took seven whole-tree runs to get a verdict this door could
read.

## R1 — The milestone's own thesis proved itself twice: fixtures prove the path, a live run proves the wiring

- **Kind:** insight · **Area:** verification · **Stage:** whole milestone · **Owner:** the team · **Raised by:** 06's three attempts and the gate's seven runs

**What happened.** 129 was framed from four loop defects found in one day of live running, and it
closed the same way. Story 06's three live runs produced `F-58`, `F-59`, `F-63` and `F-64` — a
liveness probe racing a requested stop, a provider's usage-limit wait read as silence, and a
console-scoped kill agent reaching the loop — every one with a green suite over it throughout. Then
the milestone's own gate found `F-72`: the whole-tree suite had been dying on `EADDRINUSE :4182`
before its integration and cargo lanes for as long as the fleet daemon has been up, and the gate's
name-only row could not say so. Three gate rows were read as "contention" before one raw run with
stderr retained named the actual assertions.

**Lesson.** Where a system's behaviour depends on processes, ports, consoles and clocks, the
suite's green is a statement about the code path and nothing more. Budget a live run per
concurrency-shaped milestone, and when a gate is red, get the assertion's MESSAGE before naming a
cause — `regression-gate` records case names only (`F-71`, and the follow-on it routes).

## R2 — A whole-tree gate is a census of everyone else's drift, and the door pays for it

- **Kind:** process · **Area:** gates · **Stage:** verify · **Owner:** product-owner · **Raised by:** gate runs 1–7

**What happened.** Seven runs, roughly six hours of wall clock, to get one green-able verdict. Of
the reds, exactly zero were 129's: two came in with 130/02's lane commit the night before (`F-69`),
one was 130's own control contradicting the repair (`F-69`), four were the launching shell's
`GIT_ASKPASS=""` (`F-71`), one was the port binder (`F-72`), five were 127/05's tree-shape suite
pinned to a tree that 127's own accept and archive changed (`F-73`, `F-74`, `F-76`), and one was a
timing case that reds one run in three (`F-77`). Every one was repaired at its owner by this door,
because 119/R4's rule holds: an inherited red that is mechanical is the door's to fix, not to route.

**Lesson.** The gate is not a formality and it is not cheap; treat the first red row as the start
of a census, not as a result. Two structural contributors are worth fixing: whole-tree suites
pinned to counts of the live tree (127/05's link ratchet and board-face cases) will red on every
later accept and archive, and a gate row that carries names but no messages costs a whole run to
diagnose.

## R3 — Accepting a milestone changes the tree that the next milestone's gate measures

- **Kind:** insight · **Area:** work stream · **Stage:** verify · **Owner:** the team · **Raised by:** `F-74`, `F-75`, `F-76`

**What happened.** 127's accept left a `done` milestone at the root, which 127/05's own control
forbids — so every gate after it was red until the operator ran `aof work archive 127`. The archive
then redded two more of the same suite's cases: one named 127 as THE live milestone with stories,
the other counted 127's own link-syntax examples as newly broken links into `archive/`. Separately,
the backlog story captured at 127's accept carried `aof:add-story`'s scaffold (`reads: []` +
`files: []`), which `validate` refuses by design — so a captured idea reds the whole stream until
someone refines or trims it.

**Lesson.** The accept ceremony and the archive are one act in practice even though 127/ADR-004
separates them deliberately; leaving them apart means the next milestone's door pays. Either
archive at accept, or expect the next gate to open with that red. And a scaffold that writes the
exact shape a validator refuses is a trap for every capture (`F-74`'s routed item).

## R4 — The architect's departure from the SPEC was the milestone's most load-bearing decision

- **Kind:** insight · **Area:** architecture · **Stage:** refine · **Owner:** architect + PO · **Raised by:** ADR-001 §5

**What happened.** The SPEC proposed that under `refine_first`, `orchestrated` mode drive a
milestone-level `/aof:continue` and `solo` mode spawn lanes. The architect refused the split: the
loop ALWAYS owns the fan-out, and `work.agents.mode` governs only what a lane's session spawns. The
PO ratified it on three measured reasons — the orchestrated path would be a second, prose-only home
for merge-back; a primary-tree grade leaks the operator's concurrent edits at any grain; and this
repository is `orchestrated`, so the SPEC's own verifiable outcome would have been unreachable here.

**Lesson.** A SPEC's scope section is a proposal, and an architect who measures it and departs is
doing the job. What made this work was that the departure arrived with its three reasons and a
reversibility statement, and the PO ratified it in the record rather than the ADR quietly winning —
so the SPEC still reads as the proposal it was.

## R5 — A story whose deliverable is a live measurement needs a different accept, and the operator has to be in it

- **Kind:** process · **Area:** `@manual` stories · **Stage:** verify · **Owner:** product-owner · **Raised by:** 06 (see its own R1/R3)

**What happened.** 06 sat `in-review` for eight days while three operator runs happened around it,
and its accept was finally a ruling — accept on the readings with four live-measurement gaps
recorded, or hold for a fourth run — put to the operator and answered. One scenario (the forced
merge conflict) was never performed in any run, because it needs a deliberate hand-edit inside a
live five-hour loop.

**Lesson.** When a milestone's proof is a live run, plan the accept as a decision with options
rather than as a check, and scope the operator-acted scenarios so the acting is cheap. The
alternative is what happened here: the cheapest scenario to state was the most expensive to perform,
and it is the one that shipped as a gap.
