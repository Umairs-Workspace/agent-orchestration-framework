# 02 · The verb and the shell honour it — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### `aof work loop <scope> --stop`
`--stop` is a flag of `work:loop` that runs no foreground body: it resolves the scope's latest declaration through `src/loop/stop.mjs`'s `stopLoop`, writes or escalates the request, and answers `<scope> — stop requested (drain|cancel) for loop <loopRunId>, live|not live. <path>`; `--stop --resume` is refused `loop-stop-exclusive`, a scope with no declaration `loop-stop-no-declaration`, and a declaration whose latest run names another node `loop-stop-not-local`.

### One verb core for every face
`stopLoop` is the one resolution of a stop, imported by the command and by the fleet route alone (FF-13003); a loop found not live has its request marked honoured at once, so the next tick halts without a drive.

### The running loop reads the source, not a flag
`runLoopBody` takes `ctx.stopSource ?? createStopSource(...)`, halts `operator-interrupt` at the tick head on level 1, and composes the source's `signal` onto every drive's driver options so level 2 cancels the in-flight session through the driver's own stop bracket (tree terminated, pty released, exit confirmed).

### Every interrupted drive settles
A drive that returns after a stop is settled before the halt — `cancelled` with `failureReason: null` when the source cancelled it, as it ended otherwise — so an interrupt leaves no `running` row; a `needs-input` drive stays open for `--resume` by design (FF-13002).

### The halt names the request, and `--resume` clears it
The halt line's `Details` carry `signal`, `level`, `request`, `by` and `cancelled`; the halt marks the request `honoured` with the cancelled runId, and `--resume` clears a standing request and narrates `Cleared stop request for <id> (<state>, level <n>) — resumed.` exactly once.
## Assumptions

- **The latest declaration in scope is the loop to stop** — ADR-002 §3c's rule; it holds only while every non-loop mint carries no `brief.loop`, which 130/06's retry carry (`51cfa6a`) now guarantees.
- **A wave's level-2 halt marks `cancelled: null`** — the request's `cancelled` slot is one runId, so a wave names its cancelled lanes by ref in the halt's `Details` instead.

## Gaps

### The request's `cancelled` slot cannot name a wave's lanes
- **Status:** open
- **Discharge condition:** a face needs the cancelled lane runIds of a wave halt and the slot is amended to admit an array.
A wave halted at level 2 cancels one child per lane; the request records `cancelled: null` and only the halt's `Details` name the lanes, by ref.
