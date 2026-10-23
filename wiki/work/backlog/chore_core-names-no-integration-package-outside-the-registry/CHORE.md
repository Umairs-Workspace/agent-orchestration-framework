---
type: chore
number:
slug: core-names-no-integration-package-outside-the-registry
title: "Core names no integration package outside the registry — FF-16901 drops its Notion exception"
status: not-started
owner: developer
created: 2026-10-23
updated: 2026-10-23
depends: [notion-verbs-reach-core-through-one-contribution, notion-effects-reach-core-through-the-contribution]
schema: 1
aofVersion: 0.1.0
---
# Core names no integration package outside the registry

## Intent

Once Notion's verbs and effects reach core through its contribution, FF-16901's one named exception
(the Notion package, 169/ADR-003 as amended) has nothing left to excuse. Remove it, so that
`integrations.mjs` is the only core module naming any `@aof/integration-*` package, with no
exceptions.

## Definition of Done

- [ ] `grep -rl "@aof/integration-notion" packages/core/src` names `integrations.mjs` alone.
- [ ] `test/arch/command/acd-integration-registry-one-home.test.mjs` has no `EXCEPTION`, and its
      planted-import case covers a Notion import too.
- [ ] 169's OUTCOME gap "Notion is still imported across core" is marked `discharged`.
- [ ] `aof work validate` is green (no regression).
