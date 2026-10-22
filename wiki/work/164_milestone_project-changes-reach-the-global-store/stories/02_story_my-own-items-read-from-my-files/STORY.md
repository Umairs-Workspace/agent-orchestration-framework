---
type: story
number: 02
slug: my-own-items-read-from-my-files
title: "My own items read from my files — find, list, next and doctor answer a project's own records from its disk, and a cached row overlays one only when another machine reported it and the file has not changed since"
parent: 164
status: done
owner: product-owner
created: 2026-10-19
updated: 2026-10-19
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-005, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-002, wiki/work/164_milestone_project-changes-reach-the-global-store/stories/02_story_my-own-items-read-from-my-files/EXAMPLES.md, wiki/work/164_milestone_project-changes-reach-the-global-store/stories/02_story_my-own-items-read-from-my-files/PLAN.md, wiki/work/archive/43_milestone_mesh-artifact-authority/ARCHITECTURE.md#adr-005, packages/mesh/src/projection-store.mjs, packages/work/src/doctor/coherence.mjs, packages/work/src/commands/doc.mjs, packages/work/src/commands/tasks.mjs, packages/core/src/application/bindings/work/read.mjs, packages/core/src/application/bindings/commands/doctor.mjs, test/store/cache-read-seam.test.mjs, test/arch/store/acd-cache-read-surface-boundary.test.mjs, test/arch/store/acd-cache-staleness-single-predicate.test.mjs]
files: [packages/work/src/local-change.mjs, packages/work/src/read.mjs, packages/work/src/doctor/index.mjs, packages/work/src/commands/doctor.mjs, packages/mesh/src/cache-read.mjs, packages/work/test/read.test.mjs, packages/work/test/local-change.suite.mjs, test/store/cache-read-doctor-overlay.test.mjs, test/store/cache-read-own-records-from-disk.test.mjs, test/store/index.mjs, test/arch/store/acd-cache-answers-single-predicate.test.mjs, test/arch/store/index.mjs]
---
# 02 · My own items read from my files

## User story

As **the operator reading the stream with `aof work find`, `list`, `next` and `doctor`**,
I want **a project's own records answered from its files, with a cached row standing in only for
work another machine reported that this checkout has not touched since**,
so that **what I just changed is what I see, with no daemon and no sync in between. Today every
cached status overrides the local frontmatter, so a stale copy of my own item hides the edit I
made a minute ago.**

## Tasks

- [x] [00 · My own records answer from my files](tasks/00_my-own-records-answer-from-my-files.feature)

## Notes

- **One predicate** (ADR-005, FF-16402): `cacheAnswers(row, { selfNodeId, locallyChanged })` in
  `packages/work/src/local-change.mjs`. The clauses of `reportedElsewhere` move into the leaf, and
  `read.mjs` keeps re-exporting `reportedElsewhere` for `doc`/`tasks`.
- `buildStreamView`'s `stateOverlay` and doctor's `overlayFor` overlay only when `cacheAnswers`
  is true; otherwise the ref is `answeredFrom: "disk"`, and in doctor `statusFrom: "disk"`.
- **The baseline** comes back from the same `readCachedItemRows` open (story 00's
  `readObservations`). The disk fingerprint is computed from the item already listed, with no
  second read. The self node id is `meshNodeIdOf(config)`, the id `doc`/`tasks` already use.
- **Unchanged:** cache-only refs (`dir: null`), the worktree boundary (disk only), the frozen
  seven-key `list --json` element (the stamp is stripped at that face), and the degrade codes.
- 43/ADR-005 is narrowed, not edited: a worker-authored item with an untouched scaffold still
  answers from the cache.
