---
type: chore
number:
slug: notion-effects-reach-core-through-the-contribution
title: "Notion's effects, routing and store metadata reach core through the contribution"
status: not-started
owner: developer
created: 2026-10-23
updated: 2026-10-23
depends: [notion-verbs-reach-core-through-one-contribution]
schema: 1
aofVersion: 0.1.0
---
# Notion's effects, routing and store metadata reach core through the contribution

## Intent

The rest of Notion's core footprint is its effects-journal handlers, its board routing and its
file-store classification. Three core modules import these directly. The contribution can carry
CLI verbs and bundle assets only (169/ADR-002), so it must widen to carry them too. Then core reads
every integration's effects, routing and store metadata from the registry.

## Definition of Done

- [ ] The contribution object gains the members Notion needs, for example `effects`, `routing` and
      `storeMetadata`. The shape is recorded where 169/ADR-002 is cited, with Hyperagent carrying none.
- [ ] `bindings/effects/table.mjs` builds integration effects from the registry, not from
      `createNotionEffects`.
- [ ] `bindings/integrations/routing.mjs` takes integration routing from the registry, not from
      `createNotionRouting`.
- [ ] `effects/stores.mjs` takes each integration's store classification from the registry, not from
      `@aof/integration-notion/store-metadata`.
- [ ] Notion sync still rides the effects journal: 164's FF-16403 and the Notion sync suites are green.
- [ ] `aof work validate` is green (no regression).

## Notes

- `effects/stores.mjs` sits below the application layer. Check that reading the registry there does
  not invert a layering control (`acd-command-layer-imports-downward`). If it would, inject the
  classification upward instead.
