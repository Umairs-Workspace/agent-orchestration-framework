---
doc: retrospective
promotionFrom: 1
---
# 161/01 · Wiki source citations are checked by doctor — retrospective

## R1 · A new kernel module missed the package-boundary allow-list its lane never selected

**Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** The story added `packages/work/src/wiki-citations.mjs`, which imports `node:path`,
`node:fs` and `node:fs/promises`. The `work` package's extracted-kernel case in
`test/bundle/yarn-installation.test.mjs` refuses any native import that has no entry in its
allow-list. Neither the story's `files:` nor its lane selection included that suite, so the red
reached verify, where the importer sweep found it.

**Why:** The plan listed the suites that exercise the probe's behaviour. It did not list the
controls that pin a new file's shape, such as package boundaries and import allow-lists. Those
controls run only in the whole-tree grade, and that grade timed out (161/R1).

**Lesson:** When a story adds a source file to an extracted package, its plan declares the
package-boundary allow-list (`test/bundle/yarn-installation.test.mjs`) in `files:` and its lane
selects that suite. The new file's imports are part of the contract, not an implementation detail.

**Refs:** ../../VERIFICATION.md F-01; m145/F-145-01 (same class, different file).
