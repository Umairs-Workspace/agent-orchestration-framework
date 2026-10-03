---
type: story
number:
slug: the-loop-hands-a-halt-to-a-fresh-session-to-fix
title: "The loop hands a halt to a fresh session to fix, then resumes"
status: not-started
owner: product-owner
created: 2026-10-03
updated: 2026-10-03
schema: 1
aofVersion: 0.1.0
reads: []
files: []
---
# The loop hands a halt to a fresh session to fix, then resumes

## User story

As **the operator running `aof work loop` over a milestone**,
I want **a halt to be handed, with its code and details, to a new Claude session whose only job is
to repair that cause, after which the loop resumes on its own**,
so that **a halt about the loop's own bookkeeping — a lane that will not merge or will not reopen —
no longer stops the milestone until I notice it, read the diagnostics and fix it by hand**.

## Tasks

## Notes

- **The operator's words (2026-10-03):** "if the loop detects an error, pass the error/details to a
  new claude terminal to fix".
- **What the repair session is handed:** the halt code and producer, its `Details:` line, the
  `loop-diag` log path, the lane worktree and branch, and the base and tip commits. After the
  repair it hands back to `aof work loop <ref> --resume`, on the recorded session choices (143).
- **The two halts that motivate it**, both in a downstream project's milestone 03 on
  2026-10-03, and both about the loop's own records rather than the code built:
  - `lane-merge-conflict` at 03/03 (`dispatch:merge-home:conflict`). Every lane appends its build
    notes to the one milestone `STATE.md`, so two lanes in a wave conflict at merge-home. The code
    merged cleanly.
  - `lane-open-failed` (`assignment-gate-propagation-dirty-worktree`), after
    `dispatch-lane-uncommitted-work`. The lane commit's `git add -A` captured a live
    `runs/.heartbeats.ndjson`. Once the session removed the file, the lane read as dirty, and
    cleanup and reopen both refused. This repository tracks seven such files from earlier lane
    commits.
- **Both causes are also to be fixed at source**, not only repaired after the fact: a lane commit
  never stages a heartbeat log, and the milestone `STATE.md` is merged by union (it is append-only),
  or each lane's notes stay in its own story folder. A repair session is for the halts nobody has
  foreseen yet, not a substitute for removing the ones we know about.
- **Open for refine:** which halts are handed over and which still stop for the operator (a red
  gate on the code itself may need a human); a bound on repair attempts per halt; how the repair
  session's own outcome is recorded on the run; and whether it runs in the lane or in the
  primary checkout.
