# 02 · The four deadlines — Outcome

## Delivered

### An attempt has a deadline aof enforces against a process it holds
`driveInteractiveClaudeSession` — the only function in this repo holding a live process handle —
arms the per-attempt (start-to-close) and liveness deadlines against that handle and reaches
`term.kill()` on expiry, resolving a retryable `timeout`. All three production callers supply the
policy from the workspace: `src/commands/drive.mjs:212` and `src/mesh-worker-execution.mjs:1689,2230`,
each through `loopBoundsFromConfig(ws)`.

### The total-across-attempts ceiling gives up rather than retrying
Schedule-to-close escalates instead of spawning another attempt, and preserves the worktree for
triage rather than cleaning it up.

### A startup grace suspends the liveness deadline and nothing else
A clone plus a dependency install produces no tool-result events at all; the grace covers that
window without pausing the wall clock, so a five-minute allowance does not become an unbounded one.

### No bound is spoken to the model
No `--max-turns`, `--max-budget-usd`, `-p`, `--print` or `--output-format` argv is constructed for
the interactive `claude` driver anywhere in `src/`; enforcement is entirely out-of-process.

### The exit vocabulary 68 fixed is reachable for the first time
`timeout` was already classified retryable and already a member of 68's exit vocabulary; this story
is what makes it — and its siblings — a state a run can actually reach.

## Assumptions

- **The interactive spawn path supports no in-process caps** — measured on `claude 2.1.233`:
  `--max-turns` does not appear in `--help` at all, and `--max-budget-usd`'s own help reads *"(only
  works with `--print`)"*, while `-p`/`--print`/`--output-format` are forbidden in the worker launch
  by a shipped fitness function on measured evidence that a `-p` turn cannot pause to ask a human.
  The wall-clock kill is therefore the whole enforcement story on this path, not a fallback.
- **codex is untouched** — its headless `execFile` path already carries a 10-minute timeout and no
  task here edits it.

## Gaps

### The start-to-close value is a starting point
- **Status:** open
- **Discharge condition:** one measured milestone under 68's telemetry, from which the value is
  re-derived rather than assumed.

30 minutes per attempt is derived from the `47/01`/`47/02` pair — 11h07m to failure against 15.9
minutes on retry — which bounds that pair at ≤46 minutes across three attempts. It has not yet been
checked against a distribution.

### Escalation has no destination
- **Status:** open
- **Discharge condition:** a notification ladder exists (explicitly out of this milestone's scope).

An escalated run is surfaced and preserved for an operator; it is not delivered to one.
