---
type: story
number: 06
slug: the-loop-launch-is-watched-as-a-loop
title: "The loop launch is watched as a loop — the composed unattended launch stops being handed the session-shaped transcript watch over the worktree it writes its own sessions into"
parent: 63
status: done
owner: product-owner
created: 2026-09-02
updated: 2026-09-02
depends: [63/03]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-013, src/agent-session-driver.mjs, src/work-loop.mjs, src/commands/drive.mjs, src/workspace.mjs]
files: [src/mesh-worker-execution.mjs, test/mesh-assignment-loop-directive.test.mjs, test/arch/acd-assignment-resolves-to-a-loop-call.test.mjs]
---
# 06 · The loop launch is watched as a loop

## User story

As the operator who dispatches a milestone to a worker machine and walks away,
I want the unattended loop run to be watched as a PROCESS rather than as a claude session,
so that the run I am not watching ends when the loop ends, instead of being killed ten seconds into
its first rung and reported to me as a success.

This story exists because 63/03 shipped a live wake that terminates after one rung, and the milestone's
own `ARCHITECTURE.md#ADR-013` §1 says so in terms: *"The block sits at the MILESTONE gate: 63 is not
acceptable while this is open."* 63/03 may merge with it open — no edit permitted inside that story's
contract fixes it, and the fix has to build on its landing — so the routing lands here.

**The defect is a COMPOSITION defect, not a defect in anyone's diff.** `driveInteractiveClaudeSession`
arms the session-id watch over `claudeProjectsDir({ cwd: brief.worktreeCwd })` and takes the FIRST NEW
`*.jsonl` basename to appear. The worker passes `worktreeCwd: worktreePath` and forwards both watch
seams bare, so production gets the real defaults. But an unattended `aof work loop` writes ITS OWN inner
sessions into that same directory — the inner `aof` process's cwd IS the worktree — so the default binds
this run to the loop's FIRST INNER session, whose finished turn is a DECLARED completion, and the
driver kills the PTY running the loop about ten seconds later and reports `done`.

**The fix is caller-side and edits no machinery.** ADR-013 §1's precedent is in the same module and was
written for the same class of reason: the resume path already overrides `watchTranscriptSessionId`
because *"the default watch looks for a NEW transcript file, which never appears on a resume"*. A loop
launch is the mirror image — the default finds the WRONG new transcript file. Supplying a seam VALUE
appropriate to the launch kind is not editing completion detection; it is using the injection point that
machinery already exposes.

**What settles a loop run instead is `term.onExit`, and this story takes that answer rather than
inventing one.** ADR-013 left it open, and the honest reading is that it is already answered: the loop
PROCESS exits, unlike an interactive `claude`, so the driver's delivered exit mapping applies with no
edit — exit 0 settles `done`, non-zero settles `failed`. `done` there means *this dispatch finished
normally*, which is the same thing it already means for a session that ends without the sentinel; it has
never meant *the item is complete*, and a loop that halts on a member of `LOOP_STOPS` leaves the item's
own status telling the truth and `aof work loop <scope> --resume` as the continuation. No thirteenth
stop, no new completion signal, and no halt vocabulary is authored in the mesh files.

## Tasks

- [x] `tasks/00_a-loop-launch-is-not-watched-as-a-session.feature` — the composed loop launch is handed watch seams that bind nothing over the run's own worktree, the session-shaped default is proven to have bound that very directory, a session assignment is handed exactly what a delivered tree hands it, and an injected seam still wins

## Notes

**ADR-013 §3a is the whole of the relaxation, and it is a SPLIT rather than a shortening.**
`watchTranscriptSessionId` and `watchTranscriptCompletion` — and only those two — become
launch-conditional; `ptySpawn`, `which`, `onOutputChunk` and `onSessionEnd` stay bare shorthand and
`FF-6306`'s fence still fails on a fifth that stops being one. The two relaxed names are pinned to the
ONE expression they may take, so "launch-conditional" cannot quietly become "reads a gate", "reads the
declaration" or "picks a program" — and the red probe for the relaxed form is the revert to bare
shorthand, which is exactly the shape that reinstates the defect.

**An injected seam wins over the loop shape.** What the loop shape replaces is the session-shaped
DEFAULT the driver would otherwise reach; a caller that supplies its own watch keeps it. A launch kind
that made a supplied producer inert would be TECH_DEBT item F12's species in the one place this
milestone can least afford it.

**The observability cost is real and is named rather than hidden.** With no session id, the fleet mirror
drops this run's terminal frames (ADR-014 invariant 4). That trades a FALSE binding — frames stamped
with an inner session's id, on a run killed ten seconds in — for no binding, which is the honest state:
a loop process has no claude session id. Routing an unattended loop's output is its own arc and is
recorded as a gap on this story's `OUTCOME.md`, not smuggled in here.
