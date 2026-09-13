---
type: story
number: 00
slug: loop-model-and-loader
title: "The loop model & loader — the frozen schema, read into plain data"
parent: 52
status: done
owner: product-owner
created: 2026-08-14
updated: 2026-08-14
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 52/00 · The loop model & loader

## User story

As an **operator whose repo declares its control loops**, I want those declarations read into one
plain-data model with a **closed, frozen vocabulary** — where "we don't know" is a value the schema
accepts and reports, not a hole it papers over — so that every later reader (the checks, the
rendering, milestone 53's Loop-Ready score, milestone 55's anchors) is looking at the same facts and
none of them can mistake a declared gap for a filled field.

## Context

This is the milestone's foundation: `src/work-loops.mjs` (new) — the reader for
`<work.dir>/loops/*.md` and the single home of the frozen vocabulary every other story consumes.

The honesty rule is the point of the story, not a detail of it. RESEARCH measured that `owner` is
unknown for six of seven loops, that two loops are literally uncapped, and that four have only
prose-level machinery. A loader that forced those fields to be filled would make the registry's
first act a fabrication. So `unknown` / `uncapped` / `none` / `prose:` are first-class, mutually
distinct values, carried to consumers on `Field.kind` — a consumer can never confuse a declared gap
with a filled value, because they differ in `kind`, not merely in `raw`.

The boundary is equally load-bearing: this story imports **exactly** `parseFrontmatter` from
`src/work.mjs` (240 dependents) and nothing else, and it edits that file not at all.

ADR references: 52/ADR-001 (non-item store, no writer), 52/ADR-002 (the frozen node schema and the
sentinel grammar), 52/ADR-003 (the three pointer schemes, syntax-validated only), 52/ADR-004 (the
five edge keys and six endpoint schemes), 52/ADR-005 (`ground: exogenous`, actor-only),
52/ADR-006 (the typed cadence grammar), 52/ADR-007 §1–2 (the finding envelope and code set).

## Acceptance

- A `<work.dir>/loops/*.md` directory of records loads into a plain-data model of nodes, fields and
  edges — one node per file, `id` matching `<scheme>:<filename stem>`.
- Every field reaches the consumer as `Field = { key, raw, kind, … }` with `kind` **always** present —
  the four gap kinds (`unknown`/`uncapped`/`none`/`prose`) and the filled kinds (`pointer`, `phrase`,
  and the typed `periodic`/`event`/`ref`/`flag`/`enum` with their payloads). `cadence` arrives
  **normalised** (`{kind:"periodic", ms}`), never as a raw string for a consumer to parse.
- `fields[key]` shape is **key-determined from the frozen schema, never data-determined**: `Field[]`
  for `reference`/`measurement`/`actuator`/`ceiling` (always — `ceiling: uncapped` →
  `[{kind:"uncapped"}]`), `Field` for the scalars; `id`/`kind`/`title` are not in `fields`.
- Key admission is **kind-scoped**: `ground:` on a `kind: loop` node, or a control field on a
  `kind: actor` node, is `loop-key-not-admitted-for-kind` — not silence and not `loop-unknown-key`.
- A frontmatter line the minimal parser silently drops (the SPEC's own `veto/constraint:` being the
  likeliest) is caught by a raw-block re-scan as `loop-malformed-frontmatter-line`. `parseFrontmatter`
  itself is **not** widened — that would edit the 240-dependent god-node's shared parser for one typo.
- An empty machinery or edge list (`reference: []`) is `loop-empty-list` — the hole through which an
  aspirational loop would otherwise pass.
- `loop-graph-dangling-endpoint` is the **loader's** (`Endpoint.resolved` is a loader field), which
  makes the loader two-pass; the checks never parse a string.
- The handoff to the checks is the frozen `Model = { source, present, nodes, findings }` — plain
  serialisable, every path raw-absolute.
- The admitted keys, node kinds, five edge keys, three pointer schemes, six endpoint schemes,
  sentinel tokens, cadence kinds and the four event triggers are **exported frozen literal sets** —
  derived from nothing, never widened by the data being read.
- Schema violations (missing required key, bad value, scalar-where-list, unknown key, id/filename
  mismatch, unparseable record) are `severity: error` findings; declared gaps (`unknown`,
  `uncapped`, `prose:`) are `severity: warn` findings. Neither blocks; both are reported.
- An absent `loops/` directory is not an error — it is `present: false` with an empty node list.
- Pointers are validated for **shape only**: no module is opened, no command id resolved, no config
  key read, no filesystem touched outside `<work.dir>/loops/`.
- `src/work.mjs` is unmodified; the only import from it is `parseFrontmatter`.

## Tasks

- [x] [00 — the frozen vocabulary](tasks/00_frozen-vocabulary.feature)
- [x] [01 — the record loader and the node model](tasks/01_record-loader.feature)
- [x] [02 — the field-value grammar and its sentinels](tasks/02_field-value-grammar.feature)
- [x] [03 — pointer and endpoint syntax validation](tasks/03_pointer-endpoint-syntax.feature)
- [x] [04 — schema and honesty findings](tasks/04_schema-and-honesty-findings.feature)

## Notes

Parallel with 52/01 and 52/03 by construction: the checks consume the model as plain data (no import
from this module) and the records are markdown. The contracts they build against are frozen in
ADR-002/003/004/006, not discovered here.
