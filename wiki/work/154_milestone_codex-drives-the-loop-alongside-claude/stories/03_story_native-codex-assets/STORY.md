---
type: story
number: 3
slug: native-codex-assets
title: "Codex discovers correctly scoped native assets"
parent: 154
status: in-review
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: []
reads: ["packages/core/src/adapter-warnings.mjs","packages/core/src/adapters.mjs","packages/core/src/application/default-foundation.mjs","packages/core/src/asset-references.mjs","packages/core/src/claude-settings.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/core/src/opencode-hooks.mjs","packages/core/src/packages.mjs","packages/core/src/render-plan.mjs","packages/core/src/runtime-config.mjs","packages/core/src/work/bundle-manifest.mjs","packages/core/src/work/bundle-runtime.mjs","packages/core/test/asset-references.suite.mjs","packages/core/test/codex-native-assets.suite.mjs","packages/core/test/index.mjs","packages/core/test/model.suite.mjs","packages/core/test/render-plan.suite.mjs","packages/core/test/support/assets-services.mjs","test/bundle/adapters.test.mjs","test/support/cli-spawn.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-005-render-native-assets-with-explicit-ownership","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/RESEARCH.md","packages/core/src/application/bindings/dsl.mjs","packages/core/package.json","packages/core/test/adapter-warnings.suite.mjs","scripts/test-unit.mjs","packages/core/src/work/bundle.mjs","packages/core/test/work-init.suite.mjs","packages/core/assets/manifest.json","test/arch/bundle/acd-bundle-manifest-hashes.test.mjs","test/arch/bundle/acd-capability-delegation.test.mjs","test/arch/bundle/acd-generated-stamp.test.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","scripts/test-workspace.mjs","scripts/test-sharded.mjs","packages/core/test/bundle.suite.mjs","test/arch/bundle/acd-declared-writes-include-generated-siblings.test.mjs",".gitattributes","test/arch/bundle/acd-bundle-install-eol-pinned.test.mjs","test/bundle/core-workspace.test.mjs","test/bundle/claude-settings-merge.test.mjs","test/loop/autonomous-shell-out-prompt.test.mjs","test/work/stream/work-archive-is-a-move.test.mjs","test/work/stream/work-promote-shows-candidates.test.mjs","test/work/verification-template.test.mjs","test/session/agent-model-override.test.mjs","test/examples/refine-discovery-beat.test.mjs","packages/core/test/graph-rendered-faces.suite.mjs","test/bundle/bundle-architect-draws.test.mjs","test/work/work-add-in-stream.test.mjs","test/bundle/explain-command.test.mjs","test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs","test/planning/planning-prd.test.mjs","test/integration/features/dsl.feature","test/integration/features/lifecycle.feature","test/integration/features/packages.feature","test/integration/features/adapter-policy.feature","wiki/work/TECH_DEBT.md#9-planapplyactions-silently-overwrites-any-co-authored-file-it-has-no-lock-entry-for"]
files: ["packages/core/src/adapter-warnings.mjs","packages/core/src/adapters.mjs","packages/core/src/asset-references.mjs","packages/core/src/model.mjs","packages/core/src/render-plan.mjs","packages/core/test/asset-references.suite.mjs","packages/core/test/codex-native-assets.suite.mjs","packages/core/test/index.mjs","packages/core/test/model.suite.mjs","packages/core/test/render-plan.suite.mjs","test/bundle/adapters.test.mjs","packages/core/test/adapter-warnings.suite.mjs","scripts/test-unit.mjs","packages/core/test/work-init.suite.mjs","packages/core/assets/manifest.json","test/arch/bundle/acd-capability-delegation.test.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","packages/core/test/bundle.suite.mjs","test/arch/bundle/acd-declared-writes-include-generated-siblings.test.mjs",".gitattributes","test/arch/bundle/acd-bundle-install-eol-pinned.test.mjs","test/bundle/core-workspace.test.mjs","test/bundle/claude-settings-merge.test.mjs","test/loop/autonomous-shell-out-prompt.test.mjs","test/work/stream/work-archive-is-a-move.test.mjs","test/work/stream/work-promote-shows-candidates.test.mjs","test/work/verification-template.test.mjs","test/session/agent-model-override.test.mjs","test/examples/refine-discovery-beat.test.mjs","packages/core/test/graph-rendered-faces.suite.mjs","test/bundle/bundle-architect-draws.test.mjs","test/work/work-add-in-stream.test.mjs","test/bundle/explain-command.test.mjs","test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs","test/planning/planning-prd.test.mjs","test/integration/features/dsl.feature","test/integration/features/lifecycle.feature","test/integration/features/packages.feature","test/integration/features/adapter-policy.feature","test/support/cli-spawn.mjs"]
---
# 154/03 · Codex discovers correctly scoped native assets

## User story

As a project author, I want AOF assets rendered into Codex's supported formats and discovery locations, so that Codex actually loads the intended skills, roles and guidance.

## Tasks

- [x] `tasks/00_native-discovery.feature` — native discovery
- [x] `tasks/01_scope-and-capabilities.feature` — scope and capabilities

## Notes

- Decisions: ADR-005 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.


- Native format/discovery checks use the supported [skills](https://learn.chatgpt.com/docs/build-skills),
  [custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents), and
  [directory guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md) contracts.
  This story covers render plans and fresh installations; co-authored writes and legacy migration
  remain 154/04, and workflow-body optimization remains 154/05.
- Build repaired genuine read/write declaration gaps for the native format, warning, registration,
  manifest, installation and LF controls. Historical lock-cleanup fixtures retain their legacy paths.

- Structural review repaired the read declaration for the existing ownership-debt entry.
  Its unowned-guidance overwrite was reproduced as a plan only; no user guidance was overwritten.
  Ownership-aware writes and migration remain the already-authored 154/04 outcome.
