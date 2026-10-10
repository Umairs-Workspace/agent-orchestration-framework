# 153 · Memory closes the loop

## Memory recall

PO recall `memory recall ledger recurrence promotion feedback tune --item 153` returned no
records. Architect recall `append-only recall verdict ledger recurrence lesson metadata consumers
--area architecture` surfaced m124/R7 and four ADRs. m124/R7 is honoured: this document stays
inside the configured 1,400-line budget. The surfaced partition, shatter-edge, ranking and event
vocabulary decisions are honoured by the seams below. No recalled record is claimed as evidence
that a mistake was prevented. The new ledger is not shipped yet; these recalls remain prose.

## ADR-001: Complete recall observations enter the existing ledger

**Status:** Accepted · **Date:** 2026-10-10

Add `aof work memory record-recall <ref> --input <json-file>`; it consumes the observation the
agent retained from its actual recall, never re-runs retrieval. The JSON holds `id`, `at`, `edge`,
`actor`, `query`, `scope`, and `records`; the writer adds `kind: recall`. Each record holds
`item`, `id`, `recordType`, `verdict`. Verdict is exactly honoured/departed/irrelevant. Composite
record identity prevents unrelated R1s colliding. Empty results are recorded as `records: []`.
Use a caller-minted UUID per recall invocation; retrying that invocation reuses its UUID and time.
Require one verdict for every returned identity, no duplicates, nonblank attribution and edge,
and an ISO instant. Unknown fields/kinds remain errors. An identical replay is a no-op; a changed
replay refuses before writing. Existing bytes and raw/classification semantics remain intact.

The agent retains the actual result until its decision, then submits the completed observation.
There is no provisional ledger row, second ledger or automatic honoured default. An interrupted
decision has no completed observation; accounting reports observed decisions, never causal proof.
The writer is backend-independent, including memory off. Exact item resolution and local-checkout
guards precede mutation. Permit backlog drivers, including spikes, for shatter. The work-owned
document transition appends the row and uses the existing publication cascade, without inventing
raw feedback or a STATE feedback bullet. Core injects this capability into knowledge; work must
not import knowledge. Serialise same-item duplicate checking with append so concurrent replay is
also one row. All consumers listed in RESEARCH move together (FF-15301).

Retire the unused `brief` verb and digest exports; reject it with the normal unknown-verb result.
Keep recall's JSON array, compact block, ranking and existing backend interface unchanged.
This is the SPEC-authorised CLI change; merely deprecating an unwired edge would not settle it.

## ADR-002: Forward metadata and calibrated recurrence share existing readers

**Status:** Accepted · **Date:** 2026-10-10

Extend the vocabulary reader and hold from m148/ADR-001, not a second meta parser. Preserve
`Promoted to` verbatim in lesson `status`: `none`, `control:<qualified-id>`, `rule:<repo-path>` or
`prompt:<repo-path>`. Absent legacy metadata stays empty. `Recurs` is optional, one canonical
`<item>/R<n>` reference (accept optional m prefix); index it as `recurs:<ref>` in tags. Preserve
existing qualifiers, record fields and ranking text. No new MemoryRecord field or index version.

At first new append, the retrospective author writes `promotionFrom: <next R number>` in that
document's frontmatter (1 for a new document). The existing meta hold requires promotion on every
lesson at/above that fixed watermark; supplied new fields are checked wherever present. This
allows existing live and archived lessons to remain byte-identical. The watermark never advances
to exempt a later lesson. Missing watermark in a legacy document remains legacy; workflow checks
must prove the author adds it before new lessons. Archived problems remain warnings.

Add `memory recurrence <lesson text> [--exclude <item>/R<n>] --json` at the same
seam. It retrieves whole-index lesson candidates across kinds, excludes the current identity,
then evaluates a deterministic text-similarity score, separate from retrieval ranking. Emit the
top three candidates with scores, threshold/version and the best qualifying reference or null.
Use strict `score > threshold`; equal scores break by canonical reference. Never match an ADR,
infer recurrence from metadata alone, or create an index when memory is off.

The named junction pair crosses kinds: 45/R13 is mistake, 68/R10 is near-miss. Therefore the
SPEC's whole-index/known-pair outcome governs over the origin's illustrative same-kind query.
Filter by recordType lesson after retrieval; do not alter ordinary recall's kind filter.

