# 03 · A story reads its slice — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### `adrs:` is a story frontmatter key, optional and additive
A `STORY.md` may carry `adrs: [ADR-006, ADR-007]`. Absence is the pre-existing behaviour exactly —
every one of this stream's 201 declaration-free stories validates untouched — and the key is
de-duplicated in declaration order rather than sorted.

### A declaration that does not resolve is a validate finding, by ref and by file
`aof work validate` reports `ADR declaration "ADR-999" does not resolve in 70/ARCHITECTURE.md` for an
id the story's own milestone does not carry, and `ADR declaration adrs must be an inline list` for any
present-but-non-list shape. A story with no parent milestone is told it has no architecture to resolve
against rather than borrowing an identically-numbered ADR from another item.

### One ADR is addressable inside the one architecture document
`extractAdrBlocks(text, ids)` returns the requested `## ADR-NNN` blocks from a single
`ARCHITECTURE.md` text, in document order, byte-preserved, ending each block at the next h2 — so a
following register or partition section never leaks into the last ADR. It matches exact ids only:
`ADR-00` never resolves to `ADR-001`, and every requested miss is reported.

### Fenced and commented headings are examples, not document structure
The one structural-h2 scan behind both ADR addressing and the register fallback ignores headings
inside code fences and HTML comments, so a documentation example of a `## ADR-NNN` heading or of a
`## Fitness functions` register is neither an address nor an early block boundary.

### A story's brief carries the slice it declared; a declaration-free story carries the register
`compileBriefForItem` puts the declared ADR blocks in the brief's architecture section, names any
unresolved id inside it, and falls back to the milestone's `## Fitness functions` register — never the
whole architecture document — when a story declares nothing. A milestone's own brief still carries the
full architecture record.

### `ARCHITECTURE.md` remains one artifact, and a control says so
`WORK_ITEM_ARTIFACTS` enumerates exactly one architecture entry, `REGISTER_BLOCKS`'s declaring file for
the fitness register is still `ARCHITECTURE.md`, and the extractor names no sibling per-ADR file or
directory. FF-7008 fails if any of those three change.

### The artifact budget binds at accept, on the item being accepted
`aof work status <ref> done` runs the same `budgetGroup`, over the same measurement and the same
resolved budgets as the advisory sweep, with the accepting ref injected, and refuses the transition
with `artifact-budget-exceeded` (409) naming artifact, measured lines and budget. No other status edge
applies the gate.

### Nothing already accepted is re-litigated, and the sweep is unchanged
An open item's over-budget artifact is still a `warn`, the stream-wide sweep still reports every
overage as a warning, and an artifact exactly at its budget is healthy. The 15 milestones already past
700 lines stay green.

### The budget numbers keep one home
`budgetsFromConfig` is the single resolution path for both the warning and the refusal, so the two
gates cannot be given different numbers.

### The frozen work core is left as it was found
The declaration's resolution lives in `src/commands/validate.mjs`, not in `src/work.mjs`; the core
validator's bytes at HEAD are the bytes it had at 70/00's merge.

## Assumptions

- **A story's ADRs live in its own milestone's `ARCHITECTURE.md`** — folder containment selects the
  owner, so a standalone story's declaration is unresolved rather than matched against a same-numbered
  ADR elsewhere.
- **The id grammar has one authority** — the extractor addresses ids the declaration supplies and does
  not re-parse the ADR id grammar, which stays in `src/declared-id.mjs`.
- **Markdown h2 is the block boundary** — an ADR block ends at the next `##`, so an ADR written with a
  deeper heading structure or interrupted by an unrelated h2 is delimited by that structure, not by
  its content.
- **The accepting item is the unit the budget measures** — an over-budget artifact belonging to a
  sibling or a parent does not refuse this item's acceptance.
- **`aof work status <ref> done` is the accept door** — a hand-edited `status:` line pays no budget
  preflight at all.

## Gaps

### The declared slice does not survive the brief's ceiling on this repo's own stories
- **Status:** discharged 2026-08-23 by `m70/05`
- **Discharge condition:** a `continue` brief compiled for a real story in this stream retains its
  architecture section, either because the ceiling admits it or because truncation stops evicting
  sections that would have fit.
Measured at this gate on all five of milestone 70's own stories, the architecture section is dropped in
every phase: task contracts alone are 7,115–12,311 chars against an 8,000-char ceiling, and
`assemble` stops retaining once a higher-priority section does not fit, so 70/03's own 5,306-char
declared slice is evicted while 4.4 KB of budget goes unused. The capability is delivered and correct;
on this repo's real data it does not reach a brief. Recorded as `m70/F-11`.

**Discharged.** `m70/05` replaced drop-whole with condense-then-sacrifice-bottom-up. Re-measured at
that story's gate over all 219 stories in this stream, 194 briefs carry their architecture or fitness
section and none is sacrificed in any phase; `70/03`'s own `continue` brief carries the register at
6,742 chars of 8,000.

### Nothing in the stream declares `adrs:`
- **Status:** discharged 2026-08-23 by `m70/05`
- **Discharge condition:** at least one `STORY.md` in this stream carries an `adrs:` line, so the
  declaration is exercised by the real work stream rather than only by tests and probes.
The key is introduced, validated and read, and zero of the 201 stories use it — including the four
sibling stories of the milestone that introduced it. Until a story declares one, the register fallback
is the only architecture content any brief in this repo can carry.

**Discharged.** `m70/05` declares `adrs: [ADR-002, ADR-003, ADR-009]` in its own `STORY.md` — the
only story of the 219 to do so — and its brief carries those three ADRs' headings and decisions in
place of the register. `m70/05`'s real-stream guard fails if no story in the stream declares any, so
the path can no longer pass by emptiness.

### An `adrs:` declaration is not surfaced by `aof work doctor`
- **Status:** open
- **Discharge condition:** an unresolved or malformed `adrs:` is reported by whichever surface an
  operator is expected to read, or the two surfaces are documented as having different jobs.
The resolution moved from a `work doctor` register family to `aof work validate` during review. That
keeps the frozen core untouched, and it also means `aof work doctor` — the surface that reports every
other declaration-resolution failure, including `control-unresolved` — says nothing about a broken ADR
declaration.

### `adrs:` is undeclared in the config-adjacent schema and undocumented
- **Status:** open
- **Discharge condition:** the story frontmatter key set that documents `depends:` also names `adrs:`.
The key is introduced exactly as `depends:` was, but `README.md` and the story template do not mention
it, so an author learns of it only by reading this milestone. Same class as `m70/F-07` and `m70/F-09`,
a different surface.
