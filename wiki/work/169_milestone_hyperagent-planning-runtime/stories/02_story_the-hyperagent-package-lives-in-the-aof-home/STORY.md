---
type: story
number: 02
slug: the-hyperagent-package-lives-in-the-aof-home
title: "The Hyperagent package lives in the aof home — one verb writes the planner instructions and the seven skills under ~/.aof/hyperagent/ for upload, and no project renders them"
parent: 169
status: done
owner: product-owner
created: 2026-10-23
updated: 2026-10-23
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-004, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-005, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-007, packages/core/src/planning-init.mjs, packages/core/src/asset-base.mjs, packages/core/src/application/bindings/command-core.mjs, packages/integration-hyperagent/src/commands.mjs, packages/integration-hyperagent/src/doctor.mjs]
files: [packages/integration-hyperagent/assets/bundle.json, packages/integration-hyperagent/assets/AGENT.md, packages/integration-hyperagent/assets/skills, packages/integration-hyperagent/src/contribution.mjs, packages/integration-hyperagent/src/commands.mjs, packages/integration-hyperagent/src/package.mjs, packages/integration-hyperagent/src/doctor.mjs, packages/integration-hyperagent/README.md, packages/integration-hyperagent/test/hyperagent.suite.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/assets/manifest.json, packages/core/test/hyperagent-runtime.suite.mjs, test/arch/command/acd-integration-registry-one-home.test.mjs, test/fixtures/application/command-inventory.json, test/integration/features/lifecycle.feature, test/work/verification-template.test.mjs, .gitattributes, .aof/aof.lock.json, .aof/aof.apply-journal.json, .hyperagent, .mcp.json, README.md, wiki/hyperagent-support.md, wiki/prompt-audit.md]
---
# 02 · The Hyperagent package lives in the aof home

## User story

As **the operator who hands planning to Hyperagent**,
I want **the planner instructions and the seven planning skills written once to my aof home, by a
verb that tells me what to upload**,
so that **I upload one known set to my Hyperagent account, rather than a copy rendered into every
project's tree that Hyperagent never reads.**

## Tasks

- [x] [00 · One verb writes the Hyperagent package to the aof home, and no project renders it](tasks/00_the-package-is-written-to-the-aof-home.feature)

## Notes

- **Why the move (measured 2026-10-23, ADR-007).** Hyperagent reads no repository folder. Its
  skills docs list four ways to create a skill: upload a `SKILL.md` or JSON export (up to 5 MB),
  link documentation, build it in chat, or save one from a thread. "Importing always creates a new
  skill." The branch's "Import from GitHub" step is not in Hyperagent's docs. An upload lands on the
  account, the same for every project, which is the Cowork case (165/ADR-006).
- **Supersedes, does not edit.** 169/01's delivered contract says `.hyperagent/` renders for an
  enabled project and that four verbs are registered. That text stays as delivered; this story's
  contract is the one that holds from here, and 169/01's tests change with it.
- **This repository** keeps `work.integrations.hyperagent` (for `/aof:hyperplan`), and its
  `.hyperagent/` leaves on the next `aof work update`.
