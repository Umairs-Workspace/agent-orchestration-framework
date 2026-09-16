# 01 · The instrument census — Outcome

## Delivered

### Registration is runtime membership, not a mention in the runner's source
`test/arch/acd-test-suite-registration.test.mjs` imports the **assembled** `tests` array and decides
registration by name-set membership for every `*.test.mjs` under `test/`, `test/arch/` and
`test/integration/`. No source-text lane survives in the file, the walked-file floor is asserted
before the membership claim so a moved root fails rather than passes over nothing, and a suite whose
module exports a runner-shaped array the assembled suite does not contain is reported **by name**.

### The twenty-six de-armed suites, and six more nobody had counted
The suites whose spread sites vanished in 15e0a92 — 117 test entries dark for a month — are members
of the assembled suite again, and two of them (`mesh-node-identity`, `mesh-registry-store-seam`) had
rotted red while dead and are repaired. Six further suites registered only in
`scripts/test-unit.mjs`, carrying 122 test entries that `npm test` never assembled, are registered in
what CI executes.

### One bounded seam for every child process the audit family starts
`src/work-audit/spawn.mjs` is the only way a module under `src/work-audit/` starts a process: it
carries a deadline, kills the child on expiry, reports a terminal deadline-expired outcome, and hands
back the observed exit code. No caller passes a shell string and no second spawn helper exists.

### The audit never runs project code inside its own process
No module in the audit family's import closure contains a dynamic `import()` or a `require`, and
every static import is a node builtin or resolves inside `src/`. The runner's assembled suite is
obtained from a child process rather than by importing it.

### A sweep that reports what it read
Every lane the census registers returns a population count with a floor; a clean lane result is not
representable without one, and a count below the floor is a finding naming the sweep, the root walked
and the floor missed — so a gate that ran on nothing says so instead of reading green.

## Assumptions

- **`UNREGISTERED_BASELINE` is shrink-only and every entry names its subject, its reason and its
  origin** — the gate's honesty rests on the baseline never being used to re-silence a suite; a
  baseline entry naming a suite that no longer exists is itself a failure.
- **The floors are set above the populations as measured on 2026-08-29** — a floor is a tripwire for
  a moved or truncated root, not a target, and it needs raising as the tree grows rather than being
  left to drift below what it guards.

## Gaps

### The census reports; nothing yet re-runs the evidence it names
- **Status:** open
- **Discharge condition:** 59/02 lands `src/work-audit/evidence.mjs` and derives every verdict from a
  spawn result, with the oracle being the failure message.
The census decides whether an instrument is assembled and whether a sweep read anything; whether a
recorded `@manual` proof still reproduces is a separate lane that does not exist yet, so recorded
evidence is still trusted as written.

### There is no `aof work audit` verb over these lanes
- **Status:** open
- **Discharge condition:** 59/04 registers the command on the command core with a derived route and a
  CLI↔registry bijection.
The census and the spawn seam are reachable from the arch gate and from tests; an operator has no
command that runs them.
