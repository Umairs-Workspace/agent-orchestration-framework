# 201/00 · Recall hands over a picked block — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

The change hangs off `runMemoryVerb`, the one core path both doors run. A recall that asks for the
block, and not for `--all`, takes a new branch:

1. Ask the port for the whole ranked scope, the way `recurrence` and `status` already do
   (`limit: Infinity`). The backend still filters by scope before it scores.
2. Drop promoted lessons, unless the scope names `status`. Keep the first 20, or the cap when
   `--limit` is larger.
3. Hand the shortlist to the injected picker. Read its answer. Build a `RecallResult` from the
   picked records, with `text` rendered from them.
4. On any miss, use the first cap records of the shortlist instead.
5. Attach the pick report as a non-enumerable property, as the graphify backend attaches
   `graphSignal`.

The picker arrives the way `recordRecall` does: an option on `runMemoryVerb`, passed by the command
door, absent by default. Everything that is the pick's own (the two sizes, the filter, the request
a picker is handed, the reader of its answer, the miss codes) goes in the new pure leaf
`recall-pick.mjs`. The seam only orchestrates.

The render then has nothing to cut: the block path's records are already the picked ones. Keep
`renderRecallBlock` as it is for a caller that renders a result it built itself.

The stderr line is the routed command's to write. The seam returns the report and prints nothing,
which is its standing rule. The face already announces on stderr and keeps stdout as the
command's single document (the journal drain does this).

## Verification step

In a scratch project with `AOF_GLOBAL_HOME` isolated and a small fixture index, run the routed
command with a stub picker injected at the command's construction:

- a stub that answers `[2]` gives a one-line block, and nothing on stderr;
- a stub that throws gives five lines, exit 0, and the `pick-failed` line on stderr only.

Then run `test/memory/retrieval-eval.test.mjs` and the existing block suite unchanged. They must
stay green without edits to their expectations: neither injects a picker, so both see today's
first five. If either needs its expectations changed, the default path moved, and that is a defect.

## Out of scope

- The model call, the settings and the `status` line. Story 01.
- Any prompt. The edges reach the pick through `--block` unchanged. Story 02.
- A `pick` field on the ledger row. ADR-006 rejects it.

## Known traps

- `--block` is a render flag today, parsed into the input and used only by the projections. The
  seam has to read it for the first time. Both doors pass the parsed input, so read it there and
  not in either door.
- The frozen `RecallResult` is asserted key by key (`acd-memory-recall-contract`). The pick report
  must be non-enumerable, or that control and every `deepEqual` on a result goes red.
- An ADR's `status` is `Accepted` and a gap's is its lifecycle. The filter keys on the record type
  first, then on promotion pointers.
- `packages/knowledge/src/memory` is held at its delivered file count with no allowance. The new
  leaf needs its row raised, and the package's `exports` needs the new entry.
