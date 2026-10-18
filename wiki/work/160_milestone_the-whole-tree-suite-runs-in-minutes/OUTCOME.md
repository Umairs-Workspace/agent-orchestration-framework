# 160 · The whole-tree suite signs off in minutes — Outcome

## Delivered

### Every pull request signs off on the whole tree in under two minutes
Each pull request to `main` runs all 12,988 registered cases across 8 Linux runner shards, inside a 10-minute budget the workflow enforces; on PR #12 the suite wall is 1.8 minutes, and each file's drift against `main` is reported beside it (m160/13 states the workflow whole).

### A timeout is a not-finished unit, never a red
Wherever the suite runs — a sharded run on the control node, a gate, or a PR shard — a unit stopped by its own limit, the budget or a stop is reported `not finished`, and the gate's door refuses a not-finished row as its own case with its own repair (m160/05).

### The control node's gate is a correctness gate
`aof work regression-gate` on the control node runs the whole tree with no budget, in a clean launch environment that dies with its session (m160/04), and its row is what the accept door reads; the budget lives with the pull request suite.

### A test run is hermetic for the operator's files
A test run writes neither the operator's `~/.aof` nor their `~/.claude.json` (m160/12), and no test spawns the registry runner unless the runner is its subject (m160/11).

## Assumptions

- **The suite stays green on Linux** — the PR suite is the budget's measurement; a change that only runs on Windows is checked on the control node's gate alone.

## Gaps

### The control node is not held to a time
- **Status:** open-by-decision
- **Discharge condition:** a milestone decides the control node needs a time target of its own again, on a machine that does not carry other work.
The whole tree takes about 17–24 minutes on the control node at 10–16 workers, varying with that machine's load; nothing bounds it beyond the gate's 2-hour deadline.
