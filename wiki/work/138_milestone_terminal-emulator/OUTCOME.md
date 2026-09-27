# 138 · The session driver sees claude's screen — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. A milestone's outcome is AUTHORED, never a
  concatenation of its stories': each story's capability is cited as m138/NN, not repeated.
-->

## Delivered

### A driven session's screen is read, not inferred
When to type, what is blocking and what to record at a stop are all decided from one rendered screen per session (m138/00, m138/01). The three failures measured on 2026-09-24 were each observed closed on a real claude on two nodes (m138/02): a paste into a TUI that was not listening, a dialog idling to the 20-minute deadline, and a failure that left no screen.

### Readiness holds on both of claude's renderers
The input box is recognised on the fullscreen renderer's alternate buffer and on the classic renderer's normal buffer, so a drive launched after an unfinished fullscreen boot, or under `/tui default`, types on the box rather than timing out (ADR-002 §1 as amended at verify, m138/F-03).

### An archived item's citations resolve through the archive rule
`aof work validate`'s `reads:` check resolves a missing `<work.dir>/<item>/…` through `<work.dir>/archive/<item>/…`. An item created and archived inside one squash therefore no longer dangles on `main` (m138/F-16).

## Assumptions

- **claude's screen vocabulary is stable within a release** — upkeep is a re-capture per claude version (ADR-003 §7). A changed box or dialog fails its first drive as a recorded `timeout` or an unrecognised frame, and never draws a keystroke.

## Gaps

### The fleet mirror keeps its byte tail
- **Status:** open
- **Discharge condition:** the fleet terminal view serialises the session's screen model for a reconnecting viewer, instead of replaying raw bytes (declined for v1 by ADR-005).

### The classic-renderer fix is not deployed or observed live
- **Status:** open
- **Discharge condition:** a payload built from a commit carrying `6227ef6` is installed, and a drive under the classic renderer pastes on the normal-buffer box.
It is proved by the `ready.classic.json` recording and the suites. The payload live at accept (`1a2c455+dirty…`) predates it.

### The Mac worker runs the byte gate
- **Status:** open
- **Discharge condition:** the Mac worker pulls, runs `npm ci`, and a drive there names `first-run` in seconds (m138/02's gap).
