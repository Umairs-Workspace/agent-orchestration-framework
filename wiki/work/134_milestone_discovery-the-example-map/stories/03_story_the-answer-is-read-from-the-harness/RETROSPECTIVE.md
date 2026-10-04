---
doc: retrospective
updated: 2026-10-02
---
# 03 · The answer is read from the harness — Retrospective

## R1 — the write set missed records that cite the run store by line

- **Kind:** mistake · **Area:** planning · **Stage:** refine · **Owner:** architect
- **Raised by:** the 03 build, against FF-5810

**What happened.** Two shipped loop records cite `isStale` and `transitionRunReclaimed` by line.
Editing the run store moved those lines, so the records and their `.aof/loops/` copies were
re-cited outside `files:`. Lane commits drop `.aof/`, so the copies had to be committed by hand.

**Lesson.** A story that edits the run store or the transition seam declares the loop records that
cite them by line.

## R2 — the focused set alone would have shipped three reds

- **Kind:** near-miss · **Area:** testing · **Stage:** build · **Owner:** developer
- **Raised by:** the 03 build

**What happened.** The first arch sweep caught FF-5810, FF-5504 (the run store may never spell
`transcript`) and FF-5301 (a static edge widened the mesh sink's reach). The story's own `--only`
set passed with all three.

**Lesson.** A story that touches a seam with structural controls runs the arch indexes, not only
its own suites.

## R3 — an operator-gated hand-back cost a retry attempt

- **Kind:** defect · **Area:** loop · **Stage:** build · **Owner:** developer
- **Raised by:** run `20260924T141559728Z-0001`

**What happened.** The session built and reviewed tasks 00–02 and handed back for the operator. The
run was then reclaimed as `runtime_offline` and re-minted as attempt 2/3, which changed nothing.

**Lesson.** A run waiting on a person should not spend a retry attempt (69/ADR-007, deferred to 136).

## R4 — a squash that split a module left this contract pointing at deleted paths

- **Kind:** process · **Area:** planning · **Stage:** continue · **Owner:** architect
- **Raised by:** the post-142 re-gate

**What happened.** 142 deleted three modules and re-created them as core bindings with no rename
edge, so `validate 134/03` went red on a story nobody had touched. Every `reads:`/`files:` entry was
repointed.

**Lesson.** A restructure that splits a module fixes the in-flight stories' contracts in the same
change.
