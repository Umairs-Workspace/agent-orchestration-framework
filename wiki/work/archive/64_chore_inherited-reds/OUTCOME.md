# 64 · Green the reds that arrived on main — six arch gates and two racy tests — Outcome

## Delivered

### The inherited fitness lane is green with no gate relaxed
All seven inherited-red gates (`acd-graphify-backend-selection`, `acd-memory-backend-selection`,
`acd-no-new-silent-catch`, `acd-work-command-route-coverage`, `command-core-contract`'s registry
list, `acd-bundle-manifest-hashes`, and the resume lane) pass because the invariant each asserts
holds at the source — no baseline was moved, no carve-out was widened, and `config.memory?.backend`
has exactly one code read at [work-memory.mjs:77](src/work-memory.mjs#L77).

### The mesh timing-race class is fixed, not observed green
The three lanes that resolved or advanced without waiting for their observer — the resume lane in
[mesh-terminal-input-path.test.mjs](test/mesh-terminal-input-path.test.mjs), and the premature-done
and session-tree lanes in
[mesh-worker-completion-detection.test.mjs](test/mesh-worker-completion-detection.test.mjs) — now
settle in every interleaving, and every sibling resolve/lever site in the suite carries the same
`waitFor` guard.

### The `work:*` family rule is exercised, not assumed
A newly registered work command lands in `WORK_IDS` and in `BOARD_DEFERRED` (or a served route) in
the same commit — held the first time it was exercised, by milestone 63's `work:trigger`.

## Assumptions

- **The premature-done fix rests on argument, not on a reproduced failure** — the losing
  interleaving needs full-suite event-loop contention, which a focused single-process run cannot
  supply; the bounded advance loop removes the dependency on that interleaving rather than
  out-racing it.
