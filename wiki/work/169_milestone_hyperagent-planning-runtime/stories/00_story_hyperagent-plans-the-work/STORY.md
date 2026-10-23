---
type: story
number: 00
slug: hyperagent-plans-the-work
title: "Hyperagent plans the work — the opt-in planning runtime, its six planning skills and aof-prd, and /aof:hyperplan with its four verbs, assimilated from the delivered branch"
parent: 169
status: done
owner: product-owner
created: 2026-10-22
updated: 2026-10-23
schema: 1
aofVersion: 0.1.0
reads: [wiki/hyperagent-support.md, packages/core/src/model.mjs, packages/core/src/work/bundle-runtime.mjs, packages/core/src/work/bundle.mjs, packages/core/src/asset-base.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/assets/bundle.json, packages/core/assets/commands/hyperplan.md, packages/core/assets/variants/hyperagent/planning.md, packages/integration-hyperagent/src/runtime.mjs, packages/integration-hyperagent/src/commands.mjs, packages/integration-hyperagent/src/check.mjs, packages/core/test/hyperagent-runtime.suite.mjs, packages/integration-hyperagent/test/hyperagent.suite.mjs, test/integration/features/lifecycle.feature]
files: [.agents/skills/aof-hyperplan/SKILL.md, .agents/skills/aof-hyperplan/agents/openai.yaml, .aof/aof.apply-journal.json, .aof/aof.lock.json, .claude/commands/aof/hyperplan.md, .hyperagent/AGENT.md, .hyperagent/skills/aof-add-milestone/SKILL.md, .hyperagent/skills/aof-add-story/SKILL.md, .hyperagent/skills/aof-add-task/SKILL.md, .hyperagent/skills/aof-prd/SKILL.md, .hyperagent/skills/aof-refine/SKILL.md, .hyperagent/skills/aof-shatter/SKILL.md, .hyperagent/skills/aof-validate/SKILL.md, .opencode/commands/aof/hyperplan.md, README.md, package.json, packages/core/assets/bundle.json, packages/core/assets/commands/hyperplan.md, packages/core/assets/hyperagent/AGENT.md, packages/core/assets/manifest.json, packages/core/assets/skills/aof-prd/SKILL.md, packages/core/assets/variants/codex/workflow.md, packages/core/assets/variants/hyperagent/planning.md, packages/core/package.json, packages/core/src/adapter-warnings.mjs, packages/core/src/adapters.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/src/application/bindings/commands/assets/add.mjs, packages/core/src/application/bindings/commands/assets/apply.mjs, packages/core/src/application/bindings/commands/init-update.mjs, packages/core/src/application/bindings/scaffold.mjs, packages/core/src/asset-references.mjs, packages/core/src/commands/packages-add.mjs, packages/core/src/model.mjs, packages/core/src/spine/flags.mjs, packages/core/src/work/bundle-runtime.mjs, packages/core/test/application.test.mjs, packages/core/test/bundle-runtime-variants.suite.mjs, packages/core/test/bundle.suite.mjs, packages/core/test/hyperagent-runtime.suite.mjs, packages/core/test/index.mjs, packages/core/test/work-delegation.suite.mjs, packages/integration-hyperagent/README.md, packages/integration-hyperagent/package.json, packages/integration-hyperagent/src/brief.mjs, packages/integration-hyperagent/src/check.mjs, packages/integration-hyperagent/src/commands.mjs, packages/integration-hyperagent/src/config.mjs, packages/integration-hyperagent/src/doctor.mjs, packages/integration-hyperagent/src/plan-result.mjs, packages/integration-hyperagent/src/runtime.mjs, packages/integration-hyperagent/test/hyperagent.suite.mjs, packages/integration-hyperagent/test/index.mjs, schemas/aof.schema.json, scripts/test.mjs, scripts/workspace-runtime-audit.json, test/arch/command/acd-cli-entry-executes.test.mjs, test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs, test/arch/session/acd-session-driver-mesh-blind.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/bundle/core-workspace.test.mjs, test/command/application-assembly.test.mjs, test/fixtures/application/command-inventory.json, test/integration/features/lifecycle.feature, wiki/hyperagent-support.md, wiki/prompt-audit.md, yarn.lock]
---
# 00 · Hyperagent plans the work

