# 62/02 · Provenance that resolves — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Citations checked against disk at emit time
Every citation an emitted proposal carries is resolved when it is emitted — the file is present, and
where a line is cited the file has that line. Over this repository 63 proposals are emitted and none
carries an unresolved citation.

### Demotion rather than a footnote
A proposal carrying one unresolvable citation is absent from the emitted set and present in `findings`
with the failing citation named; the two sets are disjoint. A real run reports 24 such demotions and
506 `below-evidence-floor` findings, and none of them reaches the exit code.

### Both grammars imported, neither re-authored
Path citations come from `pathCitationsIn` / `splitPathLocator` (`src/work-doctor-controls.mjs`, two
additive exports) and id citations from `qualifiedRefsIn` / `QUALIFIED_REF` (`src/declared-id.mjs`);
no module under `src/work-tune/` holds a citation regex, locator pattern or ref/id pattern of its own.

### `controlPathsIn` is byte-unchanged by the split
The doctor's control lane answers exactly as it did before the two exports were carved out, asserted
as a self-comparison over every `## Fitness functions` register in `wiki/work`, with
`isControlFileName`'s test-shaped filter still applied on that path.

### A qualified id or nothing
Every id citation matches `m?<itemRef>/<ID>`; a bare id is never emitted as a citation and no bare-id
extractor exists in the family.

### An evidence floor counted in documents
The floor is two distinct resolved source documents, so an id citation and a path citation naming one
document count once. Over this repository every emitted proposal clears it, at between 2 and 9 distinct
documents.

## Assumptions

- **Demotion outranks the floor except where there is nothing to demote** — a zero-citation proposal is
  reported `below-evidence-floor` rather than as an unresolvable citation.

## Gaps

### The private-grammar guard is signature-based
- **Status:** open
- **Discharge condition:** the leg detects a private citation grammar by SHAPE rather than by name.
FF-6204's "no private grammar is authored" leg matches named signatures (`CITED_PATH`,
`LOCATOR_SUFFIX`, and three literal fragments), so a second copy of a grammar authored under a
different name is not caught. Measured at milestone 62's accept gate by the control's own red probe:
the probe turns it red only because the plant carries the grammar's own name.
