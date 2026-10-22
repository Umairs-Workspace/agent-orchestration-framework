---
type: story
number: 00
slug: a-prototype-is-a-work-item
title: "A prototype is a work item — `NN_prototype_<slug>` resolves, validates clean with only its two files, and has its own four status words, with the type-to-record-doc map in one home"
parent: 168
status: done
owner: product-owner
created: 2026-10-22
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-001, wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-002, wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-003, wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-005, packages/work/src/identity.mjs, packages/work/src/records.mjs, packages/work/src/lifecycle.mjs, packages/work/src/validation.mjs, packages/work/src/dependencies.mjs, packages/work/src/readiness.mjs, packages/work/src/discovery.mjs, packages/work/src/doctor/coherence.mjs, packages/work/src/doctor/index.mjs, packages/work/src/commands/ratchet.mjs, packages/work/src/commands/item-status.mjs, packages/knowledge/src/import/recovery.mjs, packages/core/assets/templates/chore/CHORE.md, packages/core/assets/bundle.json, packages/core/test/bundle-spike-chore-membership.suite.mjs, test/arch/planning/acd-spike-chore-vocabulary.test.mjs, test/arch/work/acd-one-mint.test.mjs, test/arch/work/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
files: [packages/work/src/identity.mjs, packages/work/src/records.mjs, packages/work/src/lifecycle.mjs, packages/work/src/validation.mjs, packages/work/src/doctor/coherence.mjs, packages/work/src/doctor/index.mjs, packages/work/src/commands/ratchet.mjs, packages/core/assets/templates/prototype/PROTOTYPE.md, packages/core/assets/templates/prototype/STATE.md, packages/core/assets/bundle.json, packages/core/assets/manifest.json, packages/core/test/bundle-spike-chore-membership.suite.mjs, packages/work/test/records.test.mjs, packages/work/test/validation.test.mjs, packages/work/test/discovery.test.mjs, packages/work/test/readiness.test.mjs, packages/work/test/doctor.test.mjs, test/arch/work/acd-record-doc-map-one-home.test.mjs, test/arch/work/acd-prototype-stays-light.test.mjs, test/arch/work/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, packages/work/src/commands/item-status.mjs, packages/core/test/bundle.suite.mjs, test/work/stream/work-backlog-archive-enumerate.test.mjs, test/arch/work/acd-work-root-one-enumerator.test.mjs, test/work/work-item-status-lifecycle.test.mjs]
---
# 00 · A prototype is a work item

## User story

As **the operator who wants something working fast without the governed loop's ceremony**,
I want **a `prototype` folder in `wiki/work` to be a work item like any other: found by
`aof work find`, held to its own two files by `aof work validate`, and moved through its own
four statuses**,
so that **a prototype is on record next to the governed work. Validate stays green over it,
although it has no stories, features or criteria, and the loop never tries to schedule it.**

## Tasks

- [x] [00 · A prototype folder resolves like any work item and moves through its own four statuses](tasks/00_a-prototype-resolves-and-moves.feature)
- [x] [01 · Validate holds a prototype to its two files, and nothing schedules one](tasks/01_validate-holds-a-prototype-to-its-two-files.feature)

## Notes

- **The map first** (ADR-002). `RECORD_DOC_BY_TYPE` goes in `identity.mjs`, and the four
  spellings in `records.mjs`, `doctor/coherence.mjs`, `doctor/index.mjs` and `commands/ratchet.mjs`
  read it. Then `prototype → PROTOTYPE.md` is one entry.
- **The grammar** (ADR-001). `ITEM_RE` and `BACKLOG_ITEM_RE` admit `prototype`. `isDriver` and
  `isDependTarget` are not touched, so a prototype answers false to both.
- **The lifecycle** (ADR-003). `PROTOTYPE_STATUS`, `PROTOTYPE_STATUS_EDGES`,
  `statusVocabularyFor(type)` and the per-type `itemStatusEdges` go beside `VALID_STATUS`, whose
  five words and order are unchanged.
- **The lean lane** (ADR-005). Validate checks the frontmatter, the three `PROTOTYPE.md` sections,
  `STATE.md`'s two sections, and the absence of `depends:` and `parent:`. The doctor's lifecycle
  lanes skip a prototype.
- **The templates.** `packages/core/assets/templates/prototype/` holds `PROTOTYPE.md` (`## Intent`,
  `## Wants`, `## Shortcuts`, and an optional `## Diagrams`) and `STATE.md` (`## Hand-off` with the
  placeholder that ADR-004's stop refusal looks for, and `## Log`). Neither starts with the
  `aof-generated` comment line. They are declared in `bundle.json` as template `prototype`.
- **Controls.** FF-16801 (`acd-record-doc-map-one-home.test.mjs`), plus FF-16802 and FF-16803 as
  cases in `acd-prototype-stays-light.test.mjs`. Story 01 adds FF-16804 to that file.
  `test/arch/work` rises 50 → 52 for the two files. The first is the record-doc map's own
  subject, and the second is the prototype type's.
