# 69 · Loop bounds — Outcome

<!--
  AUTHORED at the milestone gate, never concatenated from the stories'. Each story states its own
  capability whole in its own OUTCOME.md; this document states what is true AT THE MILESTONE LEVEL
  that no single story says alone, and CITES the stories where they already say it. The aggregation
  happens in the index (`aof work memory ingest`), not here.
-->

## Delivered

### The runtime enforces bounds at all, and their values are declared rather than assumed
Before this milestone there was no token limit, no turn limit, no wall-clock limit and no cost
ceiling anywhere in aof, and the interactive `claude` path had no timeout of any kind. There are now
seven declared bounds resolving from `work.loop.*` through one home, four of them deadlines the
runtime enforces against a process it holds — see [[m69/00]] for the declaration and its refusals,
[[m69/02]] for the enforcement.

### Liveness and progress are two signals with two different consequences
This is the milestone's central claim and no single story makes it. A run that has gone **silent**
is killed and retried against the liveness deadline ([[m69/01]] supplies the signal, [[m69/02]] the
consequence). A run that is **alive and getting nowhere** is reset with a summary and, on repeated
resets, escalated with its work preserved ([[m69/03]] supplies the ledger, [[m69/06]] the caller
that consults it). The two are deliberately not merged: the eight-day zombie and the two 11h07m
burns are different failures, and a heartbeat alone catches only the first. One signal carries one
terminal behaviour throughout — a block the pending-question detector misses costs an attempt rather
than parking, because the runtime cannot read human intent out of silence.

### Concurrency is a property of the system on both surfaces, and waiting no longer costs capacity
A slot is acquired before work is accepted — the local slot is the git lane, counted before one is
materialised; the mesh tick consults its counted set before it sends ([[m69/04]]) — and a run
blocked on a human ends its process, releases that slot and resumes the same conversation when the
answer arrives ([[m69/05]]). The two compose into the milestone-level fact: the largest recorded
lost-time category (107h28m in m47, 58h05m in m48, 46h38m in m50) no longer holds a slot while it
waits.

### The bound four other milestones were waiting on has a value
Milestone 54 was `not-started` in its own words because *"it enforces a bound; it does not invent its
value"*, and 53, 62 and 65 deferred to the same arc. Review is `N = 1` by default with a named
blocker admitting a second round; build is bounded on failure-to-progress rather than an iteration
count; `maxAttempts` stays 3, paired with a total-duration ceiling. Every framework loop record's
`ceiling:` now resolves, and a ceiling whose pointer resolves while nothing reads the bound is a
named finding rather than a declaration ([[m69/00]], [[m69/06]]).

### The run record gained nothing, and that is enforced rather than intended
`src/run-store.mjs` has seventeen `src/` dependents. This milestone adds no key, no state and no
transition to it: its key set and `LEGAL_TRANSITIONS` set are byte-frozen by SHA-256 under FF-6908,
and there is no lease table, claim file or per-slot persisted object anywhere. A slot is a count over
rows and lanes that already exist.

### Enforcement is out-of-process, and no bound is spoken to the model
No `--max-turns`, `--max-budget-usd`, `-p`, `--print` or `--output-format` argv is constructed for
the interactive driver anywhere in `src/`. The deadline is armed against a held process handle and
reaches `term.kill()`. Telling the agent about its budget is milestone 71's subject and is refused
here by ADR-004.

### Eleven declared controls, each with a red probe that was observed failing
The register in `VERIFICATION.md` carries all eleven with the plant and the message observed, not a
placeholder. Four of them extend a guard already in service, where the probe is the only evidence the
extension is armed at all.

## Assumptions

- **The interactive spawn path supports no in-process caps** — measured on `claude 2.1.233`:
  `--max-turns` is absent from `--help`, and `--max-budget-usd` works only with `--print`, which a
  shipped fitness function forbids in the worker launch on evidence that a `-p` turn cannot pause to
  ask a human. The wall-clock kill is the whole enforcement story on this path, not a fallback.
- **"Escalate" means surfaced and preserved for an operator, not delivered to one** — the
  notification ladder is explicitly out of scope, so an exhausted or stalled run keeps its worktree
  and waits to be found.
- **Every declared value is a starting point under measurement, not a settled constant** — the
  bounds are derived from recorded events on this tree and are expected to move once milestone 68's
  telemetry has a completed milestone under them.
- **Occupancy is only as durable as the rows and lanes it counts** — deliberately, rather than a
  persisted lease with its own lifecycle to get wrong.

## Gaps

### `scheduleToStart` has no measurement behind it
- **Status:** open
- **Discharge condition:** a measured dispatch-latency distribution from milestone 68's telemetry
  replaces the documented default.

Every other value in ADR-002's table is derived from a recorded event on this tree; the 10-minute
schedule-to-start was chosen so a shorter one would not alert on ordinary dispatch latency.

### Escalation has no destination
- **Status:** open
- **Discharge condition:** an escalation ladder exists (reminder → escalate → timeout), which the
  SPEC puts out of scope for this milestone.

Releasing the slot is delivered; reminding or escalating to the human who owes an answer is not.

### The bounds are not yet spoken to the agent
- **Status:** open
- **Discharge condition:** milestone 71 makes the prompts agree with the runtime.

This milestone makes the bound real in the runtime. Where the cap is *spoken* — how review rounds are
worded, findings becoming work items — is deliberately 71's, so an agent can still be told something
the runtime will not honour.

### A declared ceiling's reader is not proved reachable
- **Status:** open
- **Discharge condition:** a check that resolves each declared bound's reader to a production entry
  point rather than to the existence of a reading module.

Stated whole in [[m69/06]]; carried here because it is the residue of the defect class this milestone
exists to end, and the next recurrence will look exactly like the last two.