## User story

As **the operator who wants planning done without holding a session open for it**,
I want **Hyperagent to run AOF's planning procedures against my repository, and to hand it a
planning step from Claude Code or Codex with `/aof:hyperplan`**,
so that **a PRD, its backlog drivers and a milestone's stories arrive as a draft pull request that
already passes `aof work validate`, written to the same planning contract as every other runtime,
while a project that never names Hyperagent renders exactly what it rendered before.**

## Tasks

- [x] [00 · A project that enables Hyperagent gets the planning skills Hyperagent imports, and only that project](tasks/00_hyperagent-renders-the-planning-subset.feature)
- [x] [01 · /aof:hyperplan delegates a planning step and checks what comes back](tasks/01_hyperplan-delegates-and-checks.feature)

## Findings

Assimilated from branch `feat/hyperagent-planning-runtime` (commits `de0ba6ee`..`3aa7c346`, six
commits written by Hyperagent on 2026-10-19). The code is left as delivered; story 01 discharges
the findings below.

- **F-1 · BLOCKING · structural — the package is not self-contained.** The verbs are in
  `packages/integration-hyperagent`, but its prompts are in `packages/core/assets/`:
  `commands/hyperplan.md`, `skills/aof-prd/`, `hyperagent/AGENT.md`, `variants/hyperagent/planning.md`
  and the `hyperplan` section of the shared `variants/codex/workflow.md`. And `model.mjs`, core's
  lowest layer, imports `@aof/integration-hyperagent/runtime` so it can add a row to the fixed
  `RUNTIMES`/`CAPABILITIES` tables. The cause: a contribution can add CLI verbs but not bundle assets
  or a runtime. Fixing it: extend the contribution with `assets` and `runtime`, and let a fitness
  function forbid `@aof/integration-*` imports below the composition root (story 01).
- **F-2 · BLOCKING · defect — `aof work integrations hyperagent check` fails on Windows.**
  `check.mjs:57` passes `--prefix=<tree>\` built with `path.sep`. Git creates the leading
  directories by splitting on `/`, so `tree\src` is never created and `checkout-index` fails.
  Measured: the package case "a plan branch is validated in a temporary checkout" is red here
  (79/80 green). Fixing it: build the prefix with forward slashes.
- **F-3 · BLOCKING · decided — `/aof:hyperplan` installs into every project.** Its descriptor
  member targets claude and opencode and carries a codex variant, so every `aof work init` or
  `update` renders it, Hyperagent or not. The operator chose to render an integration's members
  only for a project that enables it (169 ADR-005).
- **F-4 · BLOCKING · structural — Hyperagent is modelled as a runtime.** The branch adds a fourth
  row to `RUNTIMES` and `CAPABILITIES`, an opt-in `defaultRuntimes()` threaded through about
  fifteen defaulting sites, and a `requiresVariant` command mapping. Operator, on review:
  "Hyperagent is not a runtime." It is an integration: a project enables it, and its files are
  that integration's assets (169 ADR-001).

QA coverage: every criterion maps to a covering case (see the task features). Four suites were run
with `--only`: 79/80 green, and the red is F-2. The six `lifecycle.feature` scenarios were not run
here. The live acceptance (import into Hyperagent, one plan run, `/aof:hyperplan` over OAuth) is
`@manual` and still owed.

## Notes

- The criteria say "a project that enables Hyperagent" on purpose. As delivered, that means naming
  the `hyperagent` runtime; after story 01, it means `work.integrations.hyperagent` is present.
  Both satisfy the same black-box behaviour.
- The variants are full rewrites: a Hyperagent session has no checkout and no `aof` binary, so every
  CLI step is replaced, never simulated.
