---
type: story
number: 03
slug: the-hyperagent-package-carries-one-zip
title: "The Hyperagent package carries one zip — the seven skills in one upload, beside the loose files"
parent: 169
status: done
owner: product-owner
created: 2026-10-23
updated: 2026-10-23
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-007, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-008, packages/core/src/planning/stored-zip.mjs, packages/integration-hyperagent/src/package.mjs]
files: [packages/integration-hyperagent/src/package.mjs, packages/integration-hyperagent/src/commands.mjs, packages/integration-hyperagent/src/doctor.mjs, packages/integration-hyperagent/test/hyperagent.suite.mjs, packages/core/src/application/bindings/command-core.mjs, test/integration/features/lifecycle.feature, wiki/hyperagent-support.md]
---
# 03 · The Hyperagent package carries one zip

## User story

As **the operator who uploads the planner skills to Hyperagent**,
I want **the package to include one zip of the seven skills**,
so that **the upload is a single file, the way Hyperagent's Create skill dialog takes it, instead of
seven separate uploads.**

## Tasks

- [x] [00 · The package verb writes one zip of the seven skills](tasks/00_the-package-verb-writes-one-zip.feature)

## Notes

- **Measured 2026-10-23 (ADR-008).** Uploading a `.zip` opens a Hyperagent thread whose agent unpacks
  it and drafts one skill per `<id>/SKILL.md` folder. The operator uploaded a trial zip with that
  layout, and the account then held the seven `aof-*` skills.
