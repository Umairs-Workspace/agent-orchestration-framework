# 04 · The desktop stops what it supervises — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### The desktop lists the loops it supervises
The desktop's view model carries `loops: [{ id, label, signal }]`, one per supervised declaration from the signals map and the last answered declarations tick, and the window renders them as a second `.controlbar` (`loop <scope>`, the daemons' ramp pill, one stop control, no Start), absent when there are none.

### A desktop Stop is the request first
`stop_loop(id)` on a declaration places the hold and spawns `aof work loop <scope> --stop` (the argv formed in `core` by `stop_argv`, never in the shell — FF-13007); a second press escalates to cancel, the pill reads `stopping`, and a failed spawn is a footer notice.

### The ladder is a pure, tested decision
`stop_step(presses, since_cancel_ms, grace_ms, exited)` in `core/supervision.rs` decides Request / Cancel / Wait / Kill / Done, with `STOP_GRACE_MS = 30_000` counted from the cancel; the shell applies `taskkill /PID <child> /T /F` then waits on a `Kill`, and never `start_kill`s a declaration.

### The desktop attaches to a loop it did not start
A declaration whose relaunch is refused `duplicate-run` and which has not been pressed attaches instead of reading dead: it shows `running`, spawns nothing more, and each press runs the `--stop` verb with no grace and no kill rung (130/ADR-007).

### A stopped loop is not relaunched
The declarations producer reads each candidate's stop request and hands `decideSupervisedDeclarations` a `stopped` set of honoured `loopRunId`s, so a stopped loop yields no row until `--resume` clears the mark; `src/work/loop.mjs` gains no import (FF-13004).

## Assumptions

- **The row's scope is `argv[2]` of its own admitted argv** — `stop_argv` reads it from the declaration's argv, never re-parses it.
- **A declaration's clean exit holds** — the controller's existing clean-exit hold is what stops the ADR-004 §6 relaunch storm for a console-started `--supervised` loop.

## Gaps

### The kill rung has not been seen live
- **Status:** open
- **Discharge condition:** a loop the desktop itself spawned is stopped from its row and does not answer within the grace, and the `taskkill` + wait is read at the source (m130/F-12).
The decision is cargo-tested and red-probed. The shell's application of it has no live observation, and an attached row has no kill rung.

### After a tree kill, nothing records the stop
- **Status:** open
- **Discharge condition:** an ADR decides who marks a killed loop's request honoured and settles its run (m130/F-09).
The request stays `requested` at level 2, the run stays `running` until stale, and the row stays held until `--resume`.

### The loop bar has no overflow rule
- **Status:** open
- **Discharge condition:** DESIGN §Surface 2 states a wrap/overflow rule (m130/F-08).
At 760px roughly four rows overflow the frame.
