# 127 · Backlog and archive — the work tree holds what is live — Outcome

## Delivered

### The work tree has three roots and one rule for each
`<work.dir>/` holds the live items, `<work.dir>/backlog/[<group>/…]/<type>_<slug>/` holds
un-numbered drivers, `<work.dir>/archive/<NN_type_slug>/` holds accepted ones name verbatim — one
enumerator walks all three (m127/01/`Three roots, one enumerator`), one verb mints a number on the
way in (m127/02/`One mint`), one verb moves a folder on the way out (m127/03/`The verb`), and this
repository lives that way (m127/05).

### Identity is the ref, never the location
A citation by number (`52`, `m52/ADR-003`, `depends: [121]`) resolves wherever the folder sits;
`find`, `doc`, `validate`, `doctor`, `depends` and `memory ingest` see the archive as part of the
stream, and `next`, `loop`, the default `list` / `recent` and the board's default fetch see only
the live root, each with an `--all` / `includeArchived` door. No verb in this milestone changes a
number an item already has.

### The order of the stream is the order of work
An idea is born un-numbered and gets its number at `aof work promote` — at the tail, or at `--at P`
through the one reindex engine — so the stream's numbers are minted in the order the operator
schedules; the `insert-*` family is that verb under its old names.

### Every node sees the same shapes
A remote node's cache-first `find` / `list` / `next` answer for a backlog slug or an archived ref
as the owning node does (schema 9, m127/04); the board paints the backlog as rows and hides the
archive behind one toggle with one mark; the fleet never offers to assign an un-numbered item.

### The history the public root cannot carry is recorded
`.aof/rename-ledger.tsv` holds the 1,128 renames the public-root cut removed, derived once with
the cited-path resolver's own argv; every resolver edge reads it after git's own records, so an
archived document's citation of a moved module still resolves on a fresh clone.

## Assumptions

- **`work.intake` is a write-side default** — an existing project with no key is unchanged
  (`"stream"`); the read side is mode-less and reads `backlog/` and `archive/` whenever they exist.
- **archiving is explicit** — `done` never moves a folder; the operator archives after the accept
  (127/ADR-004), and this milestone's own folder stays at the root until then.
- **the ledger is derived, never edited** — a rename recorded after the cut is git's; the ledger
  is the pre-cut history and gains no entry by hand.

## Gaps

### A fixture path in a delivered feature is a citation to the sweep
- **Status:** open
- **Discharge condition:** the refine convention spells fixture paths under a non-`src/` root, and
  FF-11903's reasoned ceiling row falls as 130's two modules land (127/VERIFICATION `F-17`).
Twelve live tokens sit above the 47 the control was pinned at; every one is in an immutable
contract or a pending build, and the row names them.

### The refine brief's architecture slice
- **Status:** open
- **Discharge condition:** `src/phase-brief.mjs` reads `### Decision` sections and prices the
  section below a bounded condenser with the notice's growth included (127/VERIFICATION `F-22`).
The three milestones' documents were condensed to fit today's packer; the packer's slack defect and
its `**Decision.**`-only grammar are the architect's.
