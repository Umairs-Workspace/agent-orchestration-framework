# Memory

> **The question this document answers:** *Where do a milestone's hard-won lessons go, and how does
> the next milestone recall them — so ACD agents improve over time instead of relearning the same
> mistakes?*

Every milestone distils its difficulties and bad decisions into a [`RETROSPECTIVE.md`](documents.md)
and its rationale into [`ARCHITECTURE.md` ADRs](documents.md). Without memory those lessons are
**siloed** in the folder that produced them: an architect about to repeat a "requiring-grep" mistake,
or a developer about to forget to pin line endings, has no way to be told *"we already learned this."*

**Memory** is the seam that carries those lessons forward. It is a **CLI surface** — `aof work memory
…` — that any ACD agent or command can call to **recall** relevant prior lessons at a decision point,
and to **ingest** new ones at Accept. It was delivered by milestone
[`05_work-memory`](work/archive/05_milestone_work-memory/SPEC.md).

## The load-bearing constraint: memory is a *derived index*

The single rule the whole subsystem rests on:

> **Memory is a derived index, rebuildable from the work-stream `.md` files — never an authoritative
> second copy.**

This preserves ACD's single-source-of-truth principle ([philosophy.md → principle 4](philosophy.md)).
The source of truth is always the `RETROSPECTIVE.md` / `ARCHITECTURE.md` files themselves; the index is
disposable. A fresh rebuild reconstructs it exactly, nothing accretes, and **every record traces back
to live source text** (`path:line`). Without this, memory would become the very drift vector ACD exists
to defend against — a summary that silently diverges from the docs it summarises.

## The seam: `aof work memory <verb>`

The seam is **backend-agnostic by contract**. Agents call five verbs through one unchanging interface;
*which backend answers* is a config choice they never see.

| Verb | What it does |
|---|---|
| `recall <query>` | Surface prior lessons/ADRs matching a query, scope-filtered and ranked — "we already learned this" at the moment it would help. |
| `brief` | A situational digest: the lesson/ADR split + lessons-by-area (composed over `recall`). |
| `reindex [ref]` | Rebuild the derived index from the work-stream `.md` files. `--all` = whole stream; `--item NN` / a milestone ref = one milestone. |
| `ingest [ref]` | Alias of `reindex` — the verb agents call at Accept to fold a just-written lesson in. |
| `status` | Report the active backend, record count, store location, and lesson/ADR split. |

Scope flags are first-class filters: `--area --stage --kind --owner --item`, plus `--limit N` and
`--json` (the structured `records` array; the default is a rendered text view). The interface itself is
frozen at exactly **four methods** — `{ name, recall, reindex, status }`; `brief` and `ingest` are
seam-side conveniences, not new methods, so a richer backend never has to implement them.

The seam lives in [src/work-memory.mjs](../src/work-memory.mjs) and dispatches via `aof work memory` in
[src/cli.mjs](../src/cli.mjs).

## Where memory is stored

| Layer | Location | Notes |
|---|---|---|
| **Source of truth** | `wiki/work/NN_milestone_*/RETROSPECTIVE.md` and `…/ARCHITECTURE.md` | The `.md` files. Memory never owns this — it only reads it. |
| **Derived index** (local backend) | `.aof/aof.memory.index.json` (project root) | A single JSON file, **git-ignored**, rebuilt wholesale by `reindex`. The only artifact the local backend persists, and it is disposable. |
| **`none` backend** | nothing | Stores nothing; every verb is a graceful no-op. |

The index path is fixed ([src/memory/local-indexing.mjs](../src/memory/local-indexing.mjs)) and
`reindex` idempotently adds it to `.gitignore` — a committed index would be an authoritative second
copy, the invariant violation above. **In this repo today** the live `.aof/aof.config.json` selects no
backend, so `none` is active and no index file exists; the index is materialised on demand (e.g. by a
project that sets `memory.backend: "local"`, or by a temp-store reindex during verification).

## What goes into memory

The local backend parses **two source kinds** across every milestone folder, producing one record each:

- **`lesson`** — one per `## R<n>` heading in a milestone's `RETROSPECTIVE.md`. The meta line
  (`**Kind:** … · **Area:** … · **Stage:** … · **Owner:** …`) drives those fields; the heading drives
  `id` + `title`.
- **`adr`** — one per `## ADR-NNN` block in a milestone's `ARCHITECTURE.md`. `area` is always
  `"architecture"`; `status` comes from the block's `**Status:**` line.

Every record is the frozen **`MemoryRecord`** shape (ADR-005). Fields that don't apply to a record's
type are present as `""` (never omitted), so retrieval filters uniformly:

| Field | Meaning |
|---|---|
| `recordType` | `"lesson"` or `"adr"` |
| `id` | `R1`, `ADR-002`, … |
| `item` / `itemSlug` | the milestone number / slug the record came from |
| `title` | the de-emphasised heading prose |
| `area` / `stage` / `kind` / `owner` | scope fields (lesson meta line; `area="architecture"` for ADRs) |
| `status` | ADR status (lessons: `""`) |
| `summary` | the one-line gist — the short display line |
| `text` | the searchable blob (title + what/why/lesson, or context/decision/invariant) |
| `source` | `path:line` back to the live heading — the trace that proves the record is derived |

