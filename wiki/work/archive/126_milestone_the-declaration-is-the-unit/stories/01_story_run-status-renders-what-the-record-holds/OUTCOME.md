# 126/01 · run-status renders what the record holds — Outcome

## Delivered

### `aof work run-status` names every fact its record carries
The human render prints the run's state, failure reason, reclaim marker and resume instant, the loop
envelope's phase, cycle-against-cap and level, the attempt, the elapsed time, the heartbeat age, the
session and the node — each shown only when the record holds it, and never invented when it does not.

### Elapsed and heartbeat age have one arithmetic, shared with the deadline that enforces it
The render imports `attemptElapsedMs` from `src/work/loop.mjs` rather than deriving a duration of its
own, so a reclaimed run reads its last heartbeat and not its reclaim stamp: the measured `124/00`
attempt renders 1,785,756 ms where a `createdAt`-to-`updatedAt` span would read 41,380,713 ms.

### A human render has an injected instant, and `src/spine/face.mjs` is where it comes from
The one `faceCtx` the face constructs carries `now` (ISO-8601 Z) read from the wall clock in that
module and no other, handed to every `cli.render`; `src/commands/run-status.mjs` contains no
`Date.now()`, no `new Date(` and no `readFile`, and a render called without a `now` omits its two
time figures rather than printing `NaN` or throwing.

### A worker-mirrored run history says that it is one
A `fromWorker` result's heading names the mirror and the node that reported it, so a projection-held
row is not read as a live local fact; `answeredFrom` is deliberately not that marker, because a
disk-resolved item whose runs were streamed answers `cache`.

### The `--json` document is frozen across the change
All six producing return sites keep their present key sets and order — three distinct shapes, with
exactly one four-key path that gains no `reportedBy` — the 16-key record and its 8-key `brief.loop`
round-trip unreshaped, `json: (result) => result` is still identity, `ref-not-found`/404 is unchanged,
and the render writes nothing back to the result it is handed.

### `53/ADR-004`'s freeze is narrowed in the open: the document is frozen, the render is not
`53/FF-5307` leg 2's byte-pin of `src/commands/run-status.mjs` is re-pinned at a new digest with the
reason written beside it rather than deleted, and `src/board-ui.mjs` and the `ui/` tree hash are
unmoved.

## Assumptions

- **The per-attempt term stays a pure export of `src/work/loop.mjs`** — the render's figures are the
  engine's numbers only while `attemptElapsedMs` remains importable and clock-free; a clock inside it
  would move the disagreement the one-home rule exists to prevent, rather than remove it.
- **`faceCtx` stays the single construction site** — `FF-12603` leg 3 asserts one `faceCtx` literal
  and one `cli.render` call in `src/spine/face.mjs`; a second render path would reach a render with
  no instant and silently lose both time figures.
- **A run's liveness is read from the record, not confirmed** — the elapsed shown for a `running` run
  charges to `now` with no staleness threshold supplied, because this is the render's question; a
  dead runtime whose record still reads `running` renders as though it were alive until something
  reclaims it.

## Gaps

### The four-key streamed-item-row return path has no driven test
- **Status:** open
- **Discharge condition:** a fixture that can plant a run row `readStreamedItemRow` answers for while
  `resolveItem` does not — today `resolveItem` is cache-first, so every plantable row resolves and
  the call takes a different branch.
Five of the document's six answering paths are driven end to end; the sixth is covered structurally
by `FF-12603` leg 4, which asserts exactly one four-key return site in the source and that it carries
no `reportedBy`.

### The board renders none of this
- **Status:** open
- **Discharge condition:** an item that re-opens `src/board-ui.mjs`, which this story's own control
  asserts untouched and whose pin it deliberately did not move.
The enriched run line exists on the CLI face alone; the board and the `ui/` tree show what they
showed before, so an operator reading the board still sees a run id and a state.
