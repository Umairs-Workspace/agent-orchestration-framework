# Memory

> **The question this document answers:** *Where do a milestone's hard-won lessons go, and how does
> the next milestone recall them — so ACD agents improve over time instead of relearning the same
> mistakes?*

Every milestone distils its difficulties and bad decisions into a [`RETROSPECTIVE.md`](documents.md)
and its rationale into [`ARCHITECTURE.md` ADRs](documents.md). Without memory those lessons are
**siloed** in the folder that produced them: an architect about to repeat a "requiring-grep" mistake,
or a developer about to forget to pin line endings, has no way to be told *"we already learned this."*

**Memory** is the seam that carries those lessons forward. It is a **CLI surface** — `aof work memory
…` — that agents and commands call to **recall** relevant prior records at a decision point, to
**record** what they did with them, and to **ingest** new records after work lands. It was first
delivered by milestone [`05_work-memory`](work/archive/05_milestone_work-memory/SPEC.md) and has been
extended since by three milestones this page compiles:

| Milestone | What it added |
|---|---|
| [148 · memory corpus holds its vocabulary](work/148_milestone_memory-corpus-holds-its-vocabulary/SPEC.md) | the shared lesson vocabulary, record tags, the layer map and `status` composition |
| [153 · memory closes the loop](work/153_milestone_memory-closes-the-loop/SPEC.md) | recall observations, recurrence, promotion metadata, effectiveness accounting, tune patches and the workflow hooks |
| [157 · episodic memory is recallable](work/157_milestone_episodic-memory-is-recallable/SPEC.md) | findings, raw feedback and runs as records, JSON source locators, `--all` recall, the retry and triage edges |

## Sources and authority

The single rule the whole subsystem rests on:

> **Work records stay authoritative. The memory index is derived and rebuildable — never an
> authoritative second copy.**

This preserves ACD's single-source-of-truth principle ([philosophy.md → principle 4](philosophy.md)) and is
[05/ADR-001](work/archive/05_milestone_work-memory/ARCHITECTURE.md)'s ruling.
Every record is parsed out of a file the work stream already owns, and a fresh `ingest` reconstructs the
index exactly: nothing accretes, nothing is written back to a source, and **every record carries a
`source` locator that resolves to live text**. Without this, memory would become the very drift vector
ACD exists to defend against — a summary that silently diverges from what it summarises.

