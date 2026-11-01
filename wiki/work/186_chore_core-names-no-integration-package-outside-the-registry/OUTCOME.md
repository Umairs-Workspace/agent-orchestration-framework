# 186 · Core names no integration package outside the registry — Outcome

## Delivered

### The registry is the only core importer of any integration package
`packages/core/src/integrations.mjs` is the only module under `packages/core/src` that imports an `@aof/integration-*` package. FF-16901 (`acd-integration-registry-one-home`) reports any other importer, Notion included, with no named exception.
