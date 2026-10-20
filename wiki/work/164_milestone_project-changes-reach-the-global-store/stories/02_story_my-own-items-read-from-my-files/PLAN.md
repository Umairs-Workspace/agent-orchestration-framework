# 164/02 · My own items read from my files — build plan

## Mechanism

`readCachedItemRows` (`cache-read.mjs`) already opens the store once per read. It adds a third map,
`observations: Map<ref, fingerprint>`, for this node, read through story 00's
`readObservations`. That is the same opener, with no new one (TECH_DEBT 12).

`buildStreamView` decides each disk item's overlay through `cacheAnswers(row, { selfNodeId,
locallyChanged })`:
- `selfNodeId` comes from the workspace config, through an injected `meshNodeIdOf`. The core read
  binding wires it, as `doc` and `tasks` already are.
- `locallyChanged` is `locallyChanged(rowFingerprint(diskRow), observations.get(ref))`.

When `cacheAnswers` is false, the item is `answeredFrom: "disk"` and is not counted as a cache
miss, because the disk answered by rule, not by degrade. Doctor's `overlayFor` receives the same
two inputs through `doctorWork`'s options. It stays pure, with nothing read in the engine: the
command edge passes the baseline and the self id in, beside the cache.

`reportedElsewhere`'s three clauses move into the leaf as the first half of `cacheAnswers`, and
`read.mjs` re-exports `reportedElsewhere` unchanged for `doc` and `tasks`.

## Verification step

With an isolated store, seed a row for a fixture item as this node with status `not-started`.
Set the file to `in-progress` and run `aof work find <ref> --json`: it shows `in-progress` and
`answeredFrom: "disk"`. Re-seed the row as `node-9549`, `in-review`, with the baseline equal to
the file's fingerprint: it shows `in-review` from the cache. Edit the file: it shows the file's
status. `aof work doctor <ref> --json` agrees in each case.

## Out of scope

- How the store gets fresh: stories 00 and 01. Showing sync lag: story 03.
- The board/fleet UI, which reads the same seam and inherits the rule.

## Known traps

- `acd-cache-read-surface-boundary` pins which readers are cache-first and which are disk-only.
  This story changes the overlay rule, not the boundary.
- `list --json`'s seven-key element is frozen (m03/ADR-002). `answeredFrom` is stripped at that
  face, as it is today.
