
# 160/05 · The runner enforces the budget, and a timeout is not-finished — Outcome

## Delivered

### The sharded gate is held to its budget
The gate passes `work.test.gate.budgetMinutes` through `budgetArgs` (this repository: 10, `["--budget-min", "{minutes}"]`) and bounds its launch at the budget plus 2 minutes. At the budget the pool kills its in-flight units and starts no more. A serial run is held to neither.

### A unit out of time is not finished
A unit the pool killed (by a stop, by the budget or at its own limit) names no failure, prints no `not ok`, and is never retried alone. The report prints `# not finished - <unit>` and `# not started: <n> units`.

### `not-finished` is a row result the door refuses
`GATE_RESULTS` holds `not-finished` beside green, red and override, with `gateResult` as the one home of their precedence. `aof work status <NN> done` refuses a `not-finished` row as `regression-gate-not-finished`, and the verify prose routes such a row to a re-run or a faster suite, never to a code repair.

### A killed unit cannot hold the pool open
Once a unit has exited, its output gets a bounded drain (10 s). After that the pool stops waiting, even if a process the unit started still holds the output.

## Gaps

### The drain is unproven at the real budget
- **Status:** open
- **Discharge condition:** a gate run on the control node stops at its own budget and writes a row that names its not-finished units.
The fix is proven over a real process tree in its suite. No full gate has run since.
