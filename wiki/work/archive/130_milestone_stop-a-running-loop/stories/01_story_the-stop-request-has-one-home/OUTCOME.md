# 01 · The stop request has one home — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### A durable stop request per loop, in the aof home
A loop's stop request is one ten-key JSON file at `<meshRoot>/loop-stops/<loopRunId>.json` (honouring `AOF_GLOBAL_HOME`, never under a checkout), written through `writeText`'s temp-and-rename, and read absence-tolerantly — a corrupt file reads `null` after a degrade report.

### The two-rung ladder and its lifecycle
`requestLoopStop` creates a request at level 1 (drain), escalates it once to level 2 (cancel) stamping `escalatedAt`, is idempotent at 2 and leaves an `honoured` request unchanged; `markStopHonoured` and `clearStopRequest` close `requested → honoured → cleared`, with `STOP_LEVELS` and `STOP_STATES` the one map from level and state to word.

### One interrupt source for the running loop
`createStopSource` composes the process's own SIGINT/SIGTERM with the file on an unref'd poll: either raises the level 1 → 2, `producer()` names whichever raised it first, one `AbortSignal` aborts at level 2, and a third signal reaches node's default because the source's listeners are then removed.

### `src/loop/stop-request.mjs` is the only speller
The literal `loop-stops` and the state words `requested`/`honoured` are spelled in this module and nowhere else under `src/` (FF-13001, red-probed).

## Assumptions

- **The source reads the file's LEVEL, not its state** — a request already marked `honoured` still halts a loop that reads it, which is what lets a between-drives stop answer "not live" and still stop the next tick.
