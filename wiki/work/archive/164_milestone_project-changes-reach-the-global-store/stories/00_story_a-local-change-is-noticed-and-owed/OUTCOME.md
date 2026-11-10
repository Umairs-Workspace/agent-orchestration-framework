# 00 · A local change is noticed and owed — Outcome

## Delivered

### Changed-since-observed baseline
`work_item_observations` (projection store schema 11) holds this node's fingerprint of each row it last wrote, per workspace, plus a stat digest under ref `*`; only a successful upsert advances it, and `packages/work/src/local-change.mjs` is the one home of `rowFingerprint`/`locallyChanged` (FF-16401).

### A local change takes its row
A record whose projected row changed since this node observed it takes authorship of its row in the next publish, exactly as an operator verb's ref does; an untouched record never overwrites another node's report, and a prose-only edit claims nothing.

- **Another machine's lane is honoured** — a changed ref an active assignment holds is reported `held`, never written, and lands over the lane's report once the lock releases.

### Workspace changes are owed in the effects journal
A noticed change appends one `workspace.changed` event (id from workspace and digest, collapse key `ws:<id>`) drained by the existing `publish-projection` reactor; newer marks supersede older owed ones, a verb's event is never superseded, and the journal is schema 2.

### Every aof command syncs its own workspace
The CLI face runs the sync pass for the command's own propagating workspace before it sweeps owed effects, and a failing pass never changes the command's own result.

### A linked worktree never publishes
A linked `git worktree` of a mesh-published repository is refused by the propagation predicate (`mesh-workspace-secondary-checkout`), so only the repository's own checkout publishes the workspace's rows and root.

## Assumptions

- **One full clone per workspace id** — a second full clone with the same `workspaceId` is not detectable from the checkout and would still publish over the first (TECH_DEBT item 4).

## Gaps

### Per-command cost of the stat walk
- **Status:** open
- **Discharge condition:** the CLI pass's cost on a ~3,000-record work tree is under 250 ms (a cheaper change detector than a stat of every record file, or a walk scoped to the files rows derive from).
Every command in a propagating workspace stats every `.md`/`.feature` under its work dir: measured 0.6–0.95 s on this repository's ~3,200 files (about 1.1 s added to a warm `aof` command), not the ~240 ms recorded at review.
