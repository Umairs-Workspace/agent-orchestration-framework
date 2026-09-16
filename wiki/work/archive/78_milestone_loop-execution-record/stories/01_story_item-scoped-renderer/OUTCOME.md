# 01 · The item-scoped renderer — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. This is an ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `STORY.md` stays that.
-->

## Delivered

### The item-scoped execution graph

`renderExecutionGraph` (`src/loop-record-render.mjs`) draws a Mermaid `flowchart LR` of the loops one
item ENGAGED plus the authorities those loops cite — a 17-record registry whose item engaged 2 draws
2 loops and none of the other 15.

### A two-pass scope rule that cannot readmit the framework-wide picture

An authority is drawn because a scoped loop cited it; a registry-declared edge is drawn only when both
of its endpoints are already in the finished scope, so an edge to a loop the item never engaged adds
no node.

### The execution document

`renderExecutionDocument` returns Markdown wrapping a fenced `mermaid` block — frontmatter first and
the generated-file marker after it (the F-73-G order), then the coverage line, the per-engagement
facts, the graph, and one heading per non-empty gap class.

### Coverage stated on the page, always

The document carries how many runs were found, how many carried a loop declaration, and the
percentage, whether coverage is zero or complete; a zero-coverage document says "No loop ran for this
item." in words rather than rendering blank.

### Absence rendered as absence, not as a placeholder

A gap class with no members renders no heading, and an empty scope still renders `flowchart LR` — an
empty answer is distinguishable from a renderer that failed to run, and no "None" placeholder is
emitted.

### Four ceiling states legible in the rendered bytes

A capped engagement and a `none` / `unknown` / `uncapped` one render pairwise-different bytes, each
non-numeric state carrying its own remedy in words, and a numeric bound renders the observed cycles
against it — with `, over the bound` when exceeded and no claim that the bound was respected.

### In flight is not failure

An engagement with no terminal outcome renders as `in flight`; a settled one renders its outcome and,
when one is carried, its stop reason.

### One glyph table across all three faces

FF-7802 (`test/arch/acd-loop-record-renderer-additive.test.mjs`) holds the new renderer importing
`KIND_SHAPES` from `src/commands/loops-graph.mjs`, spelling no declared kind's glyph itself, and
declaring no second table — and holds `src/commands/loops-graph.mjs` byte-unmodified, asked of `git`
against `HEAD` rather than of a pinned digest a maintainer would re-stamp.

### A rendering with nothing in it that changes by itself

The document carries no generation timestamp, no absolute filesystem path and no host or node name, so
two renderings of one model in one process are byte-identical.

## Assumptions

- **The model and the registry are handed in** — the renderer's determinism holds because it reads no
  disk, clock or environment; every fact it renders arrived as an argument.
- **`KIND_SHAPES` stays exported from `src/commands/loops-graph.mjs`** — the import is a read of a
  frozen export, and FF-7802 asserts the export still exists rather than assuming it.
- **The `ref` is supplied by the caller** — the document's `item:` frontmatter key and its `h1` render
  from it; nothing here resolves an item ref.
- **Cross-process byte-identity is asserted at 78/02's gate** — FF-7803's separate-process claim is
  story 02's control. This story asserts byte-identity within a process and the absence of any
  self-changing content, which is the property that makes 78/02's claim assertable.

## Gaps

### The undeclared-endpoint glyph is restated, and nothing compares the two copies

- **Status:** open
- **Discharge condition:** either an assertion compares the renderer's restated literal against the
  one in `src/commands/loops-graph.mjs`, or that module additively exports `UNDECLARED_SHAPE` and the
  renderer imports it.

`UNDECLARED_SHAPE` is spelled in both `src/loop-record-render.mjs` and `src/commands/loops-graph.mjs`.
FF-7802 forbids only DECLARED kinds' glyphs, so this one copy is permitted by design and is documented
where it sits; the residual is that a later change to 52's parallelogram would leave the two faces
drawing undeclared endpoints differently with nothing red. See `78/VERIFICATION.md` **F-78-E**.

### Nothing is written to disk

- **Status:** open
- **Discharge condition:** `work:loop-record --write` lands (78/02) and `EXECUTION.md` is written under
  the item's own folder.

The renderer returns bytes. `EXECUTION.md`'s path, the read-modify-write that preserves a signature,
and the frozen sign-off block are 78/02's and 78/03's; no file in the work stream carries a rendered
execution record yet.

### The populated rendering is exercised by fixtures alone

- **Status:** open
- **Discharge condition:** a run record in this repository carries a registry-resolvable loop id, so a
  real item renders a non-empty `## What ran`.

Every engagement, ceiling comparison, phase list, retry chain and terminal outcome this renderer draws
comes from a constructed model in the suite, because no run record on disk carries the join key. The
zero-coverage rendering — the primary case by ADR-003 — is the only one a real item produces today.
See `78/VERIFICATION.md` **F-78-A**.
