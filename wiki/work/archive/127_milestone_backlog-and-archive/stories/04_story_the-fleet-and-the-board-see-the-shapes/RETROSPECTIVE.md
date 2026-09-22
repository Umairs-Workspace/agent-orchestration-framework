---
type: story
doc: retrospective
number: 04
slug: the-fleet-and-the-board-see-the-shapes
parent: 127
title: "Retrospective — the fleet and the board see the shapes"
created: 2026-09-17
updated: 2026-09-17
---
# 127/04 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced,
never restated (`../../VERIFICATION.md`).

## R1 — A schema bump is a deploy that cannot wait for the restart

- **Kind:** process · **Area:** deploy · **Stage:** verify · **Owner:** the operator · **Raised by:** `F-25`

**What happened.** The npm-linked CLI migrated the live projection to schema 9 the first time any
`aof work` verb ran after this story merged; the running control daemon (pre-v9) then refused the
store on every request, and the fleet was dark until the app was restarted.

**Lesson.** Bumping `GLOBAL_WORK_SCHEMA_VERSION` is the one change where "install, then restart
when convenient" is wrong: restart first, or expect the old daemon to be down from the next CLI call.

## R2 — The seam derived a fact from the ref, and a remote node believed it

- **Kind:** defect · **Area:** cache · **Stage:** refine · **Owner:** architect · **Raised by:** the refine's contact with `src/work/read.mjs`

**What happened.** `cacheOnlyItem` derived `number` FROM THE REF, so a remote node rebuilt a backlog
slug as `number: "gamma"` — a live row — and never rebuilt `archived`. Neither fact had a column;
the refine found it by reading the seam, not from the SPEC, and the module joined the write set.

**Lesson.** A row shape that gains a new kind of member (un-numbered, archived) has to be traced
through every REBUILD of that row, not only every read — the seam that reconstructs a row from a
ref is where a derived fact becomes a lie.

## R3 — Pins outside the write set, and a design paragraph that contradicted its checklist

- **Kind:** process · **Area:** refine · **Stage:** build · **Owner:** product-owner · **Raised by:** `F-14`, `F-26`

**What happened.** FF-5307's two digests, FF-5301's reach count and shell/12's asker list all moved
with this story and none was declared; DESIGN §Surface 2's VIEW 2 prose said "pill left of the
stale badge" while its own binding checklist and task 04's last scenario said
`[stale][archived][chip]` — built to the checklist, corrected at verify.

**Lesson.** The checklist IS the baseline (07/ADR-003) and prose that restates it is a second
source that drifts; and a UI story's write set includes the digest pins that read `ui/` and the
board seam.
