---
type: story
number: 01
slug: an-unchanged-tree-costs-a-stat-walk
title: "An unchanged work tree costs a stat walk — the stream read is remembered by stat digest and shared by concurrent callers, so a tick or a poll over a tree nobody edited parses nothing"
parent: 167
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-003, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-001, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/01_story_an-unchanged-tree-costs-a-stat-walk/EXAMPLES.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/01_story_an-unchanged-tree-costs-a-stat-walk/PLAN.md, packages/foundation/src/cost-meter.mjs, packages/work/src/records.mjs, packages/work/src/local-change.mjs, packages/mesh/src/launcher.mjs, packages/core/src/application/bindings/global-work-publisher.mjs, packages/core/src/application/bindings/work/read.mjs, test/support/cache-read-fixture.mjs]
files: [packages/work/src/discovery.mjs, packages/work/src/read.mjs, packages/mesh/src/projection-store.mjs, packages/mesh/src/publisher.mjs, packages/work/test/discovery.test.mjs, test/store/cache-read-boundary-holds.test.mjs, packages/mesh/test/projections.test.mjs]
---
# 01 · An unchanged work tree costs a stat walk

## User story

As **the operator, whose daemon re-parses aof's 1,800 record docs on every tick and every poll
even when nobody has touched them**,
I want **a read of an unchanged work tree to cost one stat walk, and concurrent reads of one tree
to share one walk**,
so that **an empty cache, or a viewer left open, costs a few stats every few seconds instead of a
full parse, and the daemon's cost follows how much the tree changes, not how often it is
asked.**

## Tasks

- [x] [00 · An unchanged tree is read once, and concurrent reads share it](tasks/00_an-unchanged-tree-is-read-once.feature)
- [x] [01 · The stat digest has one home](tasks/01_the-stat-digest-has-one-home.feature)

## Notes

- **The digest moves** from `packages/mesh/src/publisher.mjs` to `packages/work/src/discovery.mjs`
  as `workTreeStatDigest` (ADR-003). The publisher imports it, and its stat-gate behaviour stays
  byte-identical (164/ADR-002).
- **The memo's home is `discovery.mjs`**, the one enumerator. It caches items plus record
  metadata, keyed by resolved `workDir`, with the digest beside them. Both hot consumers read
  through it: `buildStreamView` (`read.mjs`) and `readWorkspaceProjectionItems`
  (`projection-store.mjs`).
- **Counted** with 00's meter: a parse is `full-disk-read`, and a memo answer is `cache-hit`
  labelled `memo`.
- No new source file, no new suite file, and no directory-budget row moves.

## Accept decision

2026-10-22 — **ACCEPTED** by `aof:verify 167`. The story's own suites pass with an isolated home:
13 registered cases and 27 native cases, no failures, every scenario a named `167/01` case.
`aof work validate 167/01` passes, and doctor reports no error and no `control-unresolved`. There is
no `@manual` or `@uat` scope, and no blocker finding. Evidence is in the parent `VERIFICATION.md`.
