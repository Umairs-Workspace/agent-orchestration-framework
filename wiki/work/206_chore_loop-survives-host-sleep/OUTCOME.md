# 206 · The loop survives a host sleep and recovers instead of halting — Outcome

## Delivered

### Deadlines count awake time
The lane child deadline, the PTY driver's start-to-close and heartbeat bounds, and the Codex adapter's turn and request bounds all run on `@aof/foundation/awake-clock`, so a host suspend no longer expires them on wake.

### The budget is not charged for a suspend
A run record carries an optional `suspended` span list when its attempt slept, and the lineage budget subtracts those spans (merged with ask waits). A settled attempt with no spans is charged at most one staleness window past its last liveness.

### A timed-out continue resumes its session
The retry of a `continue` that failed `timeout` resumes the prior session (`--resume`) with a "resumed after the attempt deadline" turn when its transcript exists, and launches cold otherwise.

### The drive status reads true liveness
The status line's last activity is the newer of the consumed heartbeat and the session transcript's write, and a lane killed before its document names its session from the run record.

### Refused lane cleanups are retried
The loop remembers a refused lane cleanup and retries it before the next dispatch, and before halting at capacity it retries in-scope holders through the gated cleanup verb.
