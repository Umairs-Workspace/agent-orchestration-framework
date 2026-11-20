---
type: story
number: 01
slug: every-init-scenario-renders-to-its-baseline
title: "Every init scenario renders to its committed baseline — default on three runtimes and on each alone, every practice on, Notion, Hyperagent, and a project holding the user's own files, each run twice to the same bytes"
parent: 203
depends: [00]
status: not-started
owner: product-owner
created: 2026-11-20
updated: 2026-11-20
adrs: [ADR-001, ADR-002, ADR-003, ADR-005]
reads:
  - wiki/work/203_milestone_generated-output-goldens/stories/01_story_every-init-scenario-renders-to-its-baseline/EXAMPLES.md
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-002
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-003
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-005
  - test/support/golden/harness.mjs
  - test/support/golden/normalise.mjs
  - test/support/golden/baseline-store.mjs
  - scripts/golden.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/src/application/bindings/commands/init-update.mjs
  - packages/core/src/work/bundle-synthesis.mjs
  - packages/core/src/practices.mjs
  - packages/core/src/integrations.mjs
  - packages/core/assets/bundle.json
  - packages/specification-by-example/assets/bundle.json
  - packages/integration-hyperagent/assets/bundle.json
  - packages/core/src/claude-settings.mjs
  - packages/core/src/codex-settings.mjs
  - packages/core/src/aof-gitignore.mjs
files:
  - test/golden/work-init.lane.mjs
  - test/golden/work-init.test.mjs
  - test/golden/index.mjs
  - test/support/golden/lanes.mjs
  - test/golden/baselines/work-init/
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/work/203_milestone_generated-output-goldens/stories/01_story_every-init-scenario-renders-to-its-baseline/evidence/
schema: 1
aofVersion: 0.1.0
---
# 203/01 · Every init scenario renders to its committed baseline

## User story

As **a developer changing the bundle, a practice or an integration**,
I want **every way a project can be initialised held to a committed tree**: each runtime, every
practice on, each integration, and a project that already holds the user's own files,
so that **a change to what `aof work init` writes shows as a diff in the PR, in the scenarios it
reaches and only there, before any user runs it**.

What lands (ADR-005): the `work-init` lane's eight scenarios as data, their committed baselines,
the suite that compares them, and the check that the render is the same bytes on every run. Any
instability that check finds is fixed where it is rendered, in this story (ADR-002 §5).

## Tasks

- [ ] `tasks/00_every-runtime-renders-to-its-baseline.feature` (R1): `default` on three runtimes is held whole, `claude`, `codex` and `opencode` as deltas over it, and the global home stays empty.
- [ ] `tasks/01_every-profile-renders-to-its-baseline.feature` (R2): `all-practices`, `notion` and `hyperagent` hold exactly what each turns on.
- [ ] `tasks/02_a-customised-project-renders-to-its-baseline.feature` (R3): the user's own files and entries are held as kept, and the one file `init` overwrites is held as overwritten.
- [ ] `tasks/03_the-render-is-the-same-on-every-run.feature` (R4): two runs of `default` are byte-identical once only instants and temp paths are normalised.
- [ ] `tasks/04_an-intentional-prose-edit-shows-as-exactly-that-edit.feature` (R4, `@manual`): one sentence edited in a bundled command shows as that one hunk, in the scenarios that render it.

## Notes

- The baselines are written once with `node scripts/golden.mjs --lane work-init --update`, and
  reviewed in this story's diff like any other file. `default` is about 1.9 MB. The others are
  small deltas.
- `notion`'s delta is expected to hold its config and nothing else, because Notion ships no
  member (ARCHITECTURE "Measured facts"). A larger delta is a finding, not a baseline to accept.
- The `customised` baseline holds today's overwrite of `.claude/agents/aof-architect.md`. This
  story holds it. It does not change it (ADR-005, consequences).
