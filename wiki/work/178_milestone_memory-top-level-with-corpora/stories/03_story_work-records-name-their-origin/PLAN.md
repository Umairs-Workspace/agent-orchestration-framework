# Build brief

## Mechanism

`buildRecords` in the local indexer is the one walk both backends share. Before an item's records
are parsed, read its record doc's frontmatter `origin:` (the doc the item's type names: SPEC,
STORY, SPIKE, CHORE or SESSION), and fall back to the top-level driver's when the item is a story
that declares none. Resolve each value against three candidates, in order: the project root, the
doc's own folder, and, for an item under `<workDir>/archive/`, the doc's folder with the `archive/`
segment removed. Keep the first that names an existing file inside the root, made project-relative
with forward slashes. Count every value that resolves to none of them. Stamp the resolved list
onto every record the item contributes, in the walk itself, so the episodic records get it too.
The import-store, co-located digest and auto-memory records get `[]` where they are composed.

Return the drop count beside the records, so `buildIndex` and the graphify store write
`origin: { unresolved }` into the index document and each backend's `status` reads it back.
Normalise a stored record with no `origin` to `[]` the way `withTags` does for `tags`, and render
it in `renderRecallBlock` (` · origin a; b` after the tags) and in the text view (`↳ origin` after
the source line).

Watch for:
- Read the frontmatter once per item, not once per record. Use `parseFrontmatter` from
  `@aof/work/records`, which already parses a flow list such as `[a, b]`; do not write another
  YAML reader.
- Containment uses the same real-path check `resolveRecordSourcePath` applies. A `..` or absolute
  value is never opened.
- The 03/01 overlap: 01 edits the usage and stale-hint lines in `memory.mjs`, and this story edits
  the block renderer and the version pins in `memory-meta-normalised`. Whoever lands second
  rebases onto the other.
- A new field reaches every suite that reads `MEMORY_RECORD_FIELDS` (prior lesson). Run all of
  them, not only the ones in `files:`.

## Verification

Ingest an isolated copy of the live `wiki/` on both backends. Count the declared `origin:` values
independently with a throwaway script and compare its unresolved count with `status`. Spot-check
E1, E5, E6 and E7's records. Diff a `--block` recall for a no-origin item against the pre-change
build. Record FF-17803's red probe in the milestone VERIFICATION (a resolver that keeps an
unresolved value) and quote the message. Run the declared suites and every `MEMORY_RECORD_FIELDS`
reader, under an isolated `AOF_GLOBAL_HOME`. Never run the full suite.

## Out of scope

Indexing `wiki/planning`, an `--origin` scope, ranking on origin, repairing archived SPECs whose
link has moved, and the `aof memory` face (178/01).
