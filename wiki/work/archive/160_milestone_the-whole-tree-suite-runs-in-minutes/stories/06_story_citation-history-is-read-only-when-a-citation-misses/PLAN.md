# 160/06 · Citation history is read only when a citation misses — build plan

## Mechanism

Today `readRenameMap` runs `rev-parse` and two `log` walks, plus a `diff`, and returns a `Map`.
Doctor, validate and tune each await it before they look at a single citation. Turn it into a
loader: an object whose `load()` runs the existing read once, memoising the promise, and whose
construction runs nothing. The per-HEAD memo and the empty-map degradation stay where they are,
behind `load()`.

Each consumer then works in two passes. First it resolves every citation with no rename map, which
is the on-disk check `resolveCitedPath` already makes. If any citation misses, it calls `load()`
once and re-resolves only the misses with the loaded map. Doctor's snapshot builder is the main
case: it hands the map to the control probes as plain data. So build the snapshot's map from the
loader only when the probes report a miss, and keep the probe itself pure and synchronous. Validate's
citation loop and tune's provenance follow the same shape.

## Verification step

Count git spawns, with refine's preload profiler, for `aof work doctor 160` and
`aof work validate 160` on this checkout, before and after. Then do the same for one
`loop-command-wave` case run alone. Every finding must be identical before and after: diff the
`--json` outputs. Record the counts in VERIFICATION.

A finding that changes means a consumer skipped the second pass. A git spawn that remains with no
miss means a reader still calls the loader eagerly.

## Out of scope

- Making the history read itself faster: it is only taken when needed.
- The loop's own git reads: story 00.