The threshold is selected at build from labelled positive/negative pairs: audit every recurrence
self-report identified by the origin, explicitly include the junction pair in items 45 and 68,
and include same-topic non-recurrences. Cite both source passages, distinguish ambiguous labels,
freeze a held-out split, and report precision/recall and boundary cases. Require the known pair
and zero held-out false positives; if no threshold meets these, report a blocking finding rather
than guess. FF-15302 holds the labelled decision and negative probes. The retrospective uses the
result before each new lesson, writes Recurs when matched, retains new incident evidence, then
ingests. It never rewrites the prior lesson.

## ADR-003: One read model supplies accounting and advisory health

**Status:** Accepted · **Date:** 2026-10-10

A work-owned accounting leaf reads ledger observations and vocabulary sections; knowledge status
and tune reuse it, doctor receives source facts through its snapshot. Count a surfaced identity
once per recall row, honoured/departed/irrelevant by verdict, and recurred once per distinct new
lesson pointing to that identity. Do not infer transitive recurrences or join on bare R ids.
Scan live, story and archived items, deduplicate identities, and preserve counts for targets no
longer indexed with explicit unresolved provenance. Corrupt input is diagnosed, not a zero.

Status adds nested `effectiveness.types` totals; `--lessons` additionally returns
`effectiveness.lessons` keyed by canonical identity. Include zero-count indexed lessons and
departed/irrelevant alongside the three requested counts; legacy top-level counts remain intact.
Both active backends and none use the same accounting reader; none has no indexed lessons but
can still report existing ledger observations.

Doctor reports recurring and aged-unpromoted lessons as warning-only, outside control gate codes.
Age is subsequent accepted top-level milestones, using acceptance facts, not numeric ref gaps,
wall-clock days or story completions. A story uses its parent's acceptance boundary. Missing age
evidence is unknown, never fabricated. The operator answered 153/03 Q1 on 2026-10-10: warn by
default once five later top-level milestones have been accepted (age >= 5). This settles only
03's reserved policy. Missing legacy promotion and explicit none are both unpromoted, labelled
separately. Count distinct milestones accepted strictly after the boundary; equal acceptance
instants do not establish later acceptance. A completed standalone story uses its own boundary.

## ADR-004: Declared edges retain their original retrieval scope

**Status:** Accepted · **Date:** 2026-10-10

Shatter recalls once before partition, retaining its observation until drivers exist; attach its
single row to the first driver in PRD order, and cite that owner in the other drivers' recall
prose. An aborted shatter with no driver has no item ledger. Refine architect/PO and continue
developer each submit their own completed observation, including empty results, without a second
retrieval. Scope filters remain unchanged. Retrospective recurrence is a matching operation, not
another declared decision-recall edge. Edit bundle sources and regenerate runtime outputs through
the normal renderer; preserve operator changes and ledger locks. FF-15303 covers the edge roster.

## ADR-005: Tune computes a reviewable prompt patch without applying it

**Status:** Accepted · **Date:** 2026-10-10

Join recurrence and verdict counts onto tune's existing lesson evidence, preserving its provenance
floor and formation. A recurring source with one unambiguous prompt target and nonempty Lesson
text may produce a deterministic append patch: exact current bytes plus a delimited lesson block
identified by canonical reference. Repeated generation is stable; an existing identical block is
already-in-force. Conflicting targets/text or inaccessible sources stay explicit findings.
Validate repo-relative paths and realpath containment before reading, including symlink escapes;
generated runtime targets are refused in favour of authored sources. A patch remains advisory,
hand-editable and has no automatic applier; do not add prompt targets to the ordinal acceptor.
No prompt, config, retrospective or ledger is modified by tune.

## Breakdown

Graph build failed with spawnSync EPERM; no current builtAt, counts or egress result exists.
Source coupling in RESEARCH grounds boundaries. Stories 01 capture, 02 metadata/recurrence,
03 accounting/doctor, 04 workflow wiring, 05 tune form waves 01 → 02 → {03,04} → 05.
Shared registration files are owned sequentially; 05 waits on 03, while 04 shares neither's writes.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-15301 | Mixed ledger preserves raw counters, classification and publication; replay cannot double-count | `test/arch/memory/acd-recall-ledger-consumers.test.mjs`, registered in `test/arch/memory/index.mjs`; pending | ADR-001 |
| FF-15302 | Labelled recurrence decision catches the junction pair and rejects held-out negatives without altering base ranking | `test/arch/memory/acd-memory-recurrence-calibration.test.mjs`, registered in `test/arch/memory/index.mjs`; pending | ADR-002 |
| FF-15303 | Every declared decision-recall edge has one complete verdict capture and runtime render parity | extend `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs`, already registered in `test/arch/memory/index.mjs`; pending new assertions | ADR-004 |
