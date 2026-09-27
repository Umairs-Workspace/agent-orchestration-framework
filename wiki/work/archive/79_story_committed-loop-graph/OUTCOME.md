# 79 · The committed loop graph — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The committed loop graph
`wiki/work/loops.md` is a tracked markdown document at the work-directory root holding the loop
registry's Mermaid graph in a fenced block, a `## Health` summary (declared records, declared edges,
error/warning totals and the per-check split), a leading `<!-- aof-generated: … -->` marker naming its
own regenerating command, and no frontmatter at all.

### `work:loop-document` — the registry's one writer
A registered command whose bare face composes the document and emits it touching no disk, whose
`--write` is the only door to the filesystem, and whose input contract accepts no caller-supplied
output path — the single home is derived from `work.dir` and cannot be redirected.

### Byte-identical regeneration
Running `aof work loops document --write` against an unchanged registry rewrites the same bytes and
reports `changed: false`, in-process and across separate processes; the composer reaches no clock, no
filesystem and no environment, so the same registry composes identically from any working directory.

### The drift gate
`test/arch/acd-loop-document-current.test.mjs` reds the test suite when a loop record is edited
without regenerating the document, naming the committed document and the command that regenerates it;
it reads and renders only, repairs nothing, reports an absent document rather than passing it, and
gates the suite alone — no item transition, acceptor door or doctor severity reads it.

### The frozen lists admit the writer, and the board does not
`work:loop-document` is a member of the frozen `WORK_IDS` census and of the `BOARD_DEFERRED`
carve-out with its deferral reason recorded beside chore 64's four read verbs; no `/api/work` route is
served for it and `ui/` carries no token naming the command, its modules or its id.

### The registry family is untouched
The writer's modules (`src/loop-document.mjs`, `src/commands/loop-document.mjs`) match neither of
52/FF-5201's discovery patterns, that gate's expected module list and read-only sweep are unchanged,
and `src/commands/loops-graph.mjs` is byte-unmodified — the frozen renderer is imported, never
restated.

## Assumptions

- **The document's home is derived, never configured** — a project that moves `work.dir` moves the
  document with it, and the drift gate follows, because both resolve the path through the same
  function.
- **The graph's bytes stay 52/FF-5208's** — the composer imports `renderLoopGraph` and restates no
  glyph, node ordering or edge ordering, so any future change to the rendered shape is that gate's to
  admit, not this document's.
- **The drift gate runs only where the runner imports it** — it is registered in `scripts/test.mjs`
  by explicit import and asserts its own membership from inside the runner's process, so it is
  reachable by the project's declared test command and by any lane that selects its file; a runner
  that does not import it does not run it.

## Gaps

### The health summary states registry findings that nothing in this item fills
- **Status:** open
- **Discharge condition:** the registry's `grounding` and `anchor-grounding` checks report zero
  findings — that is, every loop record's reference, measurement and actuator resolves to a declared
  anchor — at which point the committed document's `## Health` section reads `0 error, 0 warning`
  without any change to this item's code.

The document now states the registry's health honestly (`0 error, 33 warning` — 11 `grounding`, 4
`anchor-grounding` at accept), and states it on the page rather than leaving a reader to infer it.
Filling those findings is registry content owned by 55/57; this item delivers the surface that makes
them visible in a pull request, not the edges that clear them.
