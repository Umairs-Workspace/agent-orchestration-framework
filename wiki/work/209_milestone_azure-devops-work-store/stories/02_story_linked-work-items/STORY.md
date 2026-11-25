---
type: story
number: 02
slug: linked-work-items
title: "An operator can publish and continue working in the local folder"
parent: 209
depends: [00]
status: in-review
owner: product-owner
created: 2026-11-24
updated: 2026-11-25
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002]
reads: [wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-001, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-002, packages/work/src/store/board-definition.mjs, packages/work/src/store/file-store.mjs, packages/work/src/store/file-placement.mjs, packages/work/src/store/file-lifecycle.mjs, packages/work/src/records.mjs, packages/work/src/item-transitions.mjs, packages/work/src/stream-transitions.mjs, packages/work/src/archive.mjs, packages/work/src/renumber.mjs, packages/work/src/reindex.mjs, packages/work/src/insertion/scaffold.mjs, packages/work/src/commands/promote.mjs, packages/work/src/commands/archive.mjs, test/arch/work/acd-work-item-store-boundary.test.mjs, packages/work/src/content-read.mjs, packages/work/src/commands/insert-story.mjs]
files: [test/command/command-core-contract.test.mjs, test/command/application-assembly.test.mjs, test/arch/store/acd-sync-rides-the-effects-journal.test.mjs, test/arch/work/acd-number-null-safe.test.mjs, test/fixtures/application/command-inventory.json, test/golden/baselines/work-init/default/project/.agents/skills/aof-refine/procedure.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/refine.md.golden, test/golden/baselines/work-init/default/project/.opencode/commands/aof/refine.md.golden, test/golden/baselines/work-init/all-practices/project/.agents/skills/aof-refine/procedure.md.golden, test/golden/baselines/work-init/all-practices/project/.claude/commands/aof/refine.md.golden, test/golden/baselines/work-init/all-practices/project/.opencode/commands/aof/refine.md.golden, test/golden/baselines/work-update/customised-update/project/.claude/commands/aof/refine.md.golden, test/arch/work/acd-work-command-route-coverage.test.mjs, test/arch/work/acd-work-command-cli-bijection.test.mjs, .aof/aof.lock.json, packages/work/test/work-item-store.suite.mjs, packages/work/src/store/board-definition.mjs, packages/work/src/read.mjs, packages/work/src/renumber.mjs, scripts/workspace-runtime-audit.json, packages/acd/assets/manifest.json, .agents/skills/aof-refine/SKILL.md, .agents/skills/aof-refine/agents/openai.yaml, .agents/skills/aof-refine/procedure.md, .claude/commands/aof/refine.md, .codex/aof/workflows/workflow-contract.md, .opencode/commands/aof/refine.md, packages/acd/assets/commands/refine.md, packages/acd/assets/variants/codex/workflow.md, packages/work/src/store/board-store.mjs, packages/work/src/store/board-links.mjs, packages/work/src/store/board-publication.mjs, packages/work/src/store/board-placement.mjs, packages/work/src/commands/board-publish.mjs, packages/work/src/commands.mjs, packages/work/package.json, packages/core/src/application/bindings/command-core.mjs, packages/core/src/application/assemble.mjs, packages/work/test/mutations.test.mjs, packages/core/test/application.test.mjs, test/bundle/yarn-installation.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 02 · An operator can publish and continue working in the local folder

## User story

As a delivery lead, I want AOF to link local work to stable board IDs and keep its documents beside it so that interrupted publication or a later move cannot lose our decisions or duplicate our board items.

## Notes

Own publication, the durable association, lifecycle and placement intents, document-home moves and uploads. Cover ref changes, partial creates, retries after a lost response, concurrent claims, publication on refinement completion and the file-only archive boundary. Use a project-owned fixture adapter to observe board effects through public verbs.

## Tasks

- [x] [Publish when refinement completes](tasks/00_publish-on-refinement.feature)
- [x] [Recover interrupted publication](tasks/01_recover-publication.feature)
- [x] [Preserve identity and history through lifecycle and placement changes](tasks/02_lifecycle-and-placement.feature)
- [x] [Verify artifact copies](tasks/03_artifact-copies.feature)
