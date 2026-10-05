# 01 · The ranking is held by an eval — build plan

## Mechanism

The eval is a pure function over two inputs: a record set and a frozen pair table. Each pair is
`{ query, scope, expect: "<item>/<id>", from: "<item ref>:<DOC>.md" }`. For each one it runs `rankRecords`
from `local-retrieval.mjs` with the pair's scope and `limit: 5`, and reports `held`, `lost`
(found at rank N > 5, or not in the ranked set) or `gone` (no record in the set carries that
item and id). Export the runner and the table from the arch-test file. The `@executable` suite
drives the runner over small fixture record sets. The fitness function drives it over the live
corpus.

The live record set is `buildRecords(null, ctx)` from the core application's local indexing
(the pattern `acd-memory-derived-index.test.mjs` uses), with `ctx` pointed at the repository's
own `wiki/work` and project root. It never calls `reindex`, so nothing is written.

## Verification step

Run the story's retrieval eval alone through the runner's `--only` selection, with an
isolated `AOF_GLOBAL_HOME`, and it is green. Then make it fail: sort `rankRecords`' output
ascending instead of descending, and the eval must red, naming pairs and their ranks. Record this
red probe in VERIFICATION's fitness register. A green under a reversed sort would mean the eval
holds nothing.

## Out of scope

- The graph re-rank. It reads a git-ignored artifact that a clean worktree lacks (ADR-005 §3).
- Any change to ranking. This story only observes.
- A CLI face for the eval. The arch test is the surface.

## Known traps

- Pairs from the newest ARCHITECTURE files cite items that will be archived. Name the record and
  its provenance by item ref, never by a path, so an archive move does not stale the table
  (134/01/R2). The provenance check resolves the ref through the stream, then reads that item's
  document.
