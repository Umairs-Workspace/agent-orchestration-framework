---
doc: architecture
---
# 148 · The memory corpus holds its vocabulary — Architecture

The parser, both backends and the seam already exist. What is missing is a vocabulary with one
home, a field for the qualifiers authors write, and a reader of every retrospective. ADR-001 and
ADR-002 give the vocabulary a home and a rule. ADR-003 adds the field. ADR-004 composes `status`
over every record. ADR-005 holds the ranking. ADR-006 widens the reader, ADR-007 holds the writer,
and ADR-008 is the break-down.

## Memory recall: what was surfaced, and what it changed

- Architect recall ("memory record field added index version normaliser parser", `--area
  architecture`) surfaced m39/ADR-001, m05/ADR-005, m13/ADR-001, m13/ADR-006 and m05/R4.
  **m39/ADR-001 is departed from, in writing** (ADR-003): it reused the frozen `status` field for a
  gap's lifecycle with no version bump, and that was right for a single token. A list of
  qualifiers has no frozen field to ride, and folding it into `text` would move ranking.
  **m05/ADR-005 is honoured**: the new field is present on every record and never omitted.
- **m05/R4 is honoured** ("a green suite over a well-formed corpus does not prove the parser is
  robust"). Every count below is measured over the real tree, and story 02's verification measures
  the after state on the live corpus.
- Unscoped recall surfaced **m40/R3** ("a new record kind obliges every consumer that partitions by
  kind; memory status was left counting only lessons+adrs"). It is honoured, and it is live today:
  the graphify backend's `status` still reports `lessons` and `adrs` only
  (`packages/knowledge/src/memory/graphify-backend.mjs:406-440`), though the index holds five types.
  ADR-004 moves the partition to the seam, so no backend can fall behind again.
- Near-miss recall surfaced **m05/R5** ("exercise the dominant shape of the real corpus"),
  **m39/R4** ("a bound fitness function must neutralise the signal it isolates, or it cannot go
  red") and **m16/R1** ("enumerate the whole corpus, not a sample"). All three are honoured by
  ADR-005: the eval runs over the live corpus, owes a red probe, and counts story retrospectives.
- The PO recall for the milestone domain (`--item 148`) came back empty.

## Measured facts this document reasons from

Measured 2026-10-04 on `678c3a52` (`main`). Graph: `aof graph build .`, built
`2026-10-04T15:28:59Z`, code only, no egress, 18,263 nodes.

| Fact | Where |
|---|---|
| The live index (`graphify`, version 1) holds 2,871 records: 489 lesson, 596 adr, 1,327 capability, 443 gap, 16 summary | `aof work memory status --json`; tally of `.aof/aof.memory.graphify.index.json` |
| Lesson `Kind` has 36 spellings: 153 near-miss, 100 mistake, **91 blank**, 41 misunderstanding, 39 blocker, then `process` 16, `defect` 8, `blind spot` 5 and 25 more | same tally |
| `Stage` has 59 spellings, `Area` 69 and `Owner` 88. The same 91 lessons are blank in all four | same tally |
| **90 of the 91 blank lessons never state a kind**: they are prose-shaped retrospectives with no meta line at all (archived 25, 38, 46, 48, 53, 54, 57, 58, 66, 70). One states it in a shape the parser misses | per-section read of each source |
| Gap `status` has 11 spellings: 409 `open`, 19 `discharged`, 14 discharged with a date or cause written into the field, 1 `open by decision` | same tally |
| 165 `RETROSPECTIVE.md` hold 775 `R<n>` lessons; **284 of them sit in a story folder and none is indexed** | walk of `wiki/work` |
| Across all 775, **140 lessons write a Kind no normaliser can reach**: `process` 40, `defect` and its variants 43, `blind spot` 15, and 23 that record what worked (`confirmed approach`, `insight`, `confirmation`) | same walk |
| After a starts-with normaliser, **26 lessons in live items would fail the hold** (in 134, 134's stories, 135's stories, 136, 144, 145 and 146), and 95 archived files hold one or more | same walk |
| The parser reads the meta line inline, first value wins, and sets `status: ""` on a lesson | `packages/knowledge/src/memory/local-indexing.mjs:148-193` |
| A gap's status is the text after `**Status:**`, default `open` | `packages/knowledge/src/memory/local-indexing.mjs:348-363` |
| The RETROSPECTIVE read is milestone-only; the OUTCOME read is any item, path-driven | `packages/knowledge/src/memory/local-indexing.mjs:669-677` |
| Both index versions are 1, and nothing reads `version` back | `local-indexing.mjs:51`; `graphify-backend.mjs:58` |
| The frozen field set and the base ranking both backends share | `packages/knowledge/src/memory/local-retrieval.mjs:33-47`, `:233` |
| `brief` is already composed at the seam over `recall` | `packages/knowledge/src/memory.mjs:467-476` |
| The block line is five ` · ` fields, and a suite pins exactly five | `packages/knowledge/src/memory.mjs:283-291`; `packages/knowledge/test/memory-recall-block.suite.mjs:254` |
| `aof work tune` reads every item's retrospective through the same `parseRetrospective` | `packages/work/src/tune/corpus.mjs:74-80` |
| The additive validate checks live in the command leaf; the core validator is left alone | `packages/work/src/commands/validate.mjs:31-36` |
| One live-row predicate: numbered and not archived | `packages/work/src/discovery.mjs:123` |
| `knowledge` imports `@aof/work`; `work` imports nothing from `knowledge` | `packages/knowledge/package.json:39`; grep |
| The prompt prescribes Kind, Area and Stage enums and Owner as "the role/lane" | `packages/core/assets/commands/retrospective.md:53-54` |
| The OUTCOME template names gap status `open \| discharged` | `packages/core/assets/templates/shared/OUTCOME.md:35` |
| Both pairs the origin names rank first today: "content addressed hash cross platform" gives 01/R2, and "fitness function asserts a symbol appears in a file" gives 01/R1 | `aof work memory recall … --block` |

## ADR-001: The memory vocabulary has one home, in `@aof/work`

**Status:** Accepted
**Date:** 2026-10-04

**Context.** Three readers need the same answer to "what is a lesson's meta line, and which values
are legal": the parser (`knowledge`), the validate rule (`work`) and `memory status` (`knowledge`).
`aof work tune` reaches the parser too. `knowledge` depends on `work` and never the reverse, so a
vocabulary in `knowledge` cannot be read by validate. A copy in each package is the drift this
milestone exists to stop. Today, the vocabulary's only home is a prompt's prose.

**Decision.** One module, `packages/work/src/memory-vocabulary.mjs`, exported as
`@aof/work/memory-vocabulary`. It imports only `declared-id.mjs`. It holds:

1. the enums: `LESSON_KINDS` (mistake, blocker, near-miss, misunderstanding), `LESSON_AREAS` (code,
   architecture, contract, security, process), `LESSON_STAGES` (refine, build, verify) and
   `GAP_STATUSES` (open, discharged, open-by-decision);
2. the `R<n>` section reader, built from `declared-id`'s heading grammar, and the meta-line reader
   (`**Kind:** … · **Area:** … · **Stage:** … · **Owner:** … · **Raised by:** …`, one or more
   lines, first value wins), lifted out of `parseRetrospective` rather than copied;
3. the normalisers of ADR-002.

`parseRetrospective` and the gap parser call it, and so do validate, doctor and `status`. The
retrospective prompt's vocabulary line and the OUTCOME template's status comment name exactly these
enums, and FF-14802 holds both the single home and the parity.

**Alternatives considered.**
- In `knowledge` — validate cannot import it.
- A copy per package with a parity test — two homes and a test that agrees with itself.

**Consequences.** A new value is one edit in one module, which the prompt must then match.

**Invariant.** The meta-label grammar and the vocabulary are spelled in one module, and the prompt
and template that prescribe them agree with it (FF-14802).

## ADR-002: Normalisation happens on read, by one rule, and never guesses

**Status:** Accepted
**Date:** 2026-10-04

**Context.** About 50 lessons write an enum value plus a qualifier (`near-miss (recurring)`,
`build (caught at review)`, `process (calibration)`). The scope filter is a substring match, so
those match today only by accident, and nothing can count them. Gap status carries its date and
cause in the field. Archived sources are never rewritten (SPEC; origin §7).

**Decision.**
1. **Enum match.** Case-insensitive. A value conforms when it starts with an enum token followed by
   the end or by a character that is not a letter, digit or hyphen. So `near-miss (recurring)`
   becomes near-miss, while `mistakes` and `near-missing` do not match. Tokens are tried
   longest-first, and a space matches a hyphen within a token: `open by decision` becomes
   open-by-decision and never open with a tag.
2. **The remainder becomes a tag.** Surrounding whitespace is trimmed; when the whole remainder is
   one parenthesised group, the parentheses are dropped; markdown emphasis (`**`, backticks) is
   stripped; an empty remainder yields no tag. `build→verify` becomes build with tag `→verify`.
   Nothing else is rewritten.
3. **A non-enum value is kept as written** (trimmed), so it is counted and stays findable by
   `--kind blind`. It is never blanked and never mapped onto an enum: the operator ruled out a
   synonym table (148/02 Q1, 2026-10-04). A blank stays `""`, counted and never guessed.
4. **Owner is not normalised.** The prompt prescribes "the role/lane", not an enum.
5. **Gap status** takes the same rule over `GAP_STATUSES`. The default when no Status line exists
   stays `open`.
6. **Only `kind`, `area`, `stage`, `status` and `tags` change.** `title`, `summary` and `text` are
   byte-identical, so ranking is untouched and FF-14801 is the witness.

**Alternatives considered.**
- Rewrite the sources — archived sources are never back-filled.
- Normalise at the seam on recall — every reader would then see raw values, `tune` included.

**Consequences.** `--kind near-miss` and `--status discharged` become exact in practice. The
qualifier survives as data.

## ADR-003: `tags` is a new MemoryRecord field, under an index-version bump

**Status:** Accepted
**Date:** 2026-10-04

**Context.** The SPEC leaves to this document whether `tags` is a new field or rides a frozen one,
with m39/ADR-001 as the precedent for reuse.

**Decision.** `tags` joins `MEMORY_RECORD_FIELDS` as an **array of strings**, present on every
record as `[]` when there is none (m05/ADR-005's present-never-omitted rule, with the type's empty
value). Its order is the order of the fields it came from: kind, area, stage, or the gap's status.
Duplicates are dropped. `INDEX_VERSION` and `GRAPHIFY_INDEX_VERSION` both move from 1 to 2. No
migration: the index is derived, and an ingest rebuilds it. A reader of a version-1 store treats a
missing `tags` as `[]`. Each backend's `status` reports `index: { version, current, stale }` and,
when stale, names `aof work memory ingest`. The block is nested, so `status` gains no top-level
number: a suite sums every top-level number against `recordCount`.

The `--block` line of an **untagged** record is byte-identical to today's. A tagged record inserts
one field, `[t1; t2]`, between the title and the source, so the source stays the last field.

**Alternatives considered.**
- Ride `status` (the m39/ADR-001 route) — `status` is a gap's lifecycle, and a lesson may need it
  later (origin §4.3).
- Fold the tags into `text` — they would score, and ranking would move.
- A comma-joined string — the next consumer would have to split it again.

**Consequences.** Every fixture that asserts the full field set gains `tags` (tests are code). The
two field-set fitness functions that iterate `MEMORY_RECORD_FIELDS` cover the new field with no
edit.

## ADR-004: `status` is composed at the seam, and the layer map is the one partition

**Status:** Accepted
**Date:** 2026-10-04

**Context.** Each backend writes its own `status` split, and they disagree (m40/R3 is live).
Conformance needs the records, not counts, and the origin asks that `status` name the layer each
type serves (§5).

**Decision.**
1. **`RECORD_TYPE_LAYERS`** lives beside `MEMORY_RECORD_FIELDS` in `local-retrieval.mjs`: semantic
   holds adr, capability, gap and summary; procedural holds lesson (origin §2.3, ruled by the operator
   at 148/05 Q1, 2026-10-04); episodic is empty
   until `episodic-memory-is-recallable` adds its types **to this map**. It is the one place record
   types are partitioned into layers.
2. **The seam composes `status`** the way it composes `brief`: the backend's own `status(ctx)` (its
   backend facts, unchanged), then one `recall("", {}, {limit: Infinity})`, and over those records
   it adds:
   - `types`: `{ <type>: { count, layer } }`, where a type missing from the map counts under layer
     `unmapped` and never vanishes;
   - `layers`: `{ episodic, semantic, procedural }` counts;
   - `conformance`: `kind`, `area` and `stage` as `{ blank, nonEnum }` over lessons, `owner` as
     `{ blank }`, and `gapStatus` as `{ nonEnum }`.

   The legacy `lessons` and `adrs` keys stay, as does the `index` staleness block each backend
   reports (ADR-003).
3. The text view gains a layers line and a conformance line. Backends are not edited for this.

**Alternatives considered.** Per-backend counting, which is the shape that fell behind once already.

**Invariant.** Every type the indexer emits has a layer, and on both backends the `types` counts sum
to `recordCount` (FF-14803).

## ADR-005: A fixed retrieval eval holds the base ranking over the live corpus

**Status:** Accepted
**Date:** 2026-10-04

**Context.** The milestones after this one add records to the ranked pool, and story 03 here adds
284 lessons. A ranking change must show as a red eval, not as a quieter recall (SPEC; origin §4.4).

**Decision.**
1. **20 or more pairs** `(query, scope, expected <item>/<id>)`. Each is drawn from a recorded recall
   (an ARCHITECTURE "Memory recall" section, or the 05 spike), and each cites where it came from.
   The two named in the origin are the first two.
2. **Live corpus, in memory.** Records are built by `buildRecords(null, ctx)` over the real
   `wiki/work`. No index is written, under an isolated `AOF_GLOBAL_HOME`.
3. **Base ranking.** The eval runs `rankRecords`, the ranking both backends share. The graph
   re-rank reads a git-ignored artifact, which a clean worktree does not have, so it is out of the
   eval's reach and the eval says so.
4. **The pass line is the block.** The expected record must be within the first `HOOK_LIMIT` (5)
   results, which is what an agent is shown. A miss names the pair, the query and the rank found.
   **A pair whose record no longer exists reds as "gone"**, never as a pass (m39/R4).
5. It is a fitness function (FF-14801), registered in `test/arch/memory/`, and it lands first.

**Alternatives considered.**
- A frozen corpus snapshot — it would never see the pool grow, which is the risk named.
- Rank 1 only — too brittle against legitimate near-ties.

**Consequences.** A story that grows the pool must keep the eval green, or show in its review why
a pair should move.

## ADR-006: Every item's retrospective is read, path-driven, as OUTCOME is

**Status:** Accepted
**Date:** 2026-10-04

**Context.** The RETROSPECTIVE read rides the milestone-only predicate. Story 80 moved the OUTCOME
read to any item because "which types are entitled is decided at authoring, not here". The same
holds for a retrospective, which the retrospective prompt writes for a story too.

**Decision.** `RETROSPECTIVE.md` joins the any-item, subtree-scoped leg
(`local-indexing.mjs:677`). ARCHITECTURE and AOF stay milestone-only. A story's lessons carry its
ref as `item` (`134/01`), so the block cites `(m134/01)` and `--item 134` reaches them. The walk
order is unchanged, so a story's lessons sit at the story's place among equal scores.

**Consequences.** About 284 lessons join the pool. The eval of ADR-005 is the guard on that.

## ADR-007: The hold is an error on a live item and a warning on an archived one

**Status:** Accepted
**Date:** 2026-10-04

**Context.** Nothing in validate or doctor reads a meta line. Archived retrospectives are never
back-filled. `validate` has no severity, and doctor's advisory lanes carry `warn`.

**Decision.**
1. **The rule.** For each `R<n>`, after ADR-002: Kind, Area and Stage are each an enum token, and
   Owner is not blank. A qualifier is legal: `near-miss (recurring)` conforms. A lesson with no meta
   line fails on all four.
2. **Live rows, in validate.** The check is composed in `packages/work/src/commands/validate.mjs`,
   where the additive checks live. The core validator is not edited. A finding names the file, the
   `R<n>`, the field, the value and the legal values. It applies to every live row's retrospective,
   whatever the row's type.
3. **Archived rows, in doctor.** A doctor lane reports one `lesson-meta-archived` warning per
   archived retrospective that holds a non-conforming lesson, naming the count and the ids. Its
   codes are a frozen array of the lane's own, which 124/FF-12402 already holds to be unable to gate.
4. **The live non-conformers are fixed in the story that lands the rule**, re-measured at its build.
   The written word is kept as the qualifier (`**Kind:** near-miss (process)`), so nothing an author
   wrote is lost. The retrospective prompt states the rule.

**Consequences.** A new retrospective cannot reach a green validate with a meta line no filter
reaches.

## ADR-008: The break-down

**Status:** Accepted
**Date:** 2026-10-04

**Decision.** Five stories, partitioned by write set along the graph's coupling.
`local-indexing.mjs` has one dependent (core's binding) and one dependency (`declared-id`), and
`local-retrieval.mjs` has 18 dependents, all of them tests or the two backends (`aof graph impact`):

| Story | Owns | Depends |
|---|---|---|
| 01 the ranking is held by an eval | the eval (tests only) | — |
| 02 a lesson's meta line is normalised on read | the vocabulary module, the parser, `tags`, the index version and its stale report | — |
| 03 story retrospectives are indexed | the RETROSPECTIVE leg of `buildRecords` | 01, 02 |
| 04 a live lesson's meta line is held | the validate check, the doctor lane, the live retrospectives, the prompt | 02 |
| 05 memory status reports conformance and layers | the layer map, the seam's `status`, the block line's tags | 02 |

Wave 1 is 01 and 02. Wave 2 is 03, 04 and 05, which share no file. 03 waits on 02 because both
write `local-indexing.mjs`, and on 01 because it is the first pool change the eval guards.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-14801 | **The base ranking keeps every eval pair in the block.** Over records built in memory from the live `wiki/work`, each of 20 or more cited `(query, scope, <item>/<id>)` pairs ranks its record within the first 5 of `rankRecords`. A pair whose record is gone reds as gone. | `test/arch/memory/acd-memory-retrieval-eval.test.mjs` — **pending** (lands 148/01) | ADR-005 |
| FF-14802 | **The memory vocabulary has one home.** In comment-stripped `packages/*/src/**`, the meta-label alternation (`Kind\|Area\|Stage\|Owner\|Raised by`) and the token `open-by-decision` appear only in `packages/work/src/memory-vocabulary.mjs`. The retrospective prompt's Kind, Area and Stage lists and the OUTCOME template's status comment name exactly its enums. | `test/arch/work/acd-memory-vocabulary-one-home.test.mjs` — **pending** (lands 148/02) | ADR-001 |
| FF-14803 | **Every record type has a layer, and status accounts for every record.** Over a fixture stream that exercises every parser, each emitted `recordType` is a key of `RECORD_TYPE_LAYERS`, and on both backends the composed `status.types` counts sum to `recordCount`. | `test/arch/memory/acd-memory-layer-map-total.test.mjs` — **pending** (lands 148/05) | ADR-004 |