As of milestone 05's acceptance the live stream yields **38 records = 8 lessons + 30 ADRs**.

## Optional source: your local Claude auto-memory

Off by default. An operator who keeps feedback and project notes in Claude Code's auto-memory folder
can let recall surface them beside the repository's lessons, so a reason or instruction already
recorded informs the next decision:

```jsonc
// .aof/aof.config.json
"memory": { "backend": "local", "sources": ["claude-auto-memory"] }   // absent or [] ≡ off
```

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
  deleted entries disappear, edits replace the old text, and setting `sources` back to `[]` (or removing
  it) and ingesting again removes every operator record. Selecting the source does not enable a backend —
  with `backend: "none"` nothing is indexed. Both `local` and `graphify` honour it; the graph build only
  ever sees the work stream, never these notes.
- **Node-local.** The entries exist on the node that holds the Claude home. Knowledge a worker or another
  machine must have has to be promoted into the repository (a retrospective lesson or an ADR); the index
  is derived and ignored, so it never travels.
- **Bad input is visible, not fatal.** An entry that cannot be read (an unterminated frontmatter block, a
  duplicate or non-string `metadata.type`, an unterminated quote, a blank entry, a permission failure) is
  skipped with a diagnostic naming the file and the failure category — never its contents — and its
  valid siblings still index. An unreadable folder is reported the same way and the work records remain.
  An invalid `sources` value (not an array, an unknown name, a duplicate, a `null`) is a configuration
  error that stops the verb.

Try it end to end in a scratch workspace: set `"sources": ["claude-auto-memory"]`, run `aof work memory
ingest --all`, then `aof work memory recall "<a phrase from a note>" --owner operator`; set `"sources":
[]`, ingest again, and the operator lessons are gone.

## How `recall` ranks

The spike's headline finding was that *ranking, not parsing, is the hard part* — raw term repetition in
a long ADR must not bury a short, on-point lesson. So retrieval ([src/memory/local-retrieval.mjs](../src/memory/local-retrieval.mjs))
applies, in order:

1. **Scope pre-filter** — the `--area/--stage/--kind/--owner/--item` flags are intersected (AND) and
   applied as a *hard* filter before any scoring. Off-scope records never compete.
2. **BM25-lite, length-normalised scoring** — so a dense short match beats a long term-heavy one.
3. **Title-match + record-type boosts** — a query-term hit in the title lifts a record; at equal
   relevance a `lesson` outranks an `adr` (a tiebreaker, never a relevance override).

The proof it works: `recall "requiring grep fitness function smell"` ranks milestone-01's **R1 lesson
#1**, far above the ADRs — a lesson first written in milestone N reaches the decision-maker building
milestone N+1, which is the whole objective.

## Backend selection

One config key, read in exactly one place (ADR-002), picks the backend:

```jsonc
// .aof/aof.config.json
"memory": { "backend": "local" }   // or "none"; absent ≡ "none"
```

- **`none`** (default) — a total no-op. ACD runs unchanged when memory is absent; recall returns empty,
  reindex reports zero. Nothing to install, nothing to break.
- **`local`** — the zero-dependency backend described above. Ships in the box.
- **future: semantic (e.g. MemPalace)** — a vector/semantic backend plugs in behind the *same* four
  verbs, with no change to a single agent prompt. That substitutability is the reason the seam exists;
  the cheap local backend proves the seam earns its keep first.

An unknown backend name is rejected by the `$defs/memory` schema enum, not discovered at runtime.

## What is wired today — and what is not

Memory is **callable but not yet auto-invoked.** The verb surface, the local backend, and config
selection are done and verified (stories `00`–`02`); the **read/write hooks** that wire it into the
loop are [story `03_story_memory-hooks`](work/archive/05_milestone_work-memory/stories/03_story_memory-hooks/STORY.md)
— authored as acceptance criteria, not yet built:

- No bundled ACD agent or command prompt yet calls `aof work memory recall` / `ingest` on its own — not
  `refine`, not `continue`, not `verify`. An agent recalls only if a human runs the verb.
- So memory does not yet *automatically* surface a recall at a decision point or ingest a lesson at
  Accept. Threading the verbs into [the agent prompts and the workflow](agents.md) is the next step the
  seam was built to enable (see [05's spike findings](work/archive/05_milestone_work-memory/spike/FINDINGS.md)).

Until those hooks land, the value is realised by invoking the verbs directly — `aof work memory recall
"<the decision you're about to make>"` before committing to an approach.

## Next

- The documents memory reads from (`RETROSPECTIVE.md`, `ARCHITECTURE.md`) → [documents.md](documents.md)
- Why single-source-of-truth / derived-not-duplicated matters → [philosophy.md](philosophy.md)
- Who would call recall/ingest once the hooks land → [agents.md](agents.md)
- The milestone that delivered it → [work/05_milestone_work-memory/](work/archive/05_milestone_work-memory/SPEC.md)
