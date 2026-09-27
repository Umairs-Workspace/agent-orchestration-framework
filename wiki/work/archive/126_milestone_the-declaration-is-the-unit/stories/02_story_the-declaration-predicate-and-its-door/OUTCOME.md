# 126/02 · The declaration predicate and its door — Outcome

## Delivered

### The supervised-declaration predicate
`decideSupervisedDeclarations` in `src/work/loop.mjs` is a pure decider that takes workspaces of run
records and returns rows, spelling no failure-reason literal and no run-state literal, opening no
store, touching no filesystem and reading no clock — its verdicts come from `isRunning`, `isStale`,
`retryReadiness` and `readLoopDeclaration`, with `deadline-exhausted` recomputed from the attempt
clock so a lineage whose compute budget is spent is left off the list even when the store answers
ready.

### `isRunning` on the run store
`src/run-store.mjs` exports `isRunning(record)` beside `isStale` — a pure predicate that tells a
record in flight from a settled one, so the run-state vocabulary has one home and a caller can ask
the question without spelling a state.

### Supervision as the declaration's ninth key
A loop declaration envelope is nine keys with `supervised` last, set by `aof work loop --supervised`,
inherited on `--resume`, and projected as a sixth recoverable key defaulting to `false`; the
usable-declaration requirement is still five keys, so every declaration already written to disk reads
back as unsupervised and yields no row.

### The loop's argv in one home
`src/loop-argv.mjs` is a zero-import leaf holding `LOOP_INPUT_KEYS`, `LEVEL_FLAG`, `RESUME_FLAG`,
`loopInputOf` and `argvFor` — the only module in `src/**` that composes a `["work","loop",…]` array.
`src/commands/trigger.mjs` imports it rather than declaring its own, and every `--flag` token it can
emit is one `work:loop` declares in both `cli.spec.flags` and its input schema.

### The declarations door on `mesh status`
`aof mesh status --json` is byte-identical to what it was; the same verb with `--declarations` gains
exactly one key, `declarations`, carrying `{ ok, rows, skipped }`. No second command and no `work:*`
verb answers this question. `resolveNodeWorkspaces`'s `skipped` list reaches the answer verbatim, an
`ok: false` resolver answers `ok: false` with empty rows and no standalone fallback, and each row
carries `id`, `label`, `argv`, `cwd`, `scope`, `level` and `cap` — the `cwd` being that workspace
descriptor's own `projectRoot`, never `process.cwd()`.

### The producer as a closure-free module
`src/mesh/declarations.mjs` holds the producer and is reached only through a dynamic import inside
the `--declarations` branch, so it sits in no static import closure and the command registry is
loaded when an operator asks for declarations and at no other time.

## Assumptions

- **Disk is the authority for a local run** — the producer reads run records through `readRuns` and
  consults no cached or worker-streamed projection, so the answer is correct only on the node whose
  own tree holds the records.
- **The answer's cost is paid only under the flag** — 167 ms over 410 items and 105 records, which
  holds while a supervisor polls it at the measured cadence rather than every tick.
- **A supervised relaunch is always a resume** — each row's argv carries `--resume`, so the total
  budget of an existing declaration is continued rather than reset.

## Gaps

### Nothing consumes the `declarations` key
- **Status:** open
- **Discharge condition:** `126/03` lands the desktop supervisor that polls `mesh status --json
  --declarations` and reconciles the supplied set.
The key is produced and no reader acts on it; a reclaim's verdict reaches a document that today only
an operator reads.

### No declaration on disk is supervised
- **Status:** open
- **Discharge condition:** an operator launches a loop with `aof work loop <scope> --supervised`, or
  resumes one that was.
`supervised` defaults to `false` and the eight declarations this workspace holds are eight-key
envelopes written before the key existed, so the door's `rows` are empty until a new declaration opts
in.

### `src/loop-argv.mjs` names a `src/loop/` family that has no directory
- **Status:** open
- **Discharge condition:** an item moves `loop-argv`, `loop-bounds`, `loop-record` and
  `loop-progress` into `src/loop/` and re-points every dependent of all four.
Four root-level filenames now share a `loop-` prefix and are a family only by naming convention.
