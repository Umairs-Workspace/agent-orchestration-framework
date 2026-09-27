# 59 · The audit loop — Outcome

<!-- AUTHORED at the milestone level, never concatenated from the stories'. Each story's OUTCOME.md
     states its own capabilities and the index unions them, so a capability stated whole by one story
     is CITED here rather than repeated. What follows is what is true of the SYSTEM that no single
     story's outcome says on its own. -->

## Delivered

### aof has an auditor, and nothing in the machinery can point at it
The registry admits a sixth kind whose subject is the measuring apparatus (`m59/00`), and the
endpoint vocabulary was deliberately **not** widened to match: no scheme resolves to an `auditor:`,
so an auditor is a source and never a target. Nothing can supervise it, set its reference, veto it or
tune it — the structural form of "the audit does not answer to the loops it audits", rather than a
sentence in a document. It has no vocabulary for acting either: the kind admits no `actuator`, so the
prune reports candidates and removes nothing (`m59/03`).

### The audit executes; the health command still cannot
Milestone 66 froze `work:doctor` as a command that may not run anything. This milestone built the
thing that runs, and put the boundary on a **command** rather than a convention: no module under
`src/work-audit/` is reachable from doctor's spine or from any module in its check registry, over the
whole import closure, and the audit's finding codes are disjoint from doctor's so neither command's
severity table can decide the other's meaning (`m59/02`). The two verbs are siblings that share a
finding shape, a scope semantics and a `--strict` flag whose policy deliberately differs in exactly
two cells (`m59/04`).

### Absence has one shape, and a lane cannot report clean without using it
Every lane in the audit returns what it read against a floor, and states what it could not see. Both
records — the read (`m59/03`) and the limit (`m59/04`) — live in one module, are complete by
construction, and are refused rather than defaulted. That is the milestone's actual mechanism: a
dashboard cannot stay green through a report whose shape has no way to express "clean" without also
expressing "and here is how much I looked at, and here is what I could not see."

### The recurrence guard for "part of the fitness gate is dead" exists, and it found a live instance on its first run
`TECH_DEBT` item 5 was repaired by hand in milestone 42 with nothing watching for the recurrence.
There is now a watcher, and it is not a promise: registration is decided by membership of the
runner's assembled array inside the runner's own process, twenty-six de-armed suites carrying 117
test entries were re-armed, six more that only `scripts/test-unit.mjs` had ever assembled were
registered, and two suites that had rotted red while dead were repaired (`m59/01`).

### Recorded evidence is re-executed by something that did not write it
The gap the objective names on the record — ACD's `@manual` evidence written by the same agents that
did the work — is closed for the fitness register: every row's cited control is run in a bounded child
and judged on the message it produces, with no verdict reachable from the recorded prose (`m59/02`).

### Eleven declared controls, every one of them observed failing
The milestone applied its own thesis to its own gates. Each of `FF-5901`…`FF-5911` was run green,
then run again with the invariant it guards deliberately broken, and the failure message recorded in
`VERIFICATION.md`. Four of the eleven extend a guard that was already in service, where the probe is
the only evidence the extension is armed at all.

### The audit found real defects on its first runs, including two of its own
Run over this repository rather than over fixtures, the audit reports 0 errors and 49 warnings across
three lanes, each declaring its population against its floor. Two defects in this milestone's own
delivery were caught at its gate rather than by its stories' lanes — a limits footer that printed
`undefined — undefined` (D-59-3) and a bundle census that had not been moved by the diff that grew the
tree (D-59-6). Both are fixed, and the first is now a control.

## Assumptions

- **The auditor is declared and unscheduled** — its cadence is a fact on its record and the trigger
  that honours it is milestone 63's. Nothing in this milestone runs the audit on its own.
- **The audit reports and never removes** — pruning names candidates; removing a node is an edit to a
  governed declaration and stays a human act.
- **Deterministic probes are the whole of it** — whether recorded evidence was actually *used*, and
  every other question only a judge can answer, is out of scope by decision and not by omission.

## Gaps

### Nothing consumes the audit's verdicts yet
- **Status:** open
- **Discharge condition:** milestone 61 (the acceptor) consumes these verdicts under its own rule, and
  milestone 63 supplies the trigger that runs the audit at its declared cadence.
The audit produces addressed findings and an exit decision; no loop reads them, and no schedule runs
it. It is an instrument an operator invokes.

### An auditor a project writes is checked for grammar, not for resolution
- **Status:** open
- **Discharge condition:** the check lane resolves `audits:` endpoint ids against the registry and
  requires an `escalation:` actor to be a declared node with exogenous ground.
Measured at verify (D-59-5): a dangling `audits:` pointer and an undeclared `escalation:` actor each
produce zero findings. `FF-5910` covers the day-one record under `src/bundle/loops/` and nothing
covers a project-authored one.

### Two of the traceability instruments this milestone would have used are themselves dark
- **Status:** open
- **Discharge condition:** `work.rubric.report` gains a `path` so the `@executable`→emitted-case join
  runs, and `work.controls.runners` is either configured or its leg B is rebuilt on runtime membership
  (TECH_DEBT 69) rather than the substring rule 59/01 retired.
D-59-2 and D-59-4: the scenario→case join has never run stream-wide, and doctor's "does a runner name
this control?" leg has never run in this repository. Both are the exact species this milestone exists
to detect, and both are reported honestly as not-run rather than passing.
