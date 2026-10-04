# 03 · The loop runs each phase on the chosen model — Outcome

## Delivered

### The loop takes a model and an effort per phase
`aof work loop` accepts a repeatable `--model [<phase>=][<model>][:<effort>]` and `--thinking [<phase>=]<level>`, parsed by 143/02's grammar before anything is read or written. A refused choice stops the loop at its door with no declaration, no run record and no session.

### The run record says what each phase ran on
The loop resolves all three phases once. Each run's declaration carries `sessions`, one `{ model, modelSource, effort, effortSource }` per phase, and every LoopState answer carries the table. `thinking` keeps 141's meaning (the unphased level or `null`). Before the first drive the loop narrates `Sessions: refine … ; continue … ; verify … .`, and the dry-run probe carries the same table.

### Each drive runs on its own phase's choice
Each drive's session gets its phase's model and effort, read off the declaration by one engine function (`sessionLendFor`) at all three seams: in-process, the primary's child, and a wave lane. A child gets them as `--model` / `--thinking` on its argv. `aof work drive <phase> <ref> --model <choice>` is the single-phase door.

### A resume reruns on the recorded choices
`aof work loop <ref> --resume` re-applies the recorded flag choices and re-resolves the config and default entries. Any new session flag replaces the recorded flag set as a whole.

## Gaps

### Three rows are evidenced piecewise, not through a running loop
- **Status:** open
- **Discharge condition:** a loop-level case drives a wave lane, a resumed refine and a supervisor relaunch, and asserts each spawned session's model and effort.
Task 01's wave-lane row and task 02's resumed-refine and supervisor-relaunch rows are proven by a source match plus `sessionLendFor` and the resume rule, not by an end-to-end loop run (F-143-03).
