# 02 · Evidence re-run — Outcome

## Delivered

### The fitness register is executed rather than read
`src/work-audit/evidence.mjs` resolves every `FF-NN` row's cited control in scope and runs it in its
own bounded child process, one run per (row, control) pair — a row citing two controls is two runs and
two verdicts. Every verdict in the lane is derived from a spawn result: an observed exit code and
captured output. With the child's result withheld, every row reports `evidence-unrunnable`; no verdict
is reachable from the recorded prose.

### The oracle is the failure message, and no code path reaches a count
A control's disposition is decided by the message it produces, not by a pass/fail tally. The lane
carries no tally identifier, no comparison against the length of a pass/fail collection, and no
test-runner surface — an observation varied only in its MESSAGE moves the verdict, and one varied only
in its CASE COUNT does not.

### A citation that cannot run says what was tried
An unresolvable path, a control no runner assembles, and a control that exceeds its deadline are three
distinct reports, each naming the path, the runner and the deadline. "Slow" and "broken" do not
collapse into one verdict.

### Recorded case count is a separate axis from pass or fail
A recorded size that no longer matches the observed one is reported as `evidence-size-drift` against
the item whose register recorded it, and it changes no confirmed row's verdict. The observed number is
what executed, not what the file's text declares.

### The register's own claims are re-run against this repository
Over the shipped work stream the lane reads 114 register rows and reports on each: measured
2026-08-30, four `evidence-size-drift` warnings against milestone 66's register and 44
`evidence-no-register` statements for items that declare no controls — the latter reported as
*declaring no controls*, which is not the same as clean.

### Doctor still never executes, re-asserted from the executor's side
`src/work-doctor-controls.mjs` reaches no child process, no dynamic `import()`, no `node:fs/promises`
and no wall clock, and no module under `src/work-audit/` is reachable from `src/work-doctor.mjs` or
from any module in its `CHECK_GROUPS` registry — asserted over the whole import closure rather than
over direct imports. The audit's finding codes are disjoint from `CONTROL_FINDING_CODES`, so neither
command's severity table can decide the other's meaning.

## Assumptions

- **The registration answer arrives from the census lane** — where none is handed in, every row is
  reported as re-run without an answer to *"does any runner assemble this control?"* rather than being
  silently trusted; `unregistered` is unreachable without it.
- **One execution decides a verdict** — the lane has no re-run-on-failure and no transience record, so
  a flaky control is reported as a failing one. This is deliberate: either would change what a verdict
  means, which is an ADR act rather than an implementation choice.
- **Tier 2 is available and never default** — driving the remaining suites costs roughly nine minutes
  (spike 56's table) and runs behind an explicit scope; the default population is the arch tree.

## Gaps

### A contradiction against an accepted register needs no corroboration
- **Status:** open
- **Discharge condition:** a ruling on whether a contradiction raised against a `done` milestone's
  immutable register must be corroborated by a second run before it is reported at `error`, and the
  lane implementing whichever answer the ruling gives.
A single execution decides an error-severity finding against a register nobody may now edit, and the
report records nothing about transience. Cold-run cost is why this matters rather than being
theoretical: evaluating the runner's module graph measured 47 s cold against 3.1 s warm on this
control node, a 15x penalty a per-control deadline cannot distinguish from a broken control.

### An `evidence-contradicted` pairing was observed twice and cannot be constructed
- **Status:** open
- **Discharge condition:** either a reproduction that identifies the path, or enough clean sweeps at
  the milestone close to retire it as an artefact of code that has since changed.
Two cold first-of-session sweeps produced error-severity contradictions whose text ended *"…and it
produced: `<no message>`"*, a pairing the shipped code cannot construct — `contradicted` requires a
non-empty message, read from the same frozen observation in the same iteration. Thirty later sweeps
were clean, and the property is now a gate (`acd-evidence-oracle-is-a-message`, lane B2, over 150
combinations) so a recurrence is red rather than anecdotal.
