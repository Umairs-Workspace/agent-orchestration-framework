# 164/00 · A local change is noticed and owed — build plan

## Mechanism

Three seams, in dependency order.

**The predicate leaf.** `local-change.mjs` in work: `rowFingerprint(row)` hashes the projected
row's fields in a fixed key order (sha-256 via `node:crypto`, the only import allowed). And
`locallyChanged(fingerprint, baseline)`, where a missing baseline is `false`. Export it through
work's `package.json` `exports` beside the other leaves.

**The store.** The projection store gains `work_item_observations` (schema 11) and two
functions: `readObservations(store, workspaceId, nodeId)` and the write folded into
`upsertWorkItems`. That function takes `localChangeRefs` beside `operatorRefs`, and at the
authorship step (2) a changed ref is treated as an operator ref. In the SAME transaction it
records fingerprints for:
- every row it upserted;
- every row it stepped over as `authored-elsewhere` with no local change;
- every ref it saw with no baseline at all.

It records none for a `held-by-assignment` skip. The workspace stat digest is stored alongside,
in one row keyed by `(workspace_id, node_id, '*')`, or a sibling column. That is the builder's
call; keep it in the same table.

**The pass and the mark.** `publisher.mjs` gains `syncWorkspace(workspace, ctx)`:
1. the propagation decision;
2. the stat digest;
3. if the digest moved, the disk rows (`readWorkspaceProjectionItems`), their fingerprints and
   the changed set;
4. append `workspace.changed` through the effects seam the transitions already use, with
   payload `{ workspaceRoot, workspaceId, digest }`, id `workspace-changed:<id>:<digest>` and
   collapse key `ws:<id>`;
5. drain that event.

`publishItemProjection` computes `localChangeRefs` itself from the baseline, so a verb event and
a mark land identically. The journal adds `collapse_key` (schema 2) and the `superseded` status.
`table.mjs` declares the event in `eventOrder`.

The face calls `syncWorkspace` for `loadWorkspace(cwd)` just before `sweepPendingEffects`, inside
the same never-fail `try`.

### Cost

The CLI pass is one `readdir`/`stat` walk of the record docs. On an unchanged tree that is all it
does. Rows are read only when the digest moved.

## Verification step

With an isolated `AOF_GLOBAL_HOME` and a mesh-enabled fixture workspace:
1. publish once;
2. hand-edit a STORY.md status;
3. run `aof work list`;
4. open `projection.sqlite`: the row carries the new status and this node's id;
5. open `journal.sqlite`: one `workspace.changed` event, its step `done`.

Repeat with the row pre-seeded as another node's and the scaffold unchanged: the row must stay
that node's.

## Out of scope

- The daemon drivers: story 01.
- The read overlay: story 02.
- The retry ceiling and the visibility surface: story 03.

## Known traps

- `acd-work-items-single-writer` pins every `work_items` write to `projection-store.mjs`, and
  pins the screen's bound columns. The observation write belongs in the same module, under the
  same discipline.
- `acd-global-publisher-single-seam`: only the publisher reaches the store for writes. The face
  reaches `syncWorkspace` through the publisher binding, never the store module.
- `packages/work/src` has a ceiling with no allowance: the new leaf raises it to 45, with its
  ownership in the budget row.
- Never run these tests without `AOF_GLOBAL_HOME=$(mktemp -d)`. `global-work-propagation.test.mjs`
  is a focused `--only` run, never part of the full suite on this machine.
