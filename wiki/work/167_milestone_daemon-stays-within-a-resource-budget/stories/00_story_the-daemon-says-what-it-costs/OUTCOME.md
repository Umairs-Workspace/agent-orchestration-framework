# 00 · The daemon says what it costs — Outcome

## Delivered

### Each daemon meters its own cost by cause
`packages/foundation/src/cost-meter.mjs` is the one reader of `process.cpuUsage` and `eventLoopUtilization` in `packages/` (FF-16701). It counts work against a closed cause set, labelled by workspace, route and `X-AOF-Client` client, and `mesh serve` and `mesh ui` each write a snapshot to `meshDir/cost/` every 15 s and once more at a clean stop.

- **A cause outside the closed set is refused, not counted** — a strict meter throws; the production meter drops it and lists it on the snapshot's `refused`, with no degrade line, because the meter cannot import the reporter that imports it.
- **The board's polls are counted under `ui`** — `mesh ui` hosts the board server, so a board-poll storm shows in the `ui` snapshot, not `serve`'s.

### Every degrade line names its workspace
A degrade raised while reading a workspace carries its workspace label, and every report is counted through the meter even when the line itself is throttled.

### The daemon budget has one home
The idle budget (2% of a core) and the viewer-open budget (10%) are declared only in `cost-meter.mjs` (FF-16702); a fleet or board request makes a daemon viewer-open for 30 s.

### `aof mesh status` and `aof work doctor` say what each daemon costs
`mesh status --json` carries a `cost` block per daemon (share, state, budget, top causes), its text report prints one cost line per daemon, and a snapshot older than 45 s reads `not-reporting`. The `daemon-cost` doctor lane warns on a daemon over its budget, naming its top cause, or on one that stopped reporting. Its warns never fail validate.
