# 163 · The operator can read the loop's open questions — Outcome

## Delivered

### aof work questions
`aof work questions` reads the ask files under `loop-asks/` through `readAsks`, with no daemon round-trip. For each ref it prints the latest ask that is `waiting` or `parked`, oldest first. A row carries the ref, phase, runtime, asked instant and age, workspace name, full question, numbered choices and `aof work answer <ref> "…"`. `--json` emits the rows. When nothing waits, it prints "No open questions." and exits 0.

### A stale ask offers no answer line
A row whose run is no longer running is marked stale, with no answer line, and names `aof work loop <scope> --resume`. The verb judges this through `askRunStopped` / `runsBehindAsk` in `work-loop/ask.mjs`, the same functions the loop's `sweepStaleAsks` calls.

### --all widens to every workspace on this node
`--all` lists the open local asks of every workspace on the node. It names each workspace from its descriptor, or by id when there is none, and reports liveness `unknown` when that workspace's checkout cannot be loaded.

### Worker questions in this workspace are listed
An assignment that a worker parked on a human in the current workspace is listed with its node. Where the question text never reached this machine, the row says so and points to the worker's terminal. A local ask outranks a worker's ask on the same ref.

### One waiting-on-a-human rule
`standingAsk` in `work-loop/ask.mjs` is the only definition of "this run waits on a human". `aof work resume` receives it injected (`openLastAsk` is gone), keeps its NEEDS YOUR ANSWER row, and points to `aof work questions` for the text.

### The /aof:questions wrapper
`packages/core/assets/commands/questions.md` runs the verb and renders through `aof work update` into `.claude/commands/aof/questions.md` and its codex and opencode faces. `work:questions` is registered and routed as `aof work questions`.

## Assumptions

- **The claude path stamps `runtime` on the asks it writes from now on** — an ask written before 163 has no runtime, and its row leaves that part out.

## Gaps

### Worker-parked questions in other workspaces
- **Status:** open
- **Discharge condition:** `--all` reads every workspace's execution overlay (m163/F-01).
`--all` widens the local ask files only; its worker leg still reads the current workspace's overlay alone.
