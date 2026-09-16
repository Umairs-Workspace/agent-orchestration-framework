# 01 · Independence computed, and the gate — Outcome

## Delivered

### An optimizing loop with no watcher fails the run
`loop-unpaired-optimizer` is `error`, and `aof work loops validate` exits non-zero when any
error-severity finding is present. The check that has existed since milestone 52 now stops a run
instead of adding a line to it.

### Watcher independence is a computed property of the records
Four independence legs read the parsed model alone and each carries its own code:
`loop-watcher-shares-measurement` when a watcher's measurement pointers intersect the loop's,
`loop-watcher-shares-actuator` when a judging watcher's prose authority is also the watched loop's
actuator, `loop-counter-equals-controlled` when a counter restates the loop's controlled variable
after normalization, and `loop-counter-not-deterministic` when a record declaring `determinism:
counter` cites anything a machine cannot run. No node kind admits an `independence` key and no loop
may name its own watcher, so independence cannot be declared — only computed.

### Every watcher that leans on a model is visible, and never gates
`loop-watcher-is-judge` reports every watcher declaring `determinism: judge`, independent or not, at
`warn` permanently. It is a census, not a gate: whether a metric admits a deterministic computation
is not decidable from a record.

### Severity is a property of the code, and the exit lives only on the face
`GATING_CODES` is a frozen five-member set and `finding()` derives severity from membership in it
rather than from a hardcoded constant. `src/work-loops-checks.mjs` returns findings and decides no
exit code; `loopsValidateCommand.cli.exit` is the sole exit decision, and reading it leaves the run
result byte-identical. The pure check module still imports nothing.

### Nothing inherited turned red
The five promoted codes are the only check codes whose severity moved. Every other inherited check
code remains `warn` and every loader code retains the `warn`/`error` severity it already had.
Measured on this repository at the gate: 0 errors and 39 warnings across nine inherited codes.

### `aof:validate` runs the loop registry as its own deterministic step
The validate procedure runs `aof work validate`, then `aof work loops validate`, then
`aof work doctor`, in that fixed order. The loop gate is a separate workspace-wide step — not folded
into `work validate`, not a doctor lane — and its non-zero exit is surfaced to the operator. All
three installed runtime faces (`.claude`, `.opencode`, `.codex`) carry it.

## Assumptions

- **A watcher's independence is only as good as its declared pointers** — the legs compare what the
  records say, so a watcher whose `measurement:` understates what it actually reads will pass a
  comparison it should fail. The vocabulary being shared between loops and watchers is what makes
  the comparison exact rather than approximate.
- **`loop-watcher-is-judge` is a permanent non-gate** — the census is the input milestone 59 audits;
  nothing here demands that a judge be replaced by a counter.
- **The gate assumes 57/05's records are installed** — the ordering edge `depends: [05]` exists
  because three optimizing loops were unpaired when this story was written; the gate is green today
  because those records are on disk, not because nothing can fail it.

## Gaps

### `FF-5703`'s exit-ownership leg catches one identifier, not the family
- **Status:** open
- **Discharge condition:** the leg is widened to strip comments and match `/exit/iu` (measured to
  redden on all three spellings), declared as a `grantedBy` region in 53's ACCEPT-02 diff ceiling,
  and that ceiling's residue advanced — as one reviewed act by the architect.
- The assertion is spelled `/\bexit\b/u`, so `src/work-loops-checks.mjs` could define `exitFor(…)`
  or set `process.exitCode = 1` and the control stays green. The shipped module contains no exit
  decision and the behavioural contract drives the face's half, so the invariant holds today; what
  is unguarded is a regression into it. Recorded as `F-57-01-1`.

### No control asserts that a command wrapper on disk matches its bundle source
- **Status:** open
- **Discharge condition:** `FF-5313`'s bundle→disk byte-parity leg, which `F-57-05-1` added for
  `.aof/loops/`, is extended to the rendered command wrappers.
- Every contract in this story was green while `.claude/commands/aof/validate.md` carried no
  loop-gate step, because the contract reads `src/bundle/commands/validate.md` and nothing compares
  the two. The wrappers were installed at this gate (`F-57-01-2`), and 28 further bundle members
  remain stale on disk (`F-57-01-4`) — so the class is the repository's normal state, not an
  incident.
