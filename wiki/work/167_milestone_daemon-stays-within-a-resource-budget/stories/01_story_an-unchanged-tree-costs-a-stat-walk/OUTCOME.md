# 01 · An unchanged work tree costs a stat walk — Outcome

## Delivered

### A read of an unchanged tree is answered from a memo
`packages/work/src/discovery.mjs` remembers one tree read per resolved work dir, keyed by the stat digest and the tree's directory shape. A second read of an unchanged tree opens no record doc, and an edited status or a new item (even one with no record doc yet) is answered on the next read. Both hot readers go through it: `buildStreamView` and the projection store's `readStreamSnapshot` port. A memo answer counts as `cache-hit` labelled `memo`, and a parse as `full-disk-read`.

- **A tree that cannot be fingerprinted bypasses the memo** — an unlistable work dir, or a doc that vanishes mid-walk, is read from disk and never remembered.

### Concurrent reads of one tree share one parse
Two callers at the same moment, such as the presence tick and a board poll, get one parse. A shared read that fails is never remembered, and reads of two different trees do not wait on each other.

### The stat digest has one home
`workTreeStatDigest` lives in `discovery.mjs`. The sync pass and the read memo compute the same digest for a tree, and the sync pass's stat gate is byte-identical to 164/ADR-002's.

## Assumptions

- **A stat walk is cheap next to a parse** — on Windows, one walk of aof's own `wiki/work` (3,338 files) measured ≈1.1 CPU-s, which is material at a 15 s tick (STATE, 167/04 build). ADR-003's ≈240 ms was wall time.
