# 130 · Stop a running loop — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. A milestone's outcome is AUTHORED, never a
  concatenation of its stories': each story's capability is cited as m130/NN, not repeated.
-->

## Delivered

### A running loop can be stopped from outside its own console
A live `aof work loop` on this machine is stopped from any other terminal, from the fleet node card, or from the desktop window, and every one of those routes writes the same one request that the loop reads. This holds on Windows, where no process outside the loop's console can signal it. Observed end to end on the installed payload (m130/06).

### One request, three faces, one verb core
The verb (m130/02), the fleet route (m130/03) and the desktop row (m130/04) each resolve a stop through `stopLoop`, and write the one request file m130/01 owns. No face holds a second copy of the resolution, the ladder or the vocabulary. FF-13001 and FF-13003 were each observed red when a second home was planted.

### A stop never leaves the run it stopped in flight
The interrupt path that dropped 129/04's driver observation now settles every stopped drive before the loop halts. A cancel settles `cancelled` with `failureReason: null` and a drain settles as the drive ended, so a stopped loop leaves no leaked `running` row to wall the next mint (m130/02, FF-13002).

### A stopped loop stays stopped until the operator resumes it
The desktop's reconcile does not relaunch a loop whose request was honoured, whether the desktop started it or attached to it. `aof work loop <scope> --resume` is the one door back, and it clears the request (m130/04, 130/ADR-007).

### The frozen surfaces did not move for the stop
The board shows no loop, and `src/board-ui.mjs` and `ui/src/board/` are unchanged. `LoopState` keeps ten keys, `brief.loop` nine, and `LOOP_STOPS` its fifteen members, with `operator-interrupt` the stop. `src/run-store.mjs` moved once, and only for 130/06's retry carry, re-pinned under ADR-007 §5.

## Assumptions

- **The request is a file in THIS machine's aof home** — a loop is stoppable only from the machine it runs on. The verb refuses another node's loop `loop-stop-not-local`, and the fleet renders a remote loop's line with no button.
- **The latest declaration in scope is the loop to stop** — this holds because no mint other than the loop's own carries `brief.loop` (m130/06's retry carry).

## Gaps

### Design conformance was never rendered
- **Status:** open
- **Discharge condition:** `work.ui.baseUrl` is declared (the fleet at `http://127.0.0.1:4181`) and each DESIGN surface names a `Route`, so the verify lane can render and the designer can judge.
Both surfaces were verified by behaviour, by a fixture render and by the operator's live screenshots. The conformance lane returned INCONCLUSIVE before any render was attempted.

### A loop on another machine is stopped only on its own console
- **Status:** open
- **Discharge condition:** a mesh directive carries a stop request to the node that runs the loop (out of scope by the SPEC).
The fleet shows a remote node's loop and offers no stop for it, and the refusal has not been exercised live (no Mac loop ran during 130/06).

### A needs-input loop still reads as live on the card
- **Status:** open
- **Discharge condition:** presence derives a loop's liveness from something other than its latest `running` record (m130/F-07).
A loop that halted on `session-needs-input` leaves its run `running` by design, so the fleet keeps its line and a `Stop` button.
