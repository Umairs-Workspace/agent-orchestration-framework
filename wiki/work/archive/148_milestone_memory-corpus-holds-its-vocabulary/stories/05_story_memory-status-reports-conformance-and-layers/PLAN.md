# 05 · Memory status reports conformance and layers — build plan

## Mechanism

`executeMemoryVerb` already composes `brief` over `backend.recall("", scope, { limit: Infinity })`.
Do the same for `status`. Call `backend.status(ctx)` for the backend's own facts (store path,
graph state, egress), then one unscoped, unlimited recall, then fold a pure
`statusComposition(records, { indexVersion })` over the records. Spread it onto the backend's
result: `types`, `layers` and `conformance`. The `index` staleness block is the backend's own
(story 02), and it passes through untouched.

The composition lives in `memory.mjs` beside `briefDigest`. It reads `RECORD_TYPE_LAYERS` (new, in
`local-retrieval.mjs` beside `MEMORY_RECORD_FIELDS`) and story 02's enums from
`@aof/work/memory-vocabulary`. The backends' own `lessons`/`adrs` (graphify) and per-type keys
(local) stay as they are, because removing a key is a consumer change this story does not need.

The text view, `renderMemory("status", …)`, keeps its first line byte-for-byte and adds one
`layers:` line and one `conformance:` line. Story 02 owns the stale line.

`renderRecallBlock` inserts one field, `[t1; t2]`, between the title and the source, only when
`tags` is a non-empty array, and treats a missing `tags` (a version-1 store) as empty. So an
untagged line stays at five fields, which `memory-recall-block.suite.mjs` pins, and the source stays
last, where that suite finds it.

## Verification step

1. Source-run `aof work memory status --json` against the live graphify store (re-ingested after
   02 and 03 land): `types` sums to `recordCount`, and the lesson conformance shows about 90 blank
   kinds and about 140 non-enum kinds (re-measured).
2. The same against a temp local-backend stream: identical `types` and `layers`.
3. FF-14803 is green, and `memory-integration`'s sum row stays green.

## Out of scope

- `brief`'s lesson/adr digest. It is a different view with its own partition purpose.
- Per-lesson accounting of surfaced, honoured and recurred (`memory-closes-the-loop`).
- New record types (`episodic-memory-is-recallable`).

## Known traps

- Two `status` paths reach the seam: the routed `work:memory` command and `runMemory`. Both call
  `runMemoryVerb`, so compose there, never in a face.
- `recall` on graphify loads the work graph and re-ranks. With an empty query and no limit that is
  the same cost `brief` already pays. Do not add a second loader.
