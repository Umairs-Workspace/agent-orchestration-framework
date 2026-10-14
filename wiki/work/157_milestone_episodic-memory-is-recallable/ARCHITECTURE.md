# 157 · Episodic memory is recallable

## Recall and source evidence

Architect query `episodic findings feedback terminal run provenance`, scope
`{"area":"architecture"}`, returned five ADRs. Observation
`ef2d5e55-5b38-433c-a1ca-e2f385dea7e2` honours m148/ADR-004 (one layer map),
m05/ADR-007 (derived, source-resolvable records), and m20/ADR-006 (reuse the run
store); m21/ADR-002 and m61/ADR-007 are irrelevant to this change. No near-miss
was returned. PO query `episodic findings feedback terminal runs retry triage retrospective`,
scope `{"item":"157"}`, returned nothing; observation
`8d6049ce-6c47-4a8b-a047-1d57a0b3d8e2` records that empty result.

The codebase graph is unavailable: the first refine attempt's build hit
`spawnSync graphify.exe EPERM` in its sandbox, and this attempt's `aof graph build .`
ended in `graphify-timeout` (120 s). There is no fresh BuildResult, builtAt, egress
or counts to claim, and no stale graph is treated as current. Source imports
establish the boundaries instead: both backends consume the same `buildRecords`
(`graphify-backend.mjs:118`); core injects cross-package readers
(`bindings/memory/local-indexing.mjs`, assembled at `assemble.mjs:399` after the
run store and observe services tune already receives at `assemble.mjs:400`); tune
calls `parseRetrospective` directly (`bindings/work-tune/corpus.mjs:7`); workflow
text is authored in bundle commands and the Codex variant, then rendered.

## ADR-001: Existing sources become three episodic record types

**Status:** Accepted · **Date:** 2026-10-11

Extend the any-item, subtree-scoped walk in
`packages/knowledge/src/memory/local-indexing.mjs:635`. Add a dedicated
`episodic-indexing.mjs` leaf for finding, raw-feedback and run compilation.
Both backends use this walk; imports retain their existing source set. Live,
archived, nested-story and backlog item sources are read wherever locally present.
Cache-only items retain the existing reported skip. Nothing writes to the sources.

Records retain the 14-field MemoryRecord shape, including tags as an array. Set
recordType and kind to `finding`, `feedback` or `run`, area to `delivery`, and item
to the full owning ref. Id is the declared finding id, raw feedback id or runId;
identity is (item, recordType, id), never bare id. Preserve source wording in text.
Title/summary are deterministic readable projections, with failureReason visible
for failed runs. Missing owner, stage or status stays empty, never inferred from
file mtime or a nearby run. Run phase comes from brief.loop.phase: continue maps
to build; refine and verify retain their names; absent phase stays empty. A
finding's explicit Stage takes the same mapping; otherwise its verification
source supplies verify. Raw feedback has no phase/outcome fields, so both are
empty; actor supplies owner. Finding status is its explicit triage status, if any;
run status is outcome. These values do not extend the lesson-only vocabulary.

Finding declarations come from `VERIFICATION.md` and `SESSION.md` Findings
registers, using `registerDeclarations` and the F form from `declared-id`, for
both headings and first-cell table rows. Read the complete heading section or row,
including severity, disposition and evidence; stop at the next peer boundary.
Tables map their header labels, not fixed column positions. Fences, comments,
prose citations, other namespaces and rows outside the register create nothing.
One declared id appearing as both a summary row and a detailed heading produces
one record: merge distinct source text in document order and retain the first
declaration as primary source; include other locations in text. Duplicate ids
remain doctor's concern. Whole-document lesson/ADR extraction stays unchanged.
This revisits the memory-wide prohibition in item 66's ADR-008 only for this new
finding leaf; local-indexing's existing lesson/ADR grammar remains document-wide.

Read FEEDBACK.ndjson through its existing reader and select only kind raw.
Classification and recall rows never create feedback records; STATE feedback is
a projection and is not indexed. Resolve each raw entry to its physical ledger
line, retaining blank-line offsets and verbatim text. Malformed input uses the
reader's diagnostic/refusal, never invented records or silently clean evidence.

