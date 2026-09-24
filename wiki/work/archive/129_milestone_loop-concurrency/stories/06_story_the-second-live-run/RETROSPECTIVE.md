---
type: story
doc: retrospective
number: 06
parent: 129
slug: the-second-live-run
title: "Retrospective — the second live run"
created: 2026-09-22
updated: 2026-09-22
---
# 129/06 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`. This story took
three live runs over eight days (`F-58`–`F-68`), and its shape is unusual: the deliverable was a
MEASUREMENT, so every defect it found was in the thing being measured rather than in the story's own
code. Two of its three tasks were `@bug` tasks added mid-story from the runs themselves.

## R1 — A story whose deliverable is a live measurement cannot be finished by its lane

- **Kind:** process · **Area:** `@manual` stories · **Stage:** build → verify · **Owner:** product-owner · **Raised by:** the door

**What happened.** The story's one contract task is `@manual` and names the OPERATOR as its
performer: a real `aof work loop` over a real wave, hours of real Claude sessions, plus a
hand-edited conflict mid-run. Nothing an agent lane does can produce that, so the story sat
`in-review` from 2026-09-14 to 2026-09-22 while three separate operator runs happened around it,
each read at a door afterwards.

**Lesson.** When a story's `Given` names the operator, the lane's job is to prepare and to measure,
and the ACCEPT is a judgement about evidence rather than a check. Say so in the story's Notes at
refine (this one did), and expect the accept to need a ruling — which is what happened here: the
door offered accept-with-gaps versus hold-for-a-fourth-run, and the operator chose accept.

## R2 — Fixtures prove the code path; only a live run proves the wiring, and the gap between them is where every defect of this story lived

- **Kind:** insight · **Area:** live verification · **Stage:** verify · **Owner:** the team · **Raised by:** the three attempts

**What happened.** Every defect the three runs found had a green suite over it the whole time.
`F-59` (the liveness probe racing the driver's own requested stop), `F-58` (a provider's usage-limit
wait read as silence and killed after 15 minutes), `F-63` (node-pty's console-list kill agent
reaching the loop through a shared console) and `F-64` (the same juncture on the sequential rung)
are all wiring, timing and platform facts that no in-process fixture had any reason to model.

**Lesson.** This is the milestone's own thesis, now with its own evidence: `59`'s `@manual` lane
exists because a green lane and a working system are different claims. Budget for it — a live run
of a concurrency feature is not a formality at the end, it is where a third of the defects are.

## R3 — The conflict drill stayed unperformed for three runs because nothing made it cheap

- **Kind:** near-miss · **Area:** live verification · **Stage:** verify · **Owner:** the operator · **Raised by:** the accept

**What happened.** Five of task 00's six scenarios were measured across the three attempts. The
sixth — force a merge conflict by hand-editing, in the primary, a file a lane also changed — was
never performed, because it requires a live two-member wave AND a deliberate interleaved edit at the
right minute. It is accepted as an open gap in `OUTCOME.md` with a named discharge condition, on the
strength of a real-git fixture (`test/loop/loop-command-wave.test.mjs`), FF-12904's red probe, and
attempt 2's live `--resume` over already-merged lanes.

**Lesson.** A `@manual` scenario that needs the operator to act DURING a long run should be scoped
so the acting is cheap — a drill the operator can run against a scratch lane in minutes, rather than
a window they must catch inside a five-hour loop. Where it cannot be, expect it to be the clause
that survives unmeasured, and decide at refine whether a fixture plus a ratified gap is the intended
answer rather than discovering that at the door.

## R4 — The diag log did not say which tree it was diagnosing

- **Kind:** defect · **Area:** observability · **Stage:** verify · **Owner:** developer · **Raised by:** `F-65`

**What happened.** `aof.exe` is a payload-first launcher, and the payload was re-stamped MID-RUN on
2026-09-21. Nothing in 615 lines of `loop-diag` could say whether the loop had loaded the payload or
the npm-linked worktree, so "which code ran" was unanswerable after the fact. Fixed here: the
`start` line carries `build=<aof --version string>`, degrading to `unknown`.

**Lesson.** A diagnostic log's first line should identify the artifact, not just the process. Any
log written to explain a failure across a deploy boundary needs the build stamp, because the tree on
disk at reading time is not the tree that ran.
