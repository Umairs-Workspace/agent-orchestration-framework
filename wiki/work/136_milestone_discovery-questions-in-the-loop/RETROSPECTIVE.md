---
doc: retrospective
updated: 2026-10-04
---
# 136 · Discovery questions in the loop — Retrospective

## R1 — the live run found what every green suite could not

- **Kind:** mistake · **Area:** technical · **Stage:** verify · **Owner:** architect
- **Raised by:** `aof:verify 136`, the `@manual` live run

**What happened.** 01 and 02 were green, and 131's ask detection had its own green suites. The
first live run timed out twice in front of a correctly asked question: Claude Code 2.1.288 writes
a pending `AskUserQuestion` to the transcript only once it is answered, and every suite fed the
detector a transcript that already held the call (F-136-02, story 03).

**Why.** The suites encode the harness's behaviour as it was measured in July. Nothing re-measures
it when Claude Code updates.

**Lesson.** A detector that reads another program's on-disk output keeps a live probe of that
output, re-run when the program's version changes, not only fixtures written from an old
measurement. The `@manual` live run is what paid for itself here; do not trade it for a story lane.

## R2 — main's reds rode three milestones on overrides

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner
- **Raised by:** `aof:verify 136`

**What happened.** 142's squash left FF-11903, 119/00 task02, FF-5204 and the stale-reads count red
on `main`. 134 and 135 accepted over them with gate overrides; 136 traced the cause in under an
hour (the squash dropped PR #5's renames and forwards) and fixed it at the source (F-136-01).

**Lesson.** An inherited gate red is fixed by the next milestone that meets it, not overridden
again. An override names an environment that cannot run the gate, never a defect someone else
introduced.

## R3 — a failed `cd` ran a checkout in the primary tree

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner
- **Raised by:** `aof:verify 136`

**What happened.** The gate worktree had been removed. `cd <worktree> && git fetch …; git checkout
--detach FETCH_HEAD` ran the checkout in the primary checkout, detaching it for nine seconds. The
branch never moved and nothing was uncommitted, so nothing was lost.

**Lesson.** Run every git command that changes a checkout with `git -C <path>`, never after a `cd`
chained with `;`, and list `git worktree list` before reusing a worktree by name.
