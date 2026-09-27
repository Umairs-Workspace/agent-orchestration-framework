# 02 · The record command — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. This is an ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `STORY.md` stays that.
-->

## Delivered

### `aof work loop-record <ref>` — the per-item execution record as a command

`work:loop-record` (`src/commands/loop-record.mjs`) resolves a work item, projects its execution model
from the run records and the loop registry, and emits the composed document. It is registered once in
the shared command core, resolves as `aof work loop-record <ref>` with no ladder, requires a ref, and
accepts exactly two inputs — `ref` and `write`.

### A read face that touches nothing

Run without `--write`, the command composes and returns the document's bytes and writes no file. The
loop registry is left byte-identical, an item with no run records is still answerable, and a zero-
coverage answer exits successfully rather than as an error.

### `--write` as the only door to disk

The record lands at `EXECUTION.md` inside the item's own folder, on a path derived from the item that
no caller can redirect — there is no output-path input to supply. Exactly one file is created or
modified per run, through one shared atomic `writeText`, and nothing under `.aof/` or at the work
directory's root is touched.

### Byte-identical regeneration

Running the command twice on unchanged inputs produces the same bytes, in one process, across two
fresh processes, and from a different working directory. The read face composes the same bytes the
writer writes, so a regeneration can be reviewed before it is taken, and a non-empty diff in a pull
request means an input moved rather than that somebody ran the command.

### A human signature that survives regeneration verbatim

The writer is a read-modify-write: it parses the existing document's sign-off table, carries every
signed row forward as its own line — the operator's spacing, date format and wording untouched — and
re-derives every other line. A signature survives even when the facts it signed have since changed. A
row counts as signed only when signer, date and verdict are all filled; an untouched `—` placeholder
never does. A document the parser cannot read is refused rather than regenerated, so a malformed
record loses no signature.

### The record is a face, never a second truth

`EXECUTION.md`'s basename is named in exactly two modules — this writer and 78/03's checker. The
document is read exactly once, and the only thing parsed out of it is the sign-off block. Every
consumer of an execution fact computes it through 78/00's projection from the run records; the
renderer is imported in one place and only ever written to. A record whose fact lines have been
rewritten to lies does not move the command's answer by one field, and a regeneration re-derives every
tampered line away.

### A board-deferred command, by recorded decision

`work:loop-record` is a member of the frozen `WORK_IDS` census and of the `BOARD_DEFERRED` carve-out,
no `/api/work/loop-record` route is served, and `ui/` gains no reference to it. It ships without an
ACD bundle command wrapper, and the CLI↔bundle parity control demands none — that control is scoped to
the `work:insert-*` family and names neither this command nor story 79's writer.

### The registry family is provably untouched

The module takes the EXECUTION family's name rather than `loops-record.mjs`, so it matches neither of
52/FF-5201's discovery patterns; FF-5201's expected six-module list is unchanged, and its read-only
sweep over that family is re-measured independently rather than re-run.

## Assumptions

- **The item's folder exists and is writable** — the record's home is `path.join(item.dir, "EXECUTION.md")`, derived from the resolved item, so a ref that resolves to no item is refused before anything is written.
- **The sign-off block is the one part of the document that comes back off disk** — every other line is re-derived, so an operator's edit outside that block is discarded by the next regeneration.
- **`displayPath` may be cwd-relative** — it feeds the human render and the malformed-record refusal message, never the composed document, so the committed bytes stay independent of where the command ran.

## Gaps

### The record's own freshness is not self-evident from the file

- **Status:** open
- **Discharge condition:** the document carries a machine-readable marker of the inputs it was derived
  from, or the operator's workflow regenerates it on a hook.

Nothing in the emitted document states which run records it was composed from, so a reader cannot tell
a current record from a stale one by reading it. 78/03's doctor lane answers that question from
outside the file, by projecting the item's runs and comparing; the file alone does not.

### The command answers for one item and cannot answer for a range

- **Status:** open
- **Discharge condition:** a caller needs a stream-wide execution record, and a face is added for it.

`ref` is required and singular. There is no way to regenerate every item's record in one invocation,
so keeping a stream of records current is a loop the operator writes rather than a flag the command
offers.
