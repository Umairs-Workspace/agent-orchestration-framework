---
type: story
doc: retrospective
number: 06
slug: the-live-stop
parent: 130
title: "Retrospective — the live stop"
created: 2026-09-24
updated: 2026-09-24
---
# 130/06 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced, never
restated (`../../VERIFICATION.md`).

## R1 — The live run found two blockers every suite had passed

- **Kind:** defect · **Area:** verification · **Stage:** verify · **Owner:** product-owner · **Raised by:** m130/F-01, m130/F-02

**What happened.** With every scenario green, the first live `--stop` addressed a dead loop resurrected
by an operator's `aof work resume` (the retry carried `brief.loop`), and the desktop could not stop a
loop it had not started (its controller relaunched and walled). Both were fixed in this story's window.

**Lesson.** The `@manual` live story is the milestone's real acceptance, not a formality after the
build: budget it as a story that will find and fix defects, and run it on the machine's real history
(old runs, other sessions' loops), which is exactly what the fixtures did not contain.

## R2 — An operator-gated story cannot close in the session that builds it

- **Kind:** process · **Area:** loop · **Stage:** build · **Owner:** the operator · **Raised by:** m130/F-04

**What happened.** The contract names the operator for the restart, T1 and the clicks; the 2026-09-21
wave dispatched it into a lane anyway, spent a mint, and died. The 2026-09-23 build wrote the procedure
and paste slots, then the operator and agent ran the legs together over four hours.

**Lesson.** A story whose every leg is operator-gated should be held out of the wave (`needs-operator`)
and run as a paired session; the agent half is procedure + source reads, the operator half is presence.

## R3 — Observe the signal the system actually emits, not the one the procedure assumed

- **Kind:** defect · **Area:** verification · **Stage:** verify · **Owner:** product-owner · **Raised by:** m130/F-14

**What happened.** Leg 3's watcher keyed on a `Driven …` line between drives, which the loop only
prints at the halt; the real gap signature was `exit-confirmed` → next `Driving`, 0.3–0.5 s wide —
narrower than a spawned verb takes to land. The fourth arming fired the CLI's `run()` in-process on the
run record turning terminal.

**Lesson.** Before arming a timed observation, read one full cycle of the log it keys on and measure
the window; a procedure written from the design will name lines the running system does not print there.

## R4 — The contract's placeholders drifted with the tree's identity work

- **Kind:** process · **Area:** refine · **Stage:** build · **Owner:** architect · **Raised by:** 130/06 build

**What happened.** Task 00 printed `win-host-a` / `umamis-mac-mini` where the source now prints
`node-7297` / `node-9549` (f76c153's rename, then 132's opaque ids), and scope `00` had no stories on
disk; each was read and recorded, not amended.

**Lesson.** A live-run contract should name the reading to take (`meshNodeIdOf()`, "the scope `--dry-run`
answers `ready` for"), not the value it read on the day it was written.
