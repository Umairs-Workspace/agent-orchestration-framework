# 06 · The live stop — build plan

## Mechanism

This story builds nothing; it READS. The mechanism is the deploy loop in
`.claude/rules/build-deploy-restart.md`: `node scripts/install-local.mjs --desktop` copies the
payload (`aof --version` → `payload <buildId>`) and rebuilds the Rust app; the OPERATOR quits and
relaunches the desktop app (`aof mesh desktop run`) so its daemons come up under the new payload.
Then one real loop is started on a real item — `aof work loop <scope> --supervised` from a
terminal, so both the foreground shell and the desktop's declaration row exist for it — and each
stop path is exercised in turn with the loop resumed between them.

Every observation is taken at its source, never from a UI's word for it: the run record's bytes
under `runs/<node>/`, the diag log under `~/.aof/mesh/logs/loop-diag.<scope>.*.log` (the driver's
`stop-requested` → `tree-terminated` → `pty-released` → `exit-confirmed` lines), the request file
under `~/.aof/mesh/loop-stops/`, the shell's halt line, the fleet's `/api/mesh/status` body, and
the desktop's `mesh status --json --declarations` answer across two declarations ticks.

## Verification step

The story's `@manual` procedure, in order, with each result pasted into `STATE.md`:
1. verb, drain: `--stop` once → the document says `drain`, `live: true`; the loop finishes the drive
   and halts `operator-interrupt` with `signal=stop-request`; the record is `done`/`failed` as the
   drive ended, never `running`; the request reads `honoured`.
2. `--resume` → `Cleared stop request …` narrated; the file gone; the loop drives again.
3. verb, cancel: `--stop` twice → `cancel`; within seconds the diag log shows the bracket; the
   record reads `cancelled` / `failureReason: null`; the halt's `Details` carry `cancelled=<runId>`.
4. desktop: over two declarations ticks (≥ 60 s) `mesh status --json --declarations` lists no row
   for the loop and the app relaunches nothing; the window's row shows `stopped` then leaves.
5. fleet: after `--resume`, the card's line reads `loop <scope> · …`; `Stop` → `stopping`, `Stop
   now` → `cancelling` → the line gone; the record `cancelled` again.
6. desktop: after `--resume`, the row's Stop → `stopping` → `stopped`; the loop halted on the
   request (not the tree kill — the diag log shows the bracket, not a `taskkill` of the loop pid).

A failure looks like: a record left `running`, a halt with no `request` in its `Details`, a row or
a card line that never leaves, a relaunch within the two ticks, or a stop that reached the loop
only through the desktop's `taskkill` fallback.

## Out of scope

- Fixing anything found — a finding goes back to the story that owns the file (05 for a control,
  02–04 for code), fixed inline; this story records.
- A remote node's loop — ADR-006; observed only as "the line has no button".
- Starting or restarting any daemon from this session — the operator's act.

## Known traps

- The desktop must be restarted by the operator AFTER the install, or the old payload's shell
  runs with no `--stop` and every observation is of the wrong build (`aof --version` first).
- A `--supervised` loop started from a terminal is ALSO a declaration; expect the desktop to show
  its row while the terminal shows its shell (ADR-004 §6).
- Never `taskkill` the loop yourself to reset between legs — `--resume` and `--stop` are the only
  two levers the procedure uses; a hand kill leaves the `running` row this milestone exists to end.
