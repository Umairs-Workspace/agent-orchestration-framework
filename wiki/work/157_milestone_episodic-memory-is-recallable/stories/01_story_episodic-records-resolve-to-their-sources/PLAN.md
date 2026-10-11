# Build brief

## Mechanism

`buildRecords` in the local indexer is the one walk both backends share, and its any-item leg
already reads RETROSPECTIVE and OUTCOME per item. Add a sibling leaf, `episodic-indexing.mjs`,
that the walk calls per item for its findings, raw feedback and terminal runs — keep the existing
lesson/ADR grammar untouched in its own file. The leaf takes its readers as injected collaborators
(the run store's `readRuns` and path builders, observe's `readLatestSnapshot`, the feedback
reader), wired in the core binding the way tune's corpus is already wired; knowledge must not
import execution or core. Findings parse through `registerDeclarations` with the `F` form.

The locator grammar lives in `resolveRecordSourcePath`: legacy answers stay byte-identical, JSON
locators add `pointer`. Bump both index versions to 3; the existing staleness report does the rest.

Watch for: the walk's record ORDER is a ranking tie-break (see its comment) — append each item's
episodic records after its existing ones, never in a second loop. A snapshot reader with a fixed
work root reports unavailable rather than reading another tree.

## Verification

Build an isolated temp stream with every source shape in the task features, ingest on both
backends, and compare identity sets and source bytes before/after. Then ingest an isolated copy of
the live `wiki/work`, resolve every episodic source, and run the m148 retrieval eval over it —
record per-type counts and the eval result. Record FF-15701's red probe (e.g. a resolver that
skips the traversal check) in the milestone VERIFICATION.

Run the declared suites with `node scripts/test.mjs --only <files>`, under an isolated
`AOF_GLOBAL_HOME`; never the full suite on this machine.

## Out of scope

The layer map, legacy counters, block line, `--all` and tune regression (157/02); every workflow
prompt (157/03); transcripts and snapshot-only records.
