# 184 · Notion's verbs reach core through one contribution — Outcome

## Delivered

### Notion registered in the one integration registry
`packages/core/src/integrations.mjs` registers `@aof/integration-notion/contribution` before Hyperagent, and `aof work integrations notion sync-work` / `associate` reach the command registry through `integrationContributions()`, in the same registration order as before.

### The Notion package composes itself
`createNotionServices` in `packages/integration-notion/src/services.mjs` builds the sidecar mapping, the apply layer, the `ntn` CLI seam and the sync body from collaborators core injects. No core module under `application/bindings/notion/` or `bindings/commands/notion-*` exists.

### One core binding builds every integration's services
`application/bindings/integrations/services.mjs` builds each registered contribution's `services` once per application. It hands the same collaborators to every integration's verbs, and `application.integrations.notion` exposes the built mapping, sync, CLI and sync-work services under its existing keys.
