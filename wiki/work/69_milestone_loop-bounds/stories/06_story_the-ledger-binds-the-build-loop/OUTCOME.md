# 06 · The ledger binds the build loop — Outcome

## Delivered

### The build loop writes a progress ledger
Every measurable build round the loop drives appends a deterministic sample — files touched, lines
changed, commits made, failing count — to that run's own `runs/[<node>/]<runId>.progress.ndjson`
sibling, through `src/loop-progress.mjs`; `src/commands/loop.mjs` and `src/work-loop.mjs` are its
production importers, and the run record's key set is unchanged.

### A round that cannot be measured leaves no trace and no consequence
A round whose failing count could not be measured appends no sample at all, and a git call, lane or
ledger write that fails degrades that round rather than failing or halting the build.

### A stalled attempt is reset, and a repeatedly-reset one escalates
At the declared stall bound the loop resets the attempt and carries its summary into the next
attempt's brief, spawning a fresh session rather than resuming the stuck one and leaving the
uncommitted work in place; at the declared reset bound it halts on `progress-exhausted` for a human,
with the work preserved for triage and the resets tally reconstructed from the run's own persisted
brief on `--resume`.

### A build that has stopped reducing its failing count halts
`decideLoopProgress` consults the sample policy first and the failing-count derivative only when the
sample policy says continue; consecutive measured rounds with no reduction reaching the bound stop
the build on `no-progress` with cycles still remaining on the engine cap, and the failing count is
`work:grade`'s own `cases.failed`, with `indeterminate` read as an absent measurement rather than as
a count of zero.

### An unmeasured round is dropped from the derivative
An absent round adds no stall and clears none: the bound counts non-reducing transitions between
measured rounds, so `9, 9, —, 9` halts on the same two transitions as `9, 9, 9`, and a build nothing
could measure is an unbounded continue that reports itself unmeasured.

### Every framework config ceiling is checked for a consumer, not just a resolver
`test/arch/acd-progress-ledger-consumed.test.mjs` walks every `config:` ceiling on every framework
loop record and names a `loop-ceiling-unconsumed` finding for any whose pointer resolves while no
production module outside the bound's declaring home reads it; all four resolve to readers today.

### This repository can measure a round
`.aof/aof.config.json` declares a `work.rubric` — a runnable command, a report format and a floor —
so a build round driven here yields a failing count rather than an indeterminate grade and the ledger
is written on this tree. The declaration's own command and floor are milestone 54's surface and have
already moved once (F-69-V18); what this story delivers is that a declared rubric is *consumed*, not
which command it names.

## Assumptions

- **The failing count has exactly one source** — `work:grade`'s `cases.failed`, invoked directly for
  the number; the gate ladder's `work:grade` rung and its verdict→act routing remain unwalked and are
  54/03's contract.
- **The resets tally is scoped to one loop run on one item** — reconstructed from that run's
  persisted brief, never recounted from an earlier invocation's history.
- **A workspace that declares no rubric keeps an empty ledger and an unbounded build** — dormant and
  honest, rather than bounded by a number nobody measured.

## Gaps

### A ceiling's reader is not proved reachable
- **Status:** open
- **Discharge condition:** a check that resolves each declared bound's reader to a production entry
  point, rather than to the existence of a reading module.

The `loop-ceiling-unconsumed` check proves a bound has a production reader outside its declaring
home; it does not prove that reader is itself called. `src/loop-progress.mjs` read
`work.loop.buildNoProgressRounds` throughout F-69-V7 while nothing called `src/loop-progress.mjs`, so
the check would have passed on the tree that raised the finding. Reachability is asserted for this
one bound only, by the same suite's first case.

### The traceability lane is unarmed on this item
- **Status:** open
- **Discharge condition:** `work.rubric.report.path` is set, so `declaredReportFrom` resolves and the
  join runs.

`work.rubric.report` declares `format` and `floor` but no `path`, so 54/04's lane no-ops and
`aof work doctor` reports `rubric-join-unchecked` — emitted case names are joined to no scenario
names here. The surface is milestone 54's.
