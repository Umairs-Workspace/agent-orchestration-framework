---
type: chore
number: 185
slug: notion-effects-reach-core-through-the-contribution
title: "Notion's effects, routing and store metadata reach core through the contribution"
status: done
owner: developer
created: 2026-10-23
updated: 2026-10-28
depends: [184]
schema: 1
aofVersion: 0.1.0
---
# 185 · Notion's effects, routing and store metadata reach core through the contribution

## Intent

The rest of Notion's core footprint is its effects-journal handlers, its board routing and its
file-store classification. Three core modules import these directly. The contribution can carry
CLI verbs and bundle assets only (169/ADR-002), so it must widen to carry them too. Then core reads
every integration's effects, routing and store metadata from the registry.

## Definition of Done

- [x] The contribution object gains the members Notion needs, for example `effects`, `routing` and
      `storeMetadata`. The shape is recorded where 169/ADR-002 is cited, with Hyperagent carrying none.
- [x] `bindings/effects/table.mjs` builds integration effects from the registry, not from
      `createNotionEffects`.
- [x] `bindings/integrations/routing.mjs` takes integration routing from the registry, not from
      `createNotionRouting`.
- [x] `effects/stores.mjs` takes each integration's store classification from the registry, not from
      `@aof/integration-notion/store-metadata`.
- [x] Notion sync still rides the effects journal: 164's FF-16403 and the Notion sync suites are green.
- [x] `aof work validate` is green (no regression).

## Notes

- `effects/stores.mjs` sits below the application layer. Check that reading the registry there does
  not invert a layering control (`acd-command-layer-imports-downward`). If it would, inject the
  classification upward instead.

## Resolution

- The Notion contribution gained `effects(provide)`, `routing({ readRouting })` and
  `storeMetadata: { fileStores }`. The shape is recorded as an amendment under 169/ADR-002.
  Hyperagent carries none of them.
- `bindings/effects/table.mjs` builds every registered integration's reactors from the registry.
  Locals run before mesh and integration reactors after it, so the cascade order is unchanged.
  `provide` hands each integration `{ loadWorkspace, own }`, resolved only when a reactor runs.
- `bindings/integrations/routing.mjs` merges each integration's routing members over the one
  descriptor reader. `application.work.integrations.routing` keeps its keys.
- `effects/stores.mjs` merges each integration's `storeMetadata`. Layering check: `integrations.mjs`
  reaches no module in core's command layer, so reading the registry here inverts nothing
  (`acd-command-layer-imports-downward` is green). No upward injection was needed.
- The effects-registration closure test now forbids core's composition binding
  (`bindings/integrations/services.mjs`) in place of the deleted `bindings/notion/sync-work.mjs`.
- Verified: 164's FF-16403 (`acd-sync-rides-the-effects-journal`), the store arch suite, the Notion arch and behaviour suites, the
  `effects-ledger` integration feature and the reindex cascade are green.
