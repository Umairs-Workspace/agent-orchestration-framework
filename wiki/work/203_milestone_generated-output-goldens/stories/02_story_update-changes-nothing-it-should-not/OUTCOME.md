# 02 · Update changes nothing it should not — Outcome

## Delivered

### `aof work update` is idempotent on every init scenario

`update` run on each `work-init` scenario's own output leaves the tree equal to that scenario's baseline and skips every planned file. The rewritten lock differs only in its instants.

### A customised update held to a baseline

The `customised-update` scenario holds that `update` keeps an aof file the user edited (reported as drift), leaves a file the user added untouched, and keeps the user's merged settings and hooks. It also holds that the kept file's lock entry moves to the end of the lock (m203/F-03).

### An upgrade from the committed baseline

A committed baseline rebuilds into a real tree with real lock, journal and Codex hook-ownership hashes (`rehash`/`rebuild` in `test/support/golden/baseline-store.mjs`). The rebuilt `default` tree with an older, a retired and an absent file updates to exactly 1 created, 1 updated and 1 deleted, and ends on `default`. A baseline whose lock records drift is refused, not rebuilt.

### One baseline on any OS

A Windows-shaped capture of every scenario in both lanes normalises to exactly its committed baseline, on whatever OS runs the suite. The shape is CRLF files, Windows temp paths in another case, and JSON-escaped `\` in step records.

## Assumptions

- **The rebuild knows one Codex ownership kind** — hook groups, as the last N of each event. Any other ownership kind is refused by name, and no current baseline holds one.
- **aof writes no `\` outside a temp path** — a separator aof itself renders into content on Windows would be a difference in aof's output, fixed where it is rendered and never normalised (ADR-002 §5).
