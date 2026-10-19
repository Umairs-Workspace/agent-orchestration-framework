---
type: story
number: 02
slug: pinned-planner-is-packaged-for-cowork
title: "The pinned planner is packaged for Cowork — pm-skills' recommended plugins are taken from a clone checked against the recorded commit, each a standalone uploadable package"
parent: 165
status: in-review
owner: product-owner
created: 2026-10-19
updated: 2026-10-19
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-003, wiki/work/165_milestone_planning-runs-in-cowork/RESEARCH.md, wiki/work/165_milestone_planning-runs-in-cowork/stories/02_story_pinned-planner-is-packaged-for-cowork/EXAMPLES.md, wiki/work/165_milestone_planning-runs-in-cowork/stories/02_story_pinned-planner-is-packaged-for-cowork/PLAN.md, wiki/work/archive/02_milestone_planning-init/ARCHITECTURE.md#adr-008, packages/core/src/planning-init.mjs, test/arch/planning/acd-planning-clonable-ref.test.mjs]
files: [packages/core/src/planning/cowork-planner.mjs, packages/core/test/planning-cowork-planner.suite.mjs, packages/core/test/index.mjs, scripts/test-unit.mjs, test/arch/planning/acd-cowork-planner-pinned.test.mjs, test/arch/planning/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 02 · The pinned planner is packaged for Cowork

## User story

As **the operator, planning in Cowork**,
I want **aof to package the bought planner's recommended plugins from the exact pm-skills commit
it records, each as its own uploadable plugin**,
so that **Cowork runs the same planner, at the same commit, that Claude Code installs. Cowork's
own marketplace dialog can't pin a ref and follows the default branch, so it can't give me
that.**

## Tasks

- [x] [00 · Packages come only from the pinned commit](tasks/00_packages-come-only-from-the-pinned-commit.feature)
- [x] [01 · Each recommended plugin is a standalone package](tasks/01_each-recommended-plugin-is-a-standalone-package.feature)

## Notes

- **Seam** (ADR-003): `packages/core/src/planning/cowork-planner.mjs` exports
  `packagePlanner({ sha, withOptional, source })`. It returns `{ ok: true, packages: [{ name, files }] }`
  or a refusal `{ ok: false, reason, message }`. `files` is the same file-map shape 165/01's
  writer takes. This story writes nothing into the repo. 165/03 zips and writes.
- It reuses `MARKETPLACE_GIT_URL`, `MARKETPLACE_REF`, `CORE_PLUGINS`, `OPTIONAL_PLUGINS` and
  `isFullSha` from `planning-init.mjs`, which this story only reads.
- `source` is the injection seam, as `resolveSha` takes `sha`. Tests pass a fixture tree with a
  stated `HEAD`. The live path clones over HTTPS into `os.tmpdir()` and always removes the clone.
- **Budget:** `packages/core/test` +1 for `planning-cowork-planner.suite.mjs`, and
  `test/arch/planning` +1 for FF-16504. 165/01 raises the same rows. Whichever story lands second
  raises from the ceiling the first left, and the wave planner orders them on the shared file.
