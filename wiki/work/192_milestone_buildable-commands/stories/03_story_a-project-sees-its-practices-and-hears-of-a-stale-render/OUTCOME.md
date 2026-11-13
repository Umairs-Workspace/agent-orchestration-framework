# 192/03 · A project sees its practices and hears of a stale render — Outcome

## Delivered

### The update lists the optional practices
`aof work update` ends its output with one row per declared practice, in declared order: whether it is on in the project's own `.aof/aof.config.json`, its id, its summary and every key that turns it on. The row comes after the summary and before any warning. `--json` carries the same list as `practices: [{id, title, summary, keys, on}]`. A bundle that declares no practice prints no list, and `aof work init` prints none.

### Every render records the practices it was built with
`aof work init` and `aof work update` write `work.practices` (practice id → on) into `.aof/aof.lock.json`. A dry run writes nothing. This checkout's lock records `build-brief: true` and `discovery: true`.

### The work doctor reports a practice key changed since the render
The doctor's `practice-render` lane compares the lock's record with the project's config, one practice at a time. A practice that is on but was rendered off is an error. A practice that is off but was rendered on is a warning. Each finding is `practice-render-stale`, reported once, naming the key and the commands that differ, and ending in `Run \`aof work update\`.` Only a literal `true` in the project's own config counts as on. A key set machine-wide counts as off.

### An install with no record is told once to update
A lock whose `work` section has no `practices` gives one `practice-render-unrecorded` warning and no stale finding. It does not fail the doctor. A project that never installed the bundle gets nothing. A practice the record does not name counts as rendered off, and a record entry for a practice the bundle no longer declares is ignored.

## Assumptions

- **Lock carried by hand** — the lane's lock write was dropped by the loop's reconcile (`m127/F-13`). The record this checkout holds was re-stamped at 192/02's verify and is not yet committed, so it holds only once committed.

## Gaps

### The list fits a 120-column terminal
**Status:** open
**Discharge condition:** every row of `aof work update`'s practice list, with the shipped practices, is no wider than 120 columns, or its key no longer wraps (`F-04`).
