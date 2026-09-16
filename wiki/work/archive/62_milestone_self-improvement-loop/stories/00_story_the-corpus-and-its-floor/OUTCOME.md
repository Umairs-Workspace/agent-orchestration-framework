# 62/00 · The corpus and its floor — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The three-lane tuning corpus
`assembleCorpus` returns exactly three declared lanes — lessons, lineage and observations — measured
at 410 retrospective lesson sections, 61 run records and 6 observation readings over this repository.

### A floor beside every count
Each lane is emitted with the root it walked, the population it found and the floor it was measured
against; a lane declared without a floor is refused before a count or a report can exist, so "found
nothing" and "looked at nothing" cannot be rendered alike.

### `tune-ran-on-nothing`
A lane below its floor emits a finding naming the lane, the root, the floor missed and the scope it was
measured under, and that finding differs from the audit lane's in its code string alone.

### Source-owned readers
Every lane reaches its source through the module that already owns it — `parseRetrospective`,
`readRuns`, `readLatestSnapshot` — and no raw `runs/*.json` or `snapshots/*/agents.json` path grammar
exists in the family; scope resolves only through `src/work-ref-scope.mjs`.

## Assumptions

- **The lessons lane does its own join** — routing it through `buildRecords` would drop 34 of the 402
  lesson sections then present and break slug scoping, so only its PARSE is mandated.
- **Lane floors are scope-invariant** — a narrowed scope changes the population, never the bar it is
  measured against, so a scoped run cannot silently lower its own standard.
