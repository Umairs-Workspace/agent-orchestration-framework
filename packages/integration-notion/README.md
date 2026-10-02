# @aof/integration-notion

Private Node.js workspace owning Notion synchronization and its CLI extension.

| Export | Ownership | Supplied collaborators |
|---|---|---|
| `./commands` | Contribution plus sync/associate command factories, schemas, argv and rendering | Sync, routing, work reader, checkout guard, journal and diagnostics |
| `./sync-work` | Milestone traversal, projection and sync orchestration | Work metadata/read services, routing, mapping, apply and launcher |
| `./projection` | Page operation planning | Plain items, configuration and mapping data |
| `./sync` | Page writes, dry-run and deduplication decisions | Sidecar writer; each invocation supplies its spawn function |
| `./mapping` | Multi-board sidecar storage and replay-safe reference remapping | Workspace path policy |
| `./cli` | Auth environment, launcher resolution and argv-based spawning | Tool descriptor lookup and diagnostics |
| `./effects` | Local remapping and conditional integration effects | Workspace loading, mapping and synchronization |

Factories capture their collaborators per instance, without importing assembled core.
`./notion-associate` and `./notion-sync-work` expose the individual command factories
for narrow adapters. Core registers the `./commands` contribution in the existing CLI
order. Old `src/notion/` and command paths are compatibility/service adapters.

Core deliberately registers the local group before mesh projection and the integration
group after it, preserving cascade order. Registration performs no service loading or
external calls. The effect entry remains browser-safe; storage, synchronization and CLI
entries use explicitly owned Node APIs. This workspace has no external npm dependencies.

Shared integration routing, work readers, tool provisioning, diagnostics and the application
journal remain outside this package. The CLI host and shipped skills remain core-owned.

Run `yarn workspace @aof/integration-notion test` for the package tests.

`routing` exports the shared `RoutingError`, board/parent helpers and `createNotionRouting({ readRouting })`. Core supplies the work-owned committed descriptor reader. `store-metadata` declares the Notion sidecar.
