---
type: story
number: 4
slug: codex-upgrades-preserve-user-files
title: "Codex upgrades preserve operator-owned files"
parent: 154
status: done
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
depends: [03]
reads: ["packages/core/src/adapter-warnings.mjs","packages/core/src/adapters.mjs","packages/core/src/aof-gitignore.mjs","packages/core/src/application/bindings/work/init.mjs","packages/core/src/application/bindings/workspace-writer.mjs","packages/core/src/asset-base.mjs","packages/core/src/asset-references.mjs","packages/core/src/claude-settings.mjs","packages/core/src/codex-settings.mjs","packages/core/src/frozen-set.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/core/src/opencode-hooks.mjs","packages/core/src/packages.mjs","packages/core/src/paths.mjs","packages/core/src/render-plan.mjs","packages/core/src/runtime-config.mjs","packages/core/src/work/bundle-runtime.mjs","packages/core/src/work/bundle-synthesis.mjs","packages/core/src/work/bundle.mjs","packages/core/src/work/headroom.mjs","packages/core/src/work/update.mjs","packages/core/src/workspace.mjs","packages/core/test/codex-ownership.suite.mjs","packages/core/test/index.mjs","packages/core/test/support/assets-services.mjs","packages/core/test/work-init.suite.mjs","packages/core/test/work-update.suite.mjs","scripts/test-unit.mjs","test/arch/store/acd-codex-output-ownership.test.mjs","test/arch/bundle/index.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-005-render-native-assets-with-explicit-ownership","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md","packages/core/src/application/bindings/sync.mjs","test/arch/store/index.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","packages/core/src/application/bindings/commands/assets/apply.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/core/test/render-plan.suite.mjs","test/bundle/adapters.test.mjs","packages/foundation/src/fs.mjs","wiki/work/TECH_DEBT.md#9-planapplyactions-silently-overwrites-any-co-authored-file-it-has-no-lock-entry-for","wiki/work/TECH_DEBT.md#34-atomic-temporary-filenames-exceeded-component-limits-lock-writes-duplicated-the-rule","test/support/cli-spawn.mjs","test/integration/steps/shared-cli.steps.mjs","test/integration/features/lifecycle.feature"]
files: ["packages/core/src/application/bindings/work/init.mjs","packages/core/src/application/bindings/workspace-writer.mjs","packages/core/src/codex-settings.mjs","packages/core/src/lock.mjs","packages/core/src/render-plan.mjs","packages/core/src/runtime-config.mjs","packages/core/src/work/update.mjs","packages/core/src/workspace.mjs","packages/core/test/codex-ownership.suite.mjs","packages/core/test/index.mjs","packages/core/test/work-init.suite.mjs","packages/core/test/work-update.suite.mjs","scripts/test-unit.mjs","test/arch/store/acd-codex-output-ownership.test.mjs","test/arch/bundle/index.mjs","packages/core/src/adapters.mjs","packages/core/src/application/bindings/sync.mjs","test/arch/store/index.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/core/test/render-plan.suite.mjs","test/bundle/adapters.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md","packages/foundation/src/fs.mjs","wiki/work/TECH_DEBT.md","test/integration/steps/shared-cli.steps.mjs","test/integration/features/lifecycle.feature"]
---
# 154/04 · Codex upgrades preserve operator-owned files

## User story

As an operator, I want safe repeatable application of Codex assets, so that upgrades preserve my settings and do not leave competing skill copies.

## Tasks

- [x] `tasks/00_coauthored-config.feature` — coauthored config
- [x] `tasks/01_owned-migration.feature` — owned migration

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


- Build declaration repair (2026-10-07): the public adapters apply API and sync door
  also require the shared ownership guard. Their declarations and the owning store-control
  registry/budget are included. FF-15404 belongs under arch/store: arch/bundle is frozen
  by FF-12405. No executable scenario or ADR decision changes. The existing protocol profile
  is required to distinguish installed hook definitions from native activation.

- Atomic-writer debt correction: the lock writer delegates to the existing foundation writer;
  its temporary basename is bounded and failed renames reclaim their temp. Declaration includes
  both former homes and the existing debt ledger.

- Broader CLI fixture repair: expanded DSL config authors a model, not operator access;
  the existing force/drift scenario exercises Claude, retaining its outcomes. New Codex CLI
  cases exercise forced refusal. No delivered work-item task feature is changed. The hook
  capability list is checked against the exact upstream rust-v0.160.0 source tag.

## Accept decision

2026-10-08 — **ACCEPTED** by the main governing session after scoped verification. Ownership, drift, collision, idempotence and legacy-output cases pass across public writer doors. FF-15404 red probes preserve operator-owned neighbors. Evidence and limitations are recorded in the parent `VERIFICATION.md` and its dated artifacts. Scoped validate is clean and doctor reports no errors or unresolved controls. Required build review is already recorded above.
