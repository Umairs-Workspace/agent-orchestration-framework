# Build brief

## Mechanism

The seam's one dispatch point is `executeMemoryVerb` in `memory.mjs`. Compose the port there, once
per call, over the backend `runMemoryVerb` already resolved, then map each verb onto it:
- `recall` → `engine.recall(query, scope, opts, ctx)`;
- `recurrence` → `engine.recall(query, {}, { limit: Infinity }, ctx)`, then `evaluateRecurrence`,
  unchanged;
- `reindex` and `ingest` → `engine.ingest("work", { only }, ctx)`. The port calls `reindex(only)`;
- `status` → `engine.status("work", ctx)` for the base, then today's unbounded recall through
  `engine.recall`, then `statusPartition` and the accounting, unchanged.

Nothing else in the seam moves. That includes the registry and its one selection read (05/ADR-002's
invariant), the parse, the gate, the projections and `record-recall`'s ledger path.

Each record backend gains `corpora: RECORD_CORPORA` on its default export. That covers `local`
(`createLocalBackend`'s `defaultBackend`), `none`, and the graphify memory backend while it exists.

Watch for:
- The port answers `corpus-unserved` as a value. If a backend ever lost its declaration, recall
  would return `{ served: false, … }` and the block projection would print garbage. Construction
  refuses an undeclared backend first, so the failure is loud. Keep it that way, and do not make the
  seam tolerate a miss here.
- `runMemoryVerb`'s help and gate run BEFORE resolve. Composing the port must stay after the gate,
  so `-h` still resolves nothing (the 128 regression).
- Grep the in-process harnesses for hand-rolled `{ name, recall, reindex, status }` literals. Each
  gains `corpora`. Run every file that matched, not only the declared suites, because a stub missed
  is a construction throw in a suite the lane may not select.

## Verification

Under an isolated `AOF_GLOBAL_HOME`, on a temp project with `memory.backend: local` and the 178/01
fixture stream (one ADR "pin line endings", one near-miss lesson), ingested:
1. Capture stdout, stderr and the exit code of each argv in task 01's outline, through both doors,
   on the commit before this story.
2. Capture the same after the story.
3. `diff` them. They must be empty.

Then run the five stub harnesses and the two arch indexes. Record FF-17902's red probe: delete
`corpora` from `none-backend.mjs` and quote the message.

## Out of scope

The code corpus (02, 04). Retiring the graphify memory backend (`retire-graphify-memory-backend`).
A `--corpus` scope. The ranker.
