# 05 · Append-only snapshots — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Observe snapshots are append-only
An observe run writes a new timestamped artefact under `observability/snapshots/<ts>/`; no write
path in `src/work-observe.mjs` opens an existing snapshot for truncation or rewrite, so a snapshot
a retrospective cited still holds the figures it cited after any number of later runs.

### Snapshots are ordered without being read
Each snapshot is identifiable by when it was taken, and their order is determinable from their
names alone.

### A newest-snapshot read path
`readLatestSnapshot` resolves the most recent snapshot and leaves every older one unchanged.

### Pre-68 snapshots are marked, not migrated
An existing pre-68 in-place snapshot gains exactly one derivation header naming the pre-68 miner
and the four provenance facts it is subject to — possible double-count, blind toolchain figures,
possible overwrite, pre-68 producer — while its figures are left exactly as they are: none
recomputed, corrected or removed.

### Marked and unmarked snapshots are distinguishable without reading figures
A post-68 snapshot carries no pre-68 header, and marking is idempotent — an already-marked snapshot
is never given a second one.

## Assumptions

- **A read-only observe writes nothing** — the append-only guarantee covers the write path; a
  read-only run leaves the existing snapshot's bytes untouched rather than rewriting them
  identically.
- **Retention is unbounded as delivered** — nothing prunes accumulated snapshots, which is what
  makes a cited snapshot permanently resolvable.

## Gaps

### The truth of the figures inside a snapshot
- **Status:** open
- **Discharge condition:** story 68/03 replaces the free-text attribution matcher with the
  `sessionId` join.
Snapshots are now durable and honestly labelled, which makes a citation falsifiable; it does not
make a pre-68 figure correct. The header states the defects a marked snapshot is subject to rather
than removing them.
