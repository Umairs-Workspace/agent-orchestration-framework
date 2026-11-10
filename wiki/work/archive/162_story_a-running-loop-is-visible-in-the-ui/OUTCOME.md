# 162 · A running loop is visible in the UI — Outcome

## Delivered

### Loop sessions stream to their cards
A loop-driven Claude session streams its terminal live to its session card on the home and the fleet, from the control node and from a worker, each through its own node's daemon over a loopback, token-gated ingress that stamps the daemon's node id.

- **A daemon runs on the node that runs the loop** — the drive child relays through `<aof home>/mesh/terminal-ingress.json`; with no daemon it degrades once and streams nothing.
- **The drive is a Claude PTY drive** — a Codex native drive has no PTY to relay.

### Loop panes are read-only and say why
A session row that names a driving loop mounts read-only on every surface; no keystroke is sent, and the read-only badge reads "read-only — a loop drives this session; answer it with aof work answer".

### Loop progress on the home and the fleet
The running loop's line shows the current drive's elapsed time and its last activity, turning to "quiet <age>" in the warning tone once the drive has not heartbeated for ten minutes; the line, the threshold and the tone each have one home in `apps/ui/src/components/loop-line.mjs`.

### Loop progress in the terminal
`aof work loop` prints `<ref> — <elapsed>, <n> subagent(s) active, last activity <age> ago` every five minutes while a drive runs, per lane in a wave, silenced by `--quiet`.

### The home names a running loop
When a live node runs a loop whose session is not in the grid, the home's empty state names the loop and says its session has not reported, or is not relaying, instead of the bundle sentence.

### Node liveness follows the heartbeat
A node reads live while its presence heartbeat is inside the window, whether or not any workspace has republished since.

## Gaps

### A worker's loop line on the control node
- **Status:** open
- **Discharge condition:** the control's copy of a worker's presence carries the worker's `loops` entries (F-07).
A worker's loop session streams to its card, but its loop line never reaches the control's home or fleet: the worker's `loops` are dropped on the worker-to-control presence path.

### Codex native drives
- **Status:** open-by-decision
- **Discharge condition:** a Codex drive exposes a PTY or an equivalent output stream to relay.
A loop drive run by Codex native streams nothing to its card.
