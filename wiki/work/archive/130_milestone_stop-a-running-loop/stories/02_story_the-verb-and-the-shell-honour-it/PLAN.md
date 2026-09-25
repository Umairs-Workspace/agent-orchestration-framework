# 02 · The verb and the shell honour it — build plan

## Mechanism

Two seams, both already in the shell. The VERB rides the registered `run` of `work:loop` the way
`--dry-run` rides its `launch` predicate: `run` becomes a one-line dispatch on `input.stop` to a
command face over `stopLoop`, and `launch` answers `null` for `--stop` exactly as it does for
`--dry-run`, so no foreground body, no diag recorder and no PTY are ever reached by a stop.
`stopLoop` lives BELOW the command layer in `src/loop/stop.mjs` and does what `resumableState`
already does to find a loop — `listItems` filtered by `loopScopeIncludes`, `readRuns`,
`readLoopDeclaration` — then the record's own liveness (`isRunning` + `isStale` under
`heartbeatFromConfig`) and one call into story 01's ladder. Refusals are the document's `ok: false`
with a code; only the command face turns them into `commandError` (404/409).

The SHELL swaps its `process.once` pair for `ctx.stopSource ?? createStopSource(...)` at the point
`loopRunId` is resolved, spreads `source.signal` onto `agentSessionDriverOptions` for every drive
(the in-process drive hands it to the driver through `baseOptions`; 129/04's child drive will pass
the same object), reads `source.level()` at the tick head and AFTER the settle. The one structural
move is ordering: `settleDriven` runs before the interrupt halt, never after, and `settleDriven`'s
terminal word gains one branch (`failureReason === "cancelled"` → `cancelled`, reason `null`)
through the existing `transitionRunComplete` — the store's `running>cancelled` edge, no store edit.
The halt is today's `haltDecision("operator-interrupt", ref, producer)` with the producer read off
the source; the request is marked honoured at that halt and cleared under `--resume`, both through
story 01's exports — the shell spells no path and calls no `fs`.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run the runner's `--only` selection over the six suites this story's `files:` declares (the new stops suite, the three loop-command suites it extends, and the two loop arch controls)`.
Then the end-to-end observation: over the loop fixture with a driver double that honours
`options.signal`, drive one story with a fake `ctx.stopSource` whose level flips to 2 mid-drive —
the run record on disk reads `state: "cancelled"`, `failureReason: null`; the returned `LoopState`
has ten keys, `act.stop === "operator-interrupt"`, `act.producer === "stop-request"`, and its
`driven` row reads `outcome: "cancelled"`; the request file reads `state: "honoured"` with
`cancelled` set to that runId. A `--resume` over the same fixture deletes the file and narrates
`Cleared stop request …` once.

A wrong build shows as: a record still `running` after the halt (the settle skipped), a record
`failed` with reason `cancelled` (the branch missed), a halt whose producer is a message fragment,
`getCommand("work:loop").run({ scope })` writing any file, or `LoopState` growing a key.

## Out of scope

- The fleet route and the desktop spawn that CALL `stopLoop` — stories 03 and 04; this story lands
  the core they import and the CLI face only.
- The wave tick's per-lane cancel (`spawnLaneDrive({ signal })`) — 129/04's; this story composes
  `signal` for the in-process drive and leaves the seam object for the lane path.
- A new stop id — `LOOP_STOPS` stays twelve; `operator-interrupt` is the stop.
- Any new suite file or `index.mjs` line — the four `loop-command-*` suites are extended.

## Known traps

- The run store and the board seam are byte-pinned (FF-5307); the cancel edge is used
  through `transitionRunComplete`, never by touching the store.
- FF-12602 (`acd-loop-narrates-in-flight`) asserts EVERY narration line is in its seam table; the
  new `Cleared stop request` line must be added to the table in the same diff or the control reds.
- `probeLoop` is not to be edited — FF-5304's "probe minted and rewrote no file" leg is measured by
  calling `run({ scope })` with no `stop`; a dispatch that reads `input.stop` before the probe is
  all that changes.
- The post-drive `if (interrupted)` early return at `:1833` is the measured defect — it goes, it is
  not moved.
