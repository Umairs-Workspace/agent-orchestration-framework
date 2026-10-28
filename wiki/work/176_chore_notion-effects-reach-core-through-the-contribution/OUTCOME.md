# 176 · Notion's effects, routing and store metadata reach core through the contribution — Outcome

## Delivered

### Integration reactors come from the registry
`application/bindings/effects/table.mjs` builds every registered integration's effects-journal reactors from its contribution's `effects` member. Every integration's `local` reactors run before mesh projection and every `integration` reactor after publication, so Notion's sidecar remap and board sync keep their cascade positions.

### Integration routing comes from the registry
`application/bindings/integrations/routing.mjs` merges each contribution's `routing({ readRouting })` members over the one `.aof/integrations.json` reader, and `application.work.integrations.routing` keeps its keys (`resolveNotionRouting`, `isPageId`, `classifyParent`, `asBoardsRegistry`, `RoutingError`).

### Integration store classification comes from the registry
`effects/stores.mjs` merges each contribution's `storeMetadata` tables and file stores into the one store classification, so `notion-sidecar` stays a `fact` written only by the Notion mapping module.

### The contribution's optional members are one recorded shape
169/ADR-002's amendment records the contribution as `{ id, name, assets?, services?, commands, effects?, routing?, storeMetadata? }`, read generically by core. Hyperagent carries none of the optional members added for Notion.
