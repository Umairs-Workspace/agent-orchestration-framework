---
type: story
number: 00
slug: a-command-is-composed-from-slots-and-fragments
title: "A command is composed from slots and fragments — a source marks where a practice may add prose, a practice declares what it adds and the keys that turn it on, and the loader fills each slot from the project's own config"
parent: 192
depends: []
status: done
owner: product-owner
created: 2026-11-13
updated: 2026-11-14
adrs: [ADR-001, ADR-002, ADR-003]
reads:
  - wiki/work/192_milestone_buildable-commands/SPEC.md
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-001
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-002
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-003
  - packages/core/src/work/bundle.mjs
  - packages/core/src/work/bundle-runtime.mjs
  - packages/core/src/work/bundle-synthesis.mjs
  - packages/core/src/work/bundle-manifest.mjs
  - packages/core/src/work/update.mjs
  - packages/core/src/work/orchestrator.mjs
  - packages/core/src/work/delegation.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/src/planning/cowork-plugin.mjs
  - packages/core/src/practices.mjs
  - packages/core/src/integrations.mjs
  - packages/core/src/asset-base.mjs
  - packages/core/src/adapters.mjs
  - packages/core/assets/bundle.json
  - packages/learning/assets/bundle.json
  - packages/core/test/bundle.suite.mjs
  - packages/core/test/bundle-runtime-variants.suite.mjs
  - packages/core/test/work-update.suite.mjs
  - test/arch/examples/index.mjs
  - test/support/cli-spawn.mjs
files:
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/src/work/bundle.mjs
  - packages/core/src/work/bundle-synthesis.mjs
  - packages/core/src/work/update.mjs
  - packages/core/src/work/orchestrator.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/test/bundle-compose.suite.mjs
  - packages/core/test/bundle.suite.mjs
  - packages/core/test/work-update.suite.mjs
  - packages/core/test/index.mjs
  - test/arch/practices/index.mjs
  - test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs
  - test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs
  - test/arch/practices/acd-render-reads-project-config-only.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - scripts/test.mjs
  - wiki/reference/practice-prose.md
schema: 1
aofVersion: 0.1.0
---
# 192/00 · A command is composed from slots and fragments

## User story

As **someone who maintains a practice that most projects leave off**,
I want **to add my practice's prose to a command or a role brief from my own package, at a place
the command marks, turned on by the project's own config**,
so that **a project that has not turned my practice on never loads a sentence of it, and core's
commands stop growing each time a practice is written**.

What lands (ADR-001, ADR-002, ADR-003): the slot marker and its two shapes; the `practices` list
and the `fragment` member in a bundle fragment; one pure module that decides what is on and
composes a text; and `loadBundle({ config })`, which hands every reader a composed bundle. No
shipped source gains a slot here, so every command renders exactly as it does today. The
mechanism is proved on fixture practices handed in through the loader's existing test seam.

## Tasks

- [x] 00 [a slot holds what is on and leaves nothing behind](tasks/00_a-slot-holds-what-is-on-and-leaves-nothing-behind.feature)
- [x] 01 [fragments keep a declared order and one can replace another](tasks/01_fragments-keep-a-declared-order-and-one-can-replace-another.feature)
- [x] 02 [each runtime gets the body written for it](tasks/02_each-runtime-gets-the-body-written-for-it.feature)
- [x] 03 [a render reads the project's own config](tasks/03_a-render-reads-the-projects-own-config.feature)
- [x] 04 [a contribution that cannot land is refused at load](tasks/04_a-contribution-that-cannot-land-is-refused-at-load.feature)
- [x] 05 [the reference says how to write a slot and a fragment](tasks/05_the-reference-says-how-to-write-a-slot-and-a-fragment.feature)

## Notes

- **Fixtures, not shipped prose.** Every scenario runs on a fixture practice and a fixture member
  handed to `readDescriptor` through `readFragment`, or on a bundle given to `updateWork` through
  `bundleOverride`. The shipped bundle declares no practice until 192/02.
- **The read and write sets were derived by hand** from `aof graph impact` (built 2026-11-13) and
  the suite convention. The derivation service has no CLI door, so there was no proposal to
  subtract from.
- `packages/core/src/work` is at its directory ceiling. The new module raises the row from 10 to
  11, with ADR-001 §6 as the reason. `test/arch/practices` is a new subject directory: it needs
  its exemption entry in the same control and one import in `scripts/test.mjs`.
- The three controls FF-19205, FF-19206 and FF-19207 land here and lose their `pending` marker in
  the milestone's register when they do.