**Wiki pages are not indexed.** This page and its siblings compile records that are already indexed;
indexing them as well would be a second copy of the same lessons (see
[161's scope](work/161_milestone_the-memory-wiki-stays-true/SPEC.md)).

## The seam: `aof work memory <verb>`

The seam is **backend-agnostic by contract**. Agents call a small verb set through one unchanging
interface; *which backend answers* is a config choice they never see.

| Verb | What it does |
|---|---|
| `recall <query>` | Surface prior records matching a query — scope-filtered, ranked, five by default. |
| `record-recall <ref> --input <file>` | Append a **completed recall observation** to the item's existing `FEEDBACK.ndjson` ledger. Not a backend verb: it works identically with memory off. |
| `recurrence <lesson text> [--exclude <item>/R<n>]` | Does a new lesson repeat an earlier one? A calibrated match over every indexed lesson. |
| `ingest [ref]` | (Re)build the derived index from the work stream. `--all` = whole stream; `--item NN` or a ref = one item's subtree. Alias of `reindex`. |
| `reindex [ref]` | The same rebuild, under its backend name. |
| `status [--lessons]` | The active backend, record count, per-type and per-layer counts, vocabulary conformance, observed effectiveness (per lesson with `--lessons`) and whether the index is stale. |

Scope flags are first-class filters: `--area --stage --kind --owner --item --status`, plus `--limit N`,
`--all`, `--block` (the compact injection block a workflow pastes into agent context) and `--json` (the
structured `records` array; the default is a rendered text view). The backend interface itself is
frozen at four methods — `{ name, recall, reindex, status }` — so `ingest`, `recurrence` and
`record-recall` are seam-side compositions that a richer backend never has to implement. The former
`brief` verb was retired (153/ADR-001); it is refused as an unknown verb.

The seam lives in [packages/knowledge/src/memory.mjs](../packages/knowledge/src/memory.mjs); the routed
command is [packages/knowledge/src/commands/memory.mjs](../packages/knowledge/src/commands/memory.mjs).

## Three layers

Every record type belongs to exactly one memory layer. The one partition is
`RECORD_TYPE_LAYERS` in [packages/knowledge/src/memory/local-retrieval.mjs](../packages/knowledge/src/memory/local-retrieval.mjs)
([148/ADR-004](work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md),
[157/ADR-003](work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md)):

| Layer | Holds | Answers |
|---|---|---|
| **Procedural** | lessons | *What should we do differently?* |
| **Semantic** | ADRs, capabilities, gaps, summaries | *What is true, decided or delivered?* |
| **Episodic** | findings, raw feedback, runs | *What actually happened on this item?* |

`status` reports the count in each layer, and the per-type counts always sum to the record count.

## Where memory is stored

| Layer | Location | Notes |
|---|---|---|
| **Source of truth** | the work stream's `RETROSPECTIVE.md`, `ARCHITECTURE.md`, `OUTCOME.md`, `VERIFICATION.md`, `FEEDBACK.ndjson` and run records | Memory never owns these — it only reads them. |
| **Derived index** (`local`) | `.aof/aof.memory.index.json` | One JSON file, **git-ignored**, rebuilt wholesale by `ingest`. Disposable. |
| **Derived index** (`graphify`) | `.aof/aof.memory.graphify.index.json` | The same records in the graphify backend's own git-ignored store. |
| **`none` backend** | nothing | Stores nothing; every verb is a graceful no-op. |

The index paths are fixed ([packages/knowledge/src/memory/local-indexing.mjs](../packages/knowledge/src/memory/local-indexing.mjs))
and a rebuild idempotently git-ignores them — a committed index would be an authoritative second copy.
An index built before the current format is reported **stale** by `status` until `ingest` rebuilds it;
there is no migration.

## What goes into memory

The indexer walks every work item that is checked out locally — milestones, nested stories and backlog
items, live or archived — and emits one record per declaration. There are **eight record types**:

| Type | Layer | One record per | Read from |
|---|---|---|---|
| `lesson` | procedural | `## R<n>` heading | `RETROSPECTIVE.md` |
| `adr` | semantic | `## ADR-NNN` block | `ARCHITECTURE.md` |
| `capability` | semantic | `###` heading under `## Delivered` | `OUTCOME.md` |
| `gap` | semantic | `###` heading under `## Gaps` | `OUTCOME.md` |
| `summary` | semantic | `##` section of an imported digest | a co-located `AOF.md` |
| `finding` | episodic | declared finding id | the `Findings` register of `VERIFICATION.md` / `SESSION.md` |
| `feedback` | episodic | raw feedback entry | `FEEDBACK.ndjson` (`kind: raw` rows only) |
| `run` | episodic | terminal run | the run store (`done`, `failed`, `cancelled`) |

Every record is the frozen **`MemoryRecord`** shape: `recordType`, `id`, `item`, `itemSlug`, `title`,
`area`, `stage`, `kind`, `owner`, `status`, `tags`, `summary`, `text`, `source`. **A field that does
not apply to a type is present as `""` — never omitted and never guessed**, so retrieval filters
uniformly. A record's identity is `(item, recordType, id)`: ids such as `R1` and `ADR-002` recur in every
milestone, so a bare id identifies nothing.

**Source locators.** `source` stays one string. Markdown is `<path>:<line>`; a JSON document is
`<path>#<pointer>` (an empty pointer is the root, so a run ends `.json#`); NDJSON is
`<path>:<line>#<pointer>` into that line's JSON value, so a raw feedback entry ends `.ndjson:3#`
([157/ADR-002](work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md)).

**Tags.** `tags` is an array of the qualifiers the source carried and the vocabulary did not absorb: a
lesson kind written `near-miss (recurring)` is kind `near-miss` tagged `recurring`; a lesson's `Recurs`
reference is the tag `recurs:<item>/R<n>`; a discharged gap carries its date. Tags render in a block line
as `[t1; t2]`, before the source.

**Canonical lesson metadata.** A lesson's meta line is held to one vocabulary, shared by the
retrospective prompt, `aof work validate` and `status` conformance
([packages/work/src/memory-vocabulary.mjs](../packages/work/src/memory-vocabulary.mjs),
[148/ADR-001](work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md)):

| Field | Values |
|---|---|
| **Kind** | `mistake` · `blocker` · `near-miss` · `misunderstanding` |
| **Area** | `code` · `architecture` · `contract` · `security` · `process` |
| **Stage** | `refine` · `build` · `verify` |
| **Owner** | the role or lane |
| **Promoted to** | `none` · `control:<id>` · `rule:<path>` · `prompt:<path>` — see [promotion](#recurrence-and-promotion) |
| **Recurs** | optional `<item>/R<n>` |

A value that starts with a vocabulary word *is* that word and the rest becomes a tag; a value that starts
with none is kept as written and counted as non-conforming, never silently mapped; a blank stays blank.
ADRs carry `area: architecture` and take `status` from their `**Status:**` line; a gap's `status` is
`open`, `discharged` or `open-by-decision`.

### Episodic provenance

The episodic records are compiled by [packages/knowledge/src/memory/episodic-indexing.mjs](../packages/knowledge/src/memory/episodic-indexing.mjs)
from sources that already exist ([157/ADR-001](work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md)):

- **Findings** come only from declarations in a `Findings` register — a heading or a table row's first
  cell, with severity, disposition and evidence kept in the text. Prose citations of a finding create
  nothing; one id declared twice is one merged record.
- **Feedback** is the *raw* rows of `FEEDBACK.ndjson` only. Classification and recall rows never become
  feedback records, and `STATE.md`'s feedback bullets are a projection that is not indexed.
- **Runs** are terminal runs only — queued, running and parked runs are not evidence yet. A failed run's
  `failureReason` rides its summary. No transcript is opened.
- **Stalls** are folded into a run's text *when the snapshot has them*: matched on both session and the
  run's full item ref. A missing snapshot, a native runtime with no stall telemetry or a wrong
  attribution means the stall evidence is **unavailable**, never zero; only a matched agent with an empty
  stall list is a known zero.

## Optional source: your local Claude auto-memory

Off by default. An operator who keeps feedback and project notes in Claude Code's auto-memory folder
can let recall surface them beside the repository's lessons, so a reason or instruction already
recorded informs the next decision:

```jsonc
// .aof/aof.config.json
"memory": { "backend": "local", "corpora": ["work", "imports", "code", "operator"] }   // no "operator" ≡ off
```

`memory.corpora` names the corpora memory serves (milestone 180). `work`, `imports` and `code` are
always served, so a list that leaves one out is refused; `operator` is this source, and the one corpus
you may leave out. Absent `corpora` is the default set. The old spelling,
`"sources": ["claude-auto-memory"]`, is read for one release with a warning naming `memory.corpora`, and
`aof work update` rewrites it; spelling both is refused.

- **What is read.** The selected project's folder, `<claude home>/projects/<project slug>/memory/*.md`,
  where the claude home is `CLAUDE_CONFIG_DIR` when set, else `~/.claude`, and the project is the
  workspace root (never the shell's current directory). No other project's folder, user or worker is
  consulted. An absent folder is the ordinary case on a node that does not hold the notes — the work
  records index exactly as before.
- **Which entries.** Only a file whose frontmatter has a **nested** `metadata.type` of `feedback` or
  `project` becomes a record. `user` and `reference` entries, a top-level `type` alone, `MEMORY.md` (the
  index) and files without frontmatter are skipped. Plain, `'single'`- and `"double"`-quoted scalars,
  LF or CRLF and a leading BOM are read; this is a small reader for the measured format, not a YAML
  parser.
- **What each entry becomes.** One `lesson` (so it counts in the *procedural* layer — no new record
  type, layer or index version): `owner` `operator`, `item`/`itemSlug` `operator:claude-auto-memory`,
  `id` the file name, `title` the entry's `name` (else the file name), `summary` its `description`
  (else the first body line), and the whole body — the **Why:** and **How to apply:** — in the searchable
  `text`. `source` is the entry's absolute path followed by `:1`.
- **Fixed kind mapping.** Both types are indexed as `near-miss`, with the source type kept as a tag
  (`feedback` or `project`). This is an adapter policy, not a claim that a note describes a historical
  near-miss; `area`, `stage` and `status` stay empty, and `memory status` reports them as blank
  honestly. Prose and unrelated metadata in the entry never change the kind or the owner.
- **Read-only and separate.** The folder stays the source of truth: nothing is written to it, nothing
  is copied into the work stream, and an operator lesson is **not** deduplicated against the repository
  record that says the same thing — both appear in recall, each citing its own source. Recall it with
  `--owner operator`; `--item NN` still returns only that work item's records.
- **When it takes effect.** Records are composed on a **whole-stream** ingest (`aof work memory ingest
  --all`). A scoped ingest (`--item NN`) builds that work item's records only. Each full ingest rebuilds:
  deleted entries disappear, edits replace the old text, and taking `operator` out of `corpora` (or removing
  `corpora`) and ingesting again removes every operator record. Selecting the source does not enable a backend —
  with `backend: "none"` nothing is indexed. Both `local` and `graphify` honour it; the graph build only
  ever sees the work stream, never these notes.
- **Node-local.** The entries exist on the node that holds the Claude home. Knowledge a worker or another
  machine must have has to be promoted into the repository (a retrospective lesson or an ADR); the index
  is derived and ignored, so it never travels.
- **Bad input is visible, not fatal.** An entry that cannot be read (an unterminated frontmatter block, a
  duplicate or non-string `metadata.type`, an unterminated quote, a blank entry, a permission failure) is
  skipped with a diagnostic naming the file and the failure category — never its contents — and its
  valid siblings still index. An unreadable folder is reported the same way and the work records remain.
  An invalid `corpora` value (not an array, an unknown corpus, a duplicate, a missing `work`, `imports`
  or `code`) is a configuration error that stops the verb, named at the path you wrote.

Try it end to end in a scratch workspace: set `"corpora": ["work", "imports", "code", "operator"]`, run
`aof work memory ingest --all`, then `aof work memory recall "<a phrase from a note>" --owner operator`;
remove `corpora`, ingest again, and the operator lessons are gone.

## How `recall` ranks

The spike's headline finding was that *ranking, not parsing, is the hard part* — raw term repetition in
a long ADR must not bury a short, on-point lesson. So retrieval
([packages/knowledge/src/memory/local-retrieval.mjs](../packages/knowledge/src/memory/local-retrieval.mjs))
applies, in order:

1. **Scope pre-filter** — the `--area/--stage/--kind/--owner/--item/--status` flags are intersected (AND)
   and applied as a *hard* filter before any scoring. Off-scope records never compete. `--item NN` is a
   **subtree** match: `39` reaches milestone 39 and every story under it, `39/02` that story alone.
2. **BM25-lite, length-normalised scoring** — so a dense short match beats a long term-heavy one.
3. **Title-match and record-type boosts** — a query-term hit in the title lifts a record; at equal
   relevance a `lesson` outranks an `adr` (a tiebreaker, never a relevance override).

**How many results.** Recall returns **five** records by default; `--limit N` changes that. `--all`
returns the **complete scoped result** and overrides the limit — it is how an item's whole delivery
history is gathered (`recall "" --item <ref> --area delivery --all`, and an empty query is permitted). A
workflow's `--block` output renders one compact line per record and an empty recall renders nothing at
all, so a hook injects nothing rather than a placeholder. Episodic lines include their summary, so a
failed run's reason is visible; source is always last.

**Memory off.** With backend `none`, `recall` returns empty, `ingest` reports zero records and `status`
reports backend `none`. `recurrence` answers "no candidates" and builds no index, while `record-recall`
and the ledger-based part of `status` still work, because they read work records rather than the index.

Ranking quality is held by a live-corpus eval whose query/reference pairs are fixed — a failing ranking is
fixed in the ranker, never by editing the expectations
([157/ADR-003](work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md)).

## The decision edges

Memory is **built into the workflow**, not only callable: six declared *decision-recall edges* recall at a
moment a decision is about to be made, keep that result, and afterwards record what the decision did with
it. Their authored sources are `shatter`, `refine`, `continue` and `verify` in
[packages/core/assets/commands](../packages/core/assets/commands/continue.md), rendered into each runtime;
the roster and each edge's protocol are enforced by
[test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs](../test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs)
([153/ADR-004](work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md),
[157/ADR-004](work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md)).

| Edge | Actor | Recall | Scope and condition |
|---|---|---|---|
| `shatter-po` | product owner | `recall "<query>" --block` | Unscoped, **once** before partition. The one observation is attached to the *first driver in PRD order*; other drivers cite that owner. An aborted shatter with no driver records nothing. |
| `refine-architect` | architect | `recall … --area architecture --block` | The architect's **architecture filter**. |
| `refine-po` | product owner | `recall … --block --item <ref>` | The PO's **item filter** — a different scope from the architect's, so the two edges never share a row. |
| `continue-developer` | developer | `recall … --kind near-miss --block` | The existing near-miss recall, unchanged. |
| `continue-episodic` | developer | `ingest`, then `recall "" --item <ref> --area delivery --all --json` | **Retry only** — attempt 2 or later; attempt 1 has no episodic edge. No stage filter, so verify findings stay visible. The developer names the prior run (`retryOf`, else the latest terminal earlier attempt), its `failureReason` and every recalled finding in the build record before the first code change, and says the evidence is unavailable when memory is off. |
| `verify-finding` | verifier | `ingest`, then `recall "<finding text>" --kind finding --block` | **Stream-wide** — no item and no stage filter. Matches support triage and are **never closed automatically**: cause and evidence are compared, the finding's own identity is excluded, and a bare `F` id is not a duplicate by id alone. |

Two things are **not** decision edges. A retrospective's *recurrence match* is a matching operation, and
its *evidence gathering* is a recall that records no observation (both below).

## Recall observations

A decision edge's record of what happened is a **recall observation** on the item's existing
`FEEDBACK.ndjson` ledger ([packages/work/src/feedback-records.mjs](../packages/work/src/feedback-records.mjs),
[153/ADR-001](work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md)) — the same append-only file raw
feedback uses, as a third row kind `recall`, so there is no second store.

- The agent **keeps the exact result of its one real recall** — the query, the scope and every returned
  record's `item`, `id` and `recordType` — and never re-runs retrieval to rebuild it. When the decision is
  made it assigns each returned record an **explicit verdict**: `honoured`, `departed` or `irrelevant`. No
  default verdict exists.
- It submits the completed observation once: `aof work memory record-recall <ref> --input <file>`, with a
  caller-minted **UUID** per recall, the instant `at`, the `edge` name and the `actor`.
- An **empty result is still submitted** (`"records": []`); no verdict and no extra retrieval is invented.
- **Replay is safe.** The same UUID with identical content is a no-op (concurrent submissions leave one
  row); changed content under that UUID is refused before anything is written. An interrupted decision has
  no completed observation, so there is no provisional row.
- The row is **evidence of a decision, not raw feedback**: it carries no text, projects no `STATE.md`
  bullet and never enters a raw-feedback count.

## Recurrence and promotion

**Recurrence** asks whether a new lesson is an old one again. Before a retrospective writes each new
lesson it runs `aof work memory recurrence "<what happened and lesson>" --exclude <new id> --json`
([packages/knowledge/src/memory/recurrence.mjs](../packages/knowledge/src/memory/recurrence.mjs),
[153/ADR-002](work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md)). It scores **every indexed
lesson across kinds** with a frozen-weight text-similarity measure, separate from retrieval ranking, and
reports the top three candidates and the best one whose score is strictly above a threshold chosen from
labelled pairs (null when none is). A qualifying match becomes `**Recurs:** <item>/R<n>` on the *new*
lesson; the new incident keeps its own evidence and the earlier lesson is never rewritten. A match is never
inferred from metadata alone and an ADR is never a candidate.

**Promotion** records what *prevention exists* for a lesson. Every new lesson carries
`**Promoted to:**` — `none`, `control:<qualified-id>`, `rule:<repo-path>` or `prompt:<repo-path>` — naming
only a prevention that already exists, never a planned one. The value is kept verbatim in the lesson's
`status`. A **forward watermark** keeps history untouched: before appending the first new lesson to a
retrospective, the author writes `promotionFrom: <next R number>` in its frontmatter, and the vocabulary
hold requires a promotion on every lesson at or above it. Lessons below the watermark stay legacy and
unchanged.

**`aof work tune`** joins recurrence and verdict counts onto its lesson evidence. For a recurring lesson
with exactly one prompt target it may compute a deterministic, reviewable **patch** — the exact current
bytes plus a delimited lesson block. The patch is advisory: tune writes nothing, there is no automatic
applier, and a person must **apply** it. Targets under generated runtime folders are refused in favour of
the authored source
([packages/work/src/tune/proposal.mjs](../packages/work/src/tune/proposal.mjs),
[153/ADR-005](work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md)).

## Accounting

`aof work memory status` composes its report at the seam, so every backend reports the same numbers
([148/ADR-004](work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md),
[153/ADR-003](work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md)):

- **types** and **layers** — counts per record type and per memory layer;
- **conformance** — how many lessons have a blank or non-enum kind, area or stage, a blank owner, and how
  many gaps have a non-enum status;
- **effectiveness** — per type, and per lesson with `--lessons`: how often it was `surfaced`, and how
  often it was `honoured`, `departed` or judged `irrelevant`, plus `recurred` — the distinct new lessons
  that name it in `Recurs`. These are *observed decisions and repeats*, not proof a lesson prevented
  anything. They are read from the ledgers and retrospectives rather than the index, so they survive a
  lesson leaving the index (marked `provenance unresolved`) and work with memory off.

`aof work doctor` adds two **advisory** warnings from the same facts
([packages/work/src/doctor/memory-effectiveness.mjs](../packages/work/src/doctor/memory-effectiveness.mjs)):
a lesson that has **recurred**, and a lesson still **unpromoted** (no field, or `none`) after five later
accepted top-level milestones (configurable as `work.doctor.memory.unpromotedAfterMilestones`). Neither
gates acceptance, and a lesson whose age cannot be established is reported as unknown rather than guessed.

## Retrospective evidence

A retrospective gathers its evidence through memory, in a fixed order
([packages/core/assets/commands/retrospective.md](../packages/core/assets/commands/retrospective.md)):

1. `aof work observe` refreshes observability.
2. `aof work memory ingest`, then **one** `recall "" --item <ref> --area delivery --all --json` — the
   item's findings, raw feedback and terminal runs with their stalls. Cited sources may be opened to
   substantiate a record, but raw files are never enumerated as the evidence path; when memory is off the
   evidence is reported **unavailable**. This step records no recall observation, and `STATE.md`'s
   feedback notes are not counted a second time.
3. The **recurrence** match and the **promotion** fields for each new lesson, as above.
4. `aof work memory ingest` once more, only after those fields are authored, so the index carries them.

## Backend selection

One config key, read in exactly one place, picks the backend:

```jsonc
// .aof/aof.config.json
"memory": { "backend": "local" }   // "none" | "local" | "graphify"; absent ≡ "none"
```

- **`none`** — a total no-op. ACD runs unchanged when memory is absent; recall returns empty, ingest
  reports zero.
- **`local`** — the zero-dependency backend: the records above in `.aof/aof.memory.index.json`.
- **`graphify`** — the same records, from the same parsers, plus a work-stream graph built through the
  `graph:build` command as a **re-rank signal only** (the graph is never the record source). It keeps its
  own index and degrades to the base ranking when graphify is absent. `memory.backends.graphify.extractionBackend`
  names the extractor (`claude-cli` when unset, `claude`, `gemini`, `openai`, `kimi`, `deepseek` or the
  offline `ollama`). Each engine's settings sit in its own `memory.backends.<name>` block, validated
  whether or not that engine is selected; the old `memory.graphify` spelling reads for one release, and `aof work update` rewrites it.

The codebase graph's sharing lives in the same node: `memory.graph.share` (`git-refs` or `off`) and
`memory.graph.remote` (default `origin`), replacing the root `graph` key (milestone 180). It governs the
code corpus only — the memory work graph and the memory index are never shared. No key configures
egress: `aof memory status` reports the work corpus's, and `aof graph build` the code corpus's.

An unknown backend name is refused by name, with the registered choices listed. **This page
does not say which backend, or how many records, a given repository has — both change.** Ask it:

```
aof work memory status --json
```

which reports the active backend and the current counts by type and layer, and names a stale index and the
`ingest` that rebuilds it. `aof work memory ingest --all` rebuilds the whole stream.

## Next

- The documents memory reads from (`RETROSPECTIVE.md`, `ARCHITECTURE.md`) → [documents.md](documents.md)
- Why single-source-of-truth / derived-not-duplicated matters → [philosophy.md](philosophy.md)
- The agents that recall at each edge → [agents.md](agents.md)
- The milestone that delivered the seam → [work/05_milestone_work-memory/](work/archive/05_milestone_work-memory/SPEC.md)
