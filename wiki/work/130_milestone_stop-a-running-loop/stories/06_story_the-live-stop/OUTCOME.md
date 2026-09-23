# 06 · The live stop — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### The stop is observed working on a real loop
On this machine's payload, a live `--supervised` loop on the test-bed was stopped from the verb (drain, then cancel), from a gap between drives, from the fleet card's two rungs, and from the desktop's row, each read at the source: the driver's bracket in the diag log, the run record `cancelled` with `failureReason: null`, the halt line naming the request, no relaunch across the declarations ticks, and `--resume` clearing the request.

### An unbriefed retry carries no declaration
`retryRun` carries the prior run's brief minus `loop`, so an operator's `aof work resume` of a dead loop's run no longer becomes the newest declaration in scope and captures the verb; every loop retry passes its own brief, so a loop's lineage is unchanged (`51cfa6a`, m130/F-01).

### The desktop stops a loop started on a console
The desktop attaches to a `--supervised` loop it did not start and stops it through the same request (130/ADR-007, `874eef6`, m130/F-02) — observed on its build: press 1 wrote level 1 and press 2 level 2 through the desktop's own `--stop` spawn, and the loop's bracket cancelled the session with no fallback kill.

## Gaps

### A remote loop's refusal has not been seen live
- **Status:** open
- **Discharge condition:** a loop runs on the Mac's own console and `aof work loop <scope> --stop` from this machine is refused `loop-stop-not-local`, with the fleet's line showing no button.
The refusal is covered by 130/02's suites; no loop was started on the Mac during the run.
