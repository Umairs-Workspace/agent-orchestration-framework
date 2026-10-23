---
type: story
number: 01
slug: integration-packages-are-self-contained
title: "Integration packages are self-contained — an integration's verbs and bundle assets reach core through one contribution and render only where it is enabled, and Hyperagent becomes an integration rather than a runtime"
parent: 169
status: done
owner: product-owner
created: 2026-10-22
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-001, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-002, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-003, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-004, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-005, wiki/work/169_milestone_hyperagent-planning-runtime/ARCHITECTURE.md#adr-006, packages/core/src/asset-base.mjs, packages/core/src/work/bundle.mjs, packages/core/src/work/bundle-runtime.mjs, packages/core/src/work/bundle-synthesis.mjs, packages/core/src/model.mjs, packages/core/src/application/bindings/command-core.mjs, packages/integration-hyperagent/src/runtime.mjs, packages/integration-hyperagent/src/commands.mjs, packages/integration-hyperagent/src/check.mjs, scripts/generate-bundle-manifest.mjs, scripts/build-sea.mjs, scripts/install-local.mjs, test/arch/bundle/acd-sea-safe-asset-base.test.mjs, test/arch/bundle/acd-bundle-location.test.mjs]
files: [packages/integration-hyperagent/assets/bundle.json, packages/integration-hyperagent/assets/commands/hyperplan.md, packages/integration-hyperagent/assets/variants/codex/hyperplan.md, packages/integration-hyperagent/assets/AGENT.md, packages/integration-hyperagent/assets/skills, packages/integration-hyperagent/src/contribution.mjs, packages/integration-hyperagent/src/commands.mjs, packages/integration-hyperagent/src/check.mjs, packages/integration-hyperagent/src/runtime.mjs, packages/integration-hyperagent/package.json, packages/integration-hyperagent/README.md, packages/integration-hyperagent/test/hyperagent.suite.mjs, packages/core/src/integrations.mjs, packages/core/src/model.mjs, packages/core/src/asset-base.mjs, packages/core/src/work/bundle.mjs, packages/core/src/work/bundle-runtime.mjs, packages/core/src/work/bundle-synthesis.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/src/adapters.mjs, packages/core/src/adapter-warnings.mjs, packages/core/src/application/bindings/commands/assets/add.mjs, packages/core/src/application/bindings/commands/assets/apply.mjs, packages/core/src/application/bindings/commands/init-update.mjs, packages/core/src/application/bindings/scaffold.mjs, packages/core/src/asset-references.mjs, packages/core/src/commands/packages-add.mjs, packages/core/src/spine/flags.mjs, packages/core/assets/bundle.json, packages/core/assets/variants/codex/workflow.md, packages/core/test/hyperagent-runtime.suite.mjs, schemas/aof.schema.json, scripts/generate-bundle-manifest.mjs, scripts/build-sea.mjs, scripts/install-local.mjs, test/arch/command/acd-integration-registry-one-home.test.mjs, test/arch/command/acd-cli-entry-executes.test.mjs, .aof/aof.config.json, wiki/hyperagent-support.md, packages/core/assets/manifest.json, packages/core/assets/commands/hyperplan.md, packages/core/assets/hyperagent, packages/core/assets/skills/aof-prd, packages/core/assets/variants/hyperagent, packages/core/package.json, packages/integration-hyperagent/src/doctor.mjs, packages/core/test/bundle.suite.mjs, packages/core/test/bundle-runtime-variants.suite.mjs, packages/core/test/work-delegation.suite.mjs, scripts/sea-asset-manifest.mjs, scripts/workspace-runtime-audit.json, .gitattributes, .aof/aof.lock.json, .aof/aof.apply-journal.json, .hyperagent/AGENT.md, .hyperagent/skills/aof-add-milestone/SKILL.md, .hyperagent/skills/aof-add-story/SKILL.md, .hyperagent/skills/aof-add-task/SKILL.md, .hyperagent/skills/aof-prd/SKILL.md, .hyperagent/skills/aof-refine/SKILL.md, .hyperagent/skills/aof-shatter/SKILL.md, .hyperagent/skills/aof-validate/SKILL.md, .claude/commands/aof/hyperplan.md, .opencode/commands/aof/hyperplan.md, .agents/skills/aof-hyperplan/SKILL.md, .agents/skills/aof-hyperplan/agents/openai.yaml, .codex/aof/workflows/workflow-contract.md, README.md, wiki/prompt-audit.md, test/arch/command/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/arch/session/acd-session-driver-mesh-blind.test.mjs, test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs, test/arch/bundle/acd-bundle-membership.test.mjs, test/arch/bundle/acd-declared-writes-include-generated-siblings.test.mjs, test/arch/bundle/acd-generated-stamp.test.mjs, test/integration/features/lifecycle.feature]
---
# 01 · Integration packages are self-contained

## User story

As **the maintainer adding or changing an integration**,
I want **everything an integration ships (its CLI verbs and its prompts) to live in its own
package, reach core through one contribution, and render only for projects that enable it**,
so that **"where does this live?" has one answer, core carries no integration's prompts or
runtime rows, and a new integration is one package plus one registry line rather than edits
scattered through core.**

## Tasks

- [x] [00 · An integration contributes its own bundle members, and they render only where it is enabled](tasks/00_an-integration-contributes-its-own-assets.feature)
- [x] [01 · Core names no integration package outside the registry](tasks/01_core-names-no-integration-outside-the-registry.feature)
- [x] [02 · The plan-branch check extracts on Windows](tasks/02_check-extracts-on-windows.feature)

## Notes

- **The runtime goes first.** Revert `defaultRuntimes()` and the `hyperagent` runtime row
  (ADR-001) before moving the assets, so the move happens on a three-runtime model.
- **Move, don't rewrite.** The prompt bodies move unchanged. Each Hyperagent skill's source becomes
  its full `SKILL.md`, today's rendered frontmatter without `aof-runtime: hyperagent`.
  `hyperplan`'s Codex section leaves core's shared `variants/codex/workflow.md` for the package's
  own variant file.
- **This repository enables Hyperagent** (`work.integrations.hyperagent` in `.aof/aof.config.json`),
  so `/aof:hyperplan` keeps rendering. (Its `.hyperagent/` render was removed by 169/02, ADR-007.)
- **Out of scope:** Notion's move onto the seam is the follow-up chore (milestone SPEC).
