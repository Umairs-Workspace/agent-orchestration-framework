---
type: story
number: 02
slug: a-lessons-meta-line-is-normalised-on-read
title: "A lesson's meta line is normalised on read — one vocabulary, the enum token indexed, the qualifier kept as a tag"
parent: 148
status: done
owner: product-owner
created: 2026-10-04
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002, ADR-003]
reads:
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/SPEC.md
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-001
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-002
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-003
  - packages/work/src/declared-id.mjs
  - packages/work/src/tune/corpus.mjs
  - packages/core/assets/commands/retrospective.md
  - packages/core/src/application/bindings/memory/local-indexing.mjs
  - packages/core/src/application/bindings/memory/graphify-backend.mjs
  - packages/knowledge/src/memory/local-backend.mjs
  - packages/knowledge/package.json
  - test/arch/command/acd-declared-id-single-home.test.mjs
  - test/arch/graph/acd-graphify-records-from-parsers.test.mjs
  - test/arch/memory/acd-import-artifact-shape.test.mjs
  - test/arch/work/index.mjs
files:
  - packages/work/src/memory-vocabulary.mjs
  - packages/work/package.json
  - packages/knowledge/src/memory/local-indexing.mjs
  - packages/knowledge/src/memory/local-retrieval.mjs
  - packages/knowledge/src/memory/graphify-backend.mjs
  - packages/knowledge/src/memory.mjs
  - packages/core/assets/templates/shared/OUTCOME.md
  - packages/core/assets/manifest.json
  - .aof/templates/work/shared/OUTCOME.md
  - packages/work/test/memory-vocabulary.suite.mjs
  - packages/work/test/index.mjs
  - packages/knowledge/test/memory-meta-normalised.suite.mjs
  - packages/knowledge/test/index.mjs
  - packages/knowledge/test/memory-retrieval.suite.mjs
  - packages/knowledge/test/gap-carries-discharge.suite.mjs
  - test/memory/memory-indexing.test.mjs
  - test/run/outcome-index-any-item.test.mjs
  - test/arch/run/acd-outcome-record-frozen-shape.test.mjs
  - test/arch/work/acd-memory-vocabulary-one-home.test.mjs
  - test/arch/work/index.mjs
  - test/memory/memory-integration.test.mjs
---
# 02 · A lesson's meta line is normalised on read

## User story

As **an agent recalling lessons by kind** (the developer's `--kind near-miss` edge at build),
I want **every lesson whose meta line starts with one of the four kinds to be indexed under that
kind, with what the author added after it kept as a tag on the record**,
so that **a lesson written `near-miss (recurring)` is reached by the filter it belongs to, and the
word "recurring" is kept as data, not lost**.

What lands: `packages/work/src/memory-vocabulary.mjs`, the one home of the meta grammar and the
enums (ADR-001). The normaliser in the one parser reaches both backends and `aof work tune`
(ADR-002). `tags` is a new field on every record, under index version 2 (ADR-003). Gap status is
held to `open`, `discharged` and `open-by-decision`. Each backend's `status` reports a store built
before version 2 as stale, in a nested `index` block. Story 05 shows the tags in the `--block` line. FF-14802 holds the single home and its agreement with the
prompt and the template.

## Tasks

- [x] 00 [a lesson's meta value is indexed as its vocabulary word, with the rest as a tag](tasks/00_a-lessons-meta-value-is-indexed-as-its-vocabulary-word-with-the-rest-as-a-tag.feature)
- [x] 01 [a gap's status is one of three, and its date and cause are tags](tasks/01_a-gaps-status-is-one-of-three-and-its-date-and-cause-are-tags.feature)
- [x] 02 [every record carries tags, and a store before version 2 is stale](tasks/02_every-record-carries-tags-and-a-store-before-version-2-is-stale.feature)

## Notes

- **Measure the after on the live corpus** (m05/R4). Rebuild the records in memory over the real
  `wiki/work` and count Kind, Area, Stage and gap status before and after, against the before in
  ARCHITECTURE's measured facts. Record both distributions in VERIFICATION. 90 of the 91 blank
  lessons state no kind, so expect about 90 blanks to remain: counted, never guessed.
- `test/run/outcome-index-any-item.test.mjs:347` pins `INDEX_VERSION === 1` ("this story alters no
  record shape"). That pin was story 80's, and it moves to 2 here, with the reason.
