---
type: story
number: 00
slug: a-local-change-is-noticed-and-owed
title: "A local change is noticed and owed — a hand edit, pull or scaffold takes its row in the store through the same journal a verb uses, and every aof command syncs its own workspace"
parent: 164
status: in-review
owner: product-owner
created: 2026-10-19
updated: 2026-10-19
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-001, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-002, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-003, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-004, wiki/work/164_milestone_project-changes-reach-the-global-store/stories/00_story_a-local-change-is-noticed-and-owed/EXAMPLES.md, wiki/work/164_milestone_project-changes-reach-the-global-store/stories/00_story_a-local-change-is-noticed-and-owed/PLAN.md, packages/mesh/src/assignment-record.mjs, packages/mesh/src/worktrees.mjs, packages/effects/src/dispatch.mjs, packages/effects/src/registry.mjs, packages/core/src/application/bindings/global-work-store.mjs, packages/core/src/application/bindings/effects/journal.mjs, packages/core/src/application/bindings/effects/dispatch.mjs, packages/core/src/workspace.mjs, test/arch/store/acd-global-publisher-single-seam.test.mjs, test/arch/store/acd-global-propagation-single-predicate.test.mjs, test/arch/store/acd-publish-on-mutate-ledgered.test.mjs, test/arch/work/acd-work-items-single-writer.test.mjs, test/arch/command/acd-effects-ledger.test.mjs, test/store/cache-authority-upsert-seam.test.mjs, test/store/cache-authority-contention-lock.test.mjs]
files: [packages/work/src/local-change.mjs, packages/work/package.json, packages/mesh/src/projection-store.mjs, packages/mesh/src/store-metadata.mjs, packages/mesh/src/publisher.mjs, packages/mesh/src/effects.mjs, packages/effects/src/journal.mjs, packages/core/src/application/bindings/effects/table.mjs, packages/core/src/application/bindings/global-work-publisher.mjs, packages/core/src/application/bindings/spine/face.mjs, packages/work/test/local-change.suite.mjs, packages/work/test/index.mjs, packages/effects/test/journal.test.mjs, packages/mesh/test/projections.test.mjs, packages/mesh/test/effects.test.mjs, test/store/sync-local-change-owed.test.mjs, test/store/sync-command-syncs-own-workspace.test.mjs, test/store/global-work-propagation.test.mjs, test/store/index.mjs, test/arch/store/acd-local-change-single-predicate.test.mjs, test/arch/store/acd-sync-rides-the-effects-journal.test.mjs, test/arch/store/acd-store-never-writes-records.test.mjs, test/arch/store/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 00 · A local change is noticed and owed

## User story

As **the operator, who edits records by hand, pulls branches and lets skills scaffold items as
often as running verbs**,
I want **any change to a project's own record files to take its row in the global store, owed in
the same journal a verb's change is owed in, with every aof command syncing its own workspace**,
so that **the store stops being right only for changes a verb happened to raise. Today a hand edit
never reaches it, and a ref another machine once reported stays that machine's forever (the
`authored-elsewhere` skip), even after its work has merged home and been edited here.**

## Tasks

- [x] [00 · A changed record takes its row; an unchanged one never steals another node's](tasks/00_a-changed-record-takes-its-row.feature)
- [x] [01 · A change is owed in the journal, once per workspace](tasks/01_a-change-is-owed-in-the-journal.feature)
- [x] [02 · Every aof command syncs its own workspace](tasks/02_every-command-syncs-its-own-workspace.feature)

## Notes

- **The baseline** (ADR-002) is `work_item_observations` in the projection store, schema 10 → 11.
  Only a successful upsert advances it, a missing one is never a change, and the fingerprint
  covers row fields, never prose.
- **The predicate's home** is `packages/work/src/local-change.mjs`: pure, with no imports,
  exposing `rowFingerprint` and `locallyChanged`. Story 02 adds `cacheAnswers` to the same leaf.
- **Authorship** (ADR-001): changed refs ride a new `localChangeRefs` set into `upsertWorkItems`
  and take authorship exactly as `operatorRefs` does. The lock still wins.
- **The mark** (ADR-003): `workspace.changed` maps to the existing `publish-projection` reactor.
  It gets an idempotent id from `(workspaceId, digest)`, and the journal gains a generic
  `collapse_key` that settles older owed steps as `superseded`. Journal schema 1 → 2.
- **The CLI driver** (ADR-004 driver 3): the face runs the pass for the command's own workspace
  before `sweepPendingEffects`. A propagating workspace only. Never fatal to the command.
- Story 01 (daemon drivers) and story 02 (reads) build on what this lands. The retry policy is
  story 03's; until then a `workspace.changed` step keeps today's ceiling.
