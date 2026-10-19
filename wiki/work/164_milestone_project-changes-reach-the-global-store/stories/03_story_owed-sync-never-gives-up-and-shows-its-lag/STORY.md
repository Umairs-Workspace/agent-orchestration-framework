---
type: story
number: 03
slug: owed-sync-never-gives-up-and-shows-its-lag
title: "Owed sync never gives up and shows how far behind it is — an idempotent publish retries until it lands with backoff, and the operator can see each workspace's owed sync, its error and its last success"
parent: 164
status: in-review
owner: product-owner
created: 2026-10-19
updated: 2026-10-19
schema: 1
aofVersion: 0.1.0
depends: [00, 02]
reads: [wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-006, packages/work/src/local-change.mjs, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-003, wiki/work/164_milestone_project-changes-reach-the-global-store/stories/03_story_owed-sync-never-gives-up-and-shows-its-lag/EXAMPLES.md, wiki/work/164_milestone_project-changes-reach-the-global-store/stories/03_story_owed-sync-never-gives-up-and-shows-its-lag/PLAN.md, packages/effects/src/journal.mjs, packages/mesh/src/projection-store.mjs, packages/core/src/application/bindings/effects/dispatch.mjs, packages/core/src/application/bindings/effects/table.mjs, test/arch/command/acd-effects-ledger.test.mjs, packages/mesh/src/presence.mjs, packages/core/src/application/bindings/commands/doctor.mjs, packages/work/src/doctor/memory-effectiveness.mjs, packages/work/test/work-doctor.suite.mjs]
files: [packages/effects/src/dispatch.mjs, packages/effects/src/journal.mjs, packages/effects/src/registry.mjs, packages/mesh/src/effects.mjs, packages/mesh/src/projection-store.mjs, packages/mesh/src/cache-read.mjs, packages/work/src/doctor/sync.mjs, packages/work/src/doctor/index.mjs, packages/work/src/commands/doctor.mjs, packages/core/src/application/bindings/commands/doctor.mjs, packages/effects/test/effects.test.mjs, packages/effects/test/journal.test.mjs, packages/work/test/doctor.test.mjs, test/store/sync-doctor-shows-lag.test.mjs, test/store/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 03 · Owed sync never gives up and shows how far behind it is

## User story

As **the operator, who cannot tell today whether the global store is current or quietly behind**,
I want **an owed sync retried until it lands, and one place that shows what is owed per
workspace, why it is failing and when each workspace last synced**,
so that **a store that was locked, or a daemon that was down, delays a change but never drops it,
and I find out the store is behind from aof rather than from a stale fleet card. Today a publish
that fails five times is never retried, and nothing tells me.**

## Tasks

- [x] [00 · An owed sync retries until it lands, with backoff](tasks/00_an-owed-sync-retries-until-it-lands.feature)
- [x] [01 · Doctor shows what is owed and how far behind each workspace is](tasks/01_doctor-shows-the-sync-lag.feature)

## Notes

- **Retry** (ADR-006): a reactor entry may declare `retry: "until-done"`, and `publish-projection`
  does. For such steps `drainEffects` ignores the attempts ceiling and applies backoff from the
  step's `updated_at`. Every other reactor keeps `EFFECT_MAX_ATTEMPTS`.
- **The facts the surface shows** already exist: owed and failing steps (`readUnsettledSteps`:
  attempts, last error, age), and each workspace's last successful sync (the baseline's
  `observed_at`, story 00). The surface reads them. It stores nothing new.
- **The surface is `aof work doctor`** (Q1, answered 2026-10-19). A new pure group,
  `doctor/sync.mjs`, raises `sync-failing` (warn) when an owed sync has failed at least once, and
  `sync-behind` (warn) when this workspace holds records changed since they were last synced.
  `--json` carries a `sync` block per workspace. The facts are read at the command edge, never in
  the engine.
- **Depends on 02** as well as 00: the doctor overlay edit (02) and this group share
  `doctor/index.mjs` and `commands/doctor.mjs`. Q1 put the surface there after ADR-007 had
  drawn 01, 02 and 03 as parallel. This contract absorbs that, per the amendment rule: 01 runs
  alongside 02, and 03 follows 02.