Inject readRuns and the existing flat/node path builders through core assembly;
knowledge must not import execution or core. Only done, failed and cancelled
states produce records; queued/running/parked states do not. Use the store's
normalised outcome, attempt, retryOf and failureReason in searchable text. Keep
the store's corrupt-record diagnostic behavior. No transcript is opened.

For stalls, inject readLatestSnapshot and resolve a story's parent milestone
snapshot explicitly (the reader owns milestone snapshots). Match agents by BOTH
sessionId and attributedTo equal to the run's full item ref. Fold matching stalls
into that run's text, with snapshot path and JSON pointer for each contributing
agent. A missing/unreadable snapshot, missing session, wrong attribution or native
runtime without stall telemetry is unavailable, never zero. A matched agent with
an empty stalls array is known zero. Never create observation records or borrow
another session's stalls. Source root follows the configured work directory;
if the existing snapshot reader's fixed-root limitation applies, report unavailable
and do not read a different work tree.

## ADR-002: Source locators grow without a new record field

**Status:** Accepted · **Date:** 2026-10-11

Supersede the path-and-line-only clause of m05/ADR-005 for JSON-derived records:
source remains a string. Markdown is `<work-relative-path>:<one-based-line>`;
a JSON document is `<work-relative-path>#<RFC6901-pointer>`; NDJSON is
`<work-relative-path>:<one-based-line>#<RFC6901-pointer>` into that line's JSON
value. Empty pointer means the root object, so a run source ends in `.json#`
and raw feedback ends in `.ndjson:3#`. Escape pointer segments with ~0 and ~1.
This is a locator grammar, not a URL; preserve existing imported-source bases.

Extend resolveRecordSourcePath to retain legacy path/line/absPath answers and
add pointer only for JSON locators (empty string is a valid pointer). JSON without
a line reports line null. Callers resolve the selected JSON value, not a guessed
line in pretty-printed JSON. A secondary stall locator resolves to its snapshot
agent. Absolute/traversal locators and symlink escapes are rejected; no source
resolver may turn a record into an arbitrary filesystem read.

Both index versions move from 2 to 3 because older source readers cannot interpret
the extended grammar. Existing stores stay readable and report stale until ingest;
no migration or source rewrite. All fields stay present with the existing empty
values. The derived-index source controls gain JSON resolution; delivered task
features are not edited. FF-15701 guards this addition.

## ADR-003: Every consumer accounts for the new pool

**Status:** Accepted · **Date:** 2026-10-11

Add the three types to RECORD_TYPE_LAYERS as episodic. The seam's existing types,
layers and lesson-only conformance remain authoritative. Extend local legacy
top-level counters with findings, feedback and runs so their sum still equals
recordCount; retain graphify's legacy lessons/adrs subset and its full seam counts.
Kind, item, status, owner, area and stage filters retain their current semantics;
kind finding works because new records carry kind finding. No lesson-kind alias.

The compact block retains old lines byte-for-byte. Episodic lines include their
summary so a run's failureReason is visible, keep kind/area and tags, and keep
source last. JSON retains the frozen record fields plus score. Add recall support
for the already parsed `--all`: return the entire scoped result, overriding
--limit only for recall. Empty query is permitted. Without --all, retain the
five-record default. This is needed to gather an item's complete evidence, not
only its top five matches; no arbitrary large limit or direct-index read.

Tune is deliberately a classified non-consumer of episodic MemoryRecords: its
lessons lane calls parseRetrospective; lineage and observations use their own
readers with their existing floors. Add a mixed-source regression proving its
lesson population, lineage counts and recall accounting do not double-count
the indexed copies. Do not add another tune lane or reverse package dependency.
Recurrence and lesson effectiveness likewise remain lesson-specific.

Keep m148/FF-14801's expected query/reference pairs fixed. Run its live-corpus
eval after adding the records; fix ranking if it fails, never edit expectations.
Extend m148/FF-14803's fixture with every new source type. Existing import,
ranking, frozen-shape, backend-interface and memory-off controls remain active.

