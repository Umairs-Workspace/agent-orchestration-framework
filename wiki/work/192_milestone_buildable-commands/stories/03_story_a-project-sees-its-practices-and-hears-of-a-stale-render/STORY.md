---
type: story
number: 03
slug: a-project-sees-its-practices-and-hears-of-a-stale-render
title: "A project sees its practices and hears of a stale render — `aof work update` lists each optional practice and the key that turns it on, and `aof work doctor` says when a key has changed since the commands were rendered"
parent: 192
depends: [00, 02]
status: in-review
owner: product-owner
created: 2026-11-13
updated: 2026-11-13
adrs: [ADR-003, ADR-006, ADR-007]
reads:
  - wiki/work/192_milestone_buildable-commands/SPEC.md
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-002
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-003
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-006
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-007
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-008
  - packages/core/src/work/bundle.mjs
  - packages/core/src/work/bundle-synthesis.mjs
  - packages/core/src/lock.mjs
  - packages/core/src/render-plan.mjs
  - packages/core/src/application/bindings/work/doctor-examples.mjs
  - packages/core/src/application/bindings/work/doctor-diagrams.mjs
  - packages/specification-by-example/src/doctor-lane.mjs
  - packages/specification-by-example/assets/bundle.json
  - packages/core/assets/bundle.json
  - packages/work/src/doctor/daemon-cost.mjs
  - test/arch/bundle/acd-install-manifest-contract.test.mjs
  - test/examples/doctor-examples-lane.test.mjs
files:
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/src/work/update.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/src/application/bindings/commands/init-update.mjs
  - packages/core/src/application/bindings/work/doctor-practices.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/core/src/application/bindings/commands/doctor.mjs
  - packages/core/src/application/assemble.mjs
  - packages/work/src/doctor/index.mjs
  - packages/work/src/commands/doctor.mjs
  - packages/core/test/practice-render-lane.suite.mjs
  - packages/core/test/work-update.suite.mjs
  - packages/core/test/work-init.suite.mjs
  - packages/core/test/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - .aof/aof.lock.json
  - wiki/reference/practice-prose.md
schema: 1
aofVersion: 0.1.0
---
# 192/03 · A project sees its practices and hears of a stale render

## User story

As **an operator of a project that already runs on aof**,
I want **`aof work update` to tell me which optional practices exist, which are on and what
turns each on, and `aof work doctor` to tell me when I changed a key and have not updated**,
so that **I can find a practice without reading aof's source, and a practice I turned on is
never silently missing from my commands**.

What lands (ADR-006, ADR-007): the update's result and output gain the list of declared
practices; init and update record, in the install manifest, which practices each render was
built with; and the work doctor gains one lane that compares that record with the project's
config. It is an error when a practice is on and the commands were rendered without it, a
warning the other way round, and one warning for an install that has no record yet.

## Tasks

- [x] 00 [update lists the optional practices](tasks/00_update-lists-the-optional-practices.feature)
- [x] 01 [the doctor reports a key changed since the render](tasks/01_the-doctor-reports-a-key-changed-since-the-render.feature)
- [x] 02 [an install with no record is told once to update](tasks/02_an-install-with-no-record-is-told-once-to-update.feature)

## Notes

- **This is the adoption path** for every practice that ships prose, milestone 193's included
  (193/ADR-006 §6 leaves it to this milestone).
- It waits on 192/02 for two reasons: its end-to-end cases name the two real practices, and both
  stories rewrite this checkout's lock.
- The lane's binding is a new module in a directory at its ceiling. The budget row moves from 15
  to 16, with ADR-006 as the reason.
- Read the list and both findings as the operator would, in a terminal, before calling this
  built. They are this story's product.
