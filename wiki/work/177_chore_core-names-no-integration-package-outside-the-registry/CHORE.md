---
type: chore
number: 177
slug: core-names-no-integration-package-outside-the-registry
title: "Core names no integration package outside the registry — FF-16901 drops its Notion exception"
status: not-started
owner: developer
created: 2026-10-23
updated: 2026-10-23
depends: [175, 176]
schema: 1
aofVersion: 0.1.0
---
# 177 · Core names no integration package outside the registry

## Intent

Once Notion's verbs and effects reach core through its contribution, FF-16901's one named exception
(the Notion package, 169/ADR-003 as amended) has nothing left to excuse. Remove it, so that
`integrations.mjs` is the only core module naming any `@aof/integration-*` package, with no
exceptions.

## Definition of Done

- [x] `grep -rl "@aof/integration-notion" packages/core/src` names `integrations.mjs` alone.
- [x] `test/arch/command/acd-integration-registry-one-home.test.mjs` has no `EXCEPTION`, and its
      planted-import case covers a Notion import too.
- [x] 169's OUTCOME gap "Notion is still imported across core" is marked `discharged`.
- [x] `aof work validate` is green (no regression).

## Resolution

- `grep -rl "@aof/integration-notion" packages/core/src` names `packages/core/src/integrations.mjs`
  alone.
- FF-16901 has no `EXCEPTION`. Any `@aof/integration-*` specifier outside the registry is now a
  violation. E1 asserts that the registry names both contributions. E2 plants a Notion import
  (`@aof/integration-notion/store-metadata`) beside the Hyperagent one, and both are reported.
- 169's OUTCOME gap "Notion is still imported across core" is `discharged`. The FF-16901 register
  row in 169's ARCHITECTURE.md no longer names an exception.