## ADR-004: Retry, triage and retrospective consume retained recall results

**Status:** Accepted · **Date:** 2026-10-11

Continue's existing near-miss edge stays unchanged. On attempt >= 2, refresh
ingest and run `aof work memory recall "" --item <ref> --area delivery --all --json`
before building. No stage filter may hide verify findings. Retain this exact
result and identify the prior run through retryOf, otherwise the latest terminal
earlier attempt; acknowledge its failureReason and recalled findings in the
existing build record before implementation. Say missing/unavailable when memory
is off or lineage evidence is absent, never invent a successful acknowledgement.
Attempt 1 has no episodic retry edge.

At finding triage, verify refreshes ingest and recalls
`aof work memory recall "<finding text>" --kind finding --block` across the stream,
without item or stage filters. Candidates support human/agent triage, not automatic
duplicate closure: compare cause/evidence, exclude the current finding's identity,
cite a matching prior finding or explain a distinct incident. Bare F ids do not
identify cross-item duplicates. Keep the existing main-session finding ownership.

Each of these two decision edges submits one completed record-recall observation
on the item it is operating on: edge continue-episodic / actor developer, or
edge verify-finding / actor verifier. Retain query, actual scope and every returned
identity, assign an explicit honoured/departed/irrelevant verdict after the decision,
and preserve one UUID/at for replay. Empty recall submits records []; no default
verdict, re-retrieval, provisional row or extra raw feedback. These are additional
edges to m153/ADR-004, not replacements for its four existing captures.

Retrospective refreshes observability first using the existing gate, then ingests,
then recalls `"" --item <ref> --area delivery --all --json`. Findings, raw feedback
and terminal runs/stalls are gathered through this result. Opening a cited source
to substantiate it is allowed; bulk raw-file enumeration is not the evidence
path. STATE's decisions/closure context may still be read; its feedback projection
is not counted twice. Report empty/off/unavailable evidence explicitly, preserve
the recurrence/promotion pass and post-authoring ingest from milestone 153.
The active retrospective's own nonterminal run is correctly absent. Evidence
gathering is not a third decision-recall ledger edge.

## Breakdown

01 owns source compilation and provenance (ADR-001, ADR-002) as one change: the
two backends share their compiler and cannot safely grow separate parsers, and the
m148 retrieval eval must stay green over the records 01 adds, so ranking rides with
it. 02 owns the consumers (ADR-003); it writes two of 01's files (the status
counters in both backends), so it depends on 01 rather than running beside it.
03 owns the workflow sources and their rendered outputs (ADR-004) and depends on
02's `--all` recall; it shares no write file with 01 or 02. No UI or new
dependency is needed. 01's example map first held the consumer rule too; the
doctor flagged five rules as an oversized story, and 02 is that rule split out.

The consumer census ADR-003 changes together, measured at refine: the layer map
`RECORD_TYPE_LAYERS` (`local-retrieval.mjs:59`); the scope filter `applyScope`
(`local-retrieval.mjs:164`) and ranking `rankRecords` (`local-retrieval.mjs:309`);
the local status counters (`local-indexing.mjs:823`) and graphify's status counts;
the compact block `renderRecallBlock` (`memory.mjs:295`); the recall `--all`
parse (`commands/memory.mjs:79`). Classified non-consumers, kept lesson-specific:
tune's corpus and `recurrence.mjs`. Controls already covering the pool:
m148/FF-14801 (retrieval eval) and m148/FF-14803 (layer-map total).

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-15701 | Both backends derive identical episodic identities from existing sources; every primary and stall locator resolves; rebuilding changes no source | `test/arch/memory/acd-episodic-source-provenance.test.mjs`, registered in `test/arch/memory/index.mjs` (story 01) | ADR-001, ADR-002 |
| FF-15702 | Retry and triage capture their actual scopes/results once; retrospective gathers episodic evidence through recall; source and runtime renders agree | `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs`, registered in `test/arch/memory/index.mjs` (extended by story 03) | ADR-004 |

Each control must have a failing negative probe recorded in VERIFICATION when it
lands. Pending is a refine declaration, never acceptance evidence.
