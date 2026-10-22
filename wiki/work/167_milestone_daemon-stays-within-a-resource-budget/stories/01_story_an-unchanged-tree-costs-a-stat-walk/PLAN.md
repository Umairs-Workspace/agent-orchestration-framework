# 167/01 · An unchanged work tree costs a stat walk — build plan

## Mechanism

`discovery.mjs` gains two things:

- `workTreeStatDigest(workDir)`, moved verbatim from the publisher, including its degrade code
  and its concurrent stats.
- `readStreamSnapshot(workDir, { readMeta })`. It computes the digest. On a hit it returns the
  remembered `{ digest, items, metaByRef }`. On a miss, or with no digest, it runs `listItems`
  plus the record-doc reads, remembers the result under the new digest, and returns it. A module
  `Map<workDir, Promise>` holds the in-flight read, so a second caller awaits the same promise. A
  rejected promise is deleted from the map before it rethrows.

Consumers change to read through it:
- `buildStreamView` (`read.mjs`) takes its disk items and metadata from the snapshot instead of
  `listItems` plus per-item `readItemMeta`.
- `readWorkspaceProjectionItems` (`projection-store.mjs`) builds its rows from the snapshot's
  metadata.

The publisher's `syncWorkspace` imports `workTreeStatDigest` and deletes its own copy.

The meter calls go at the hit and miss branches, with the workspace label passed in by the
caller, since discovery does not know workspace ids.

## Verification step

Over a generated tree of 1,800 docs, with the meter in hand: read twice and assert the second read
opened nothing (spy on `readFile`) and took under a fifth of the first's time. Edit one doc and
read again: the change is answered. Fire 5 reads at once: exactly one parse.

## Out of scope

- Per-file memoisation inside `readItemMeta` (ADR-003, alternative 3).
- How often the tick walks. A walk per tick per workspace stays, and the budget judges it (00).
