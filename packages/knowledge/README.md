# @aof/knowledge

Owns Graphify binary integration, graph normalization/impact, memory selection and projections,
local indexing/retrieval, Graphify-backed memory, source recovery, imported-document storage and
digest materialization. Its commands are the five graph commands, `work:memory` and `import:milestone`.
Core assembles those descriptors through ordered `createKnowledgeContribution` groups, retaining
the existing command order and the shared `work` namespace.

The pure normalizer, impact analysis, local retrieval and none backend are directly importable.
Configured services are factories:

| API | Application services supplied by core |
| --- | --- |
| `graphify` / `createGraphify` | Managed-binary resolution. The package owns argv, timeout and subprocess behavior. |
| `memory/local-indexing` / `createLocalIndexing` | Work-item reads, reach-through reporting, gitignore policy and imported-document paths/names. |
| `memory/local-backend` / `createLocalBackend` | Configured local index operations. Returns the existing default backend interface. |
| `memory/graphify-backend` / `createGraphifyBackend` | Registered command invocation, workspace loading, shared record building and gitignore policy. |
| `memory` / `createMemory` | Deferred loaders for configured local and Graphify backends. Help and the none backend load neither. |
| `import/source` | Direct source resolution API, including local/injected sources and offline remote previews. |
| `import/store` / `createImportStore` | Workspace paths. The package owns store layout, slugging and nested ignore policy. |
| `import/recovery` / `createImportRecovery` | The configured store's slug helper. Lifecycle vocabulary and heading grammar use public work APIs. |
| `import/materialize` / `createImportMaterializer` | Store operations, the configured digest renderer and work schema version. |
| `commands/import-milestone` / `createImportMilestoneCommand` | Recovery, materialization, slugging and configured memory backend resolution. |
| `commands/*` | Configured graph/memory operations. The serve descriptor receives its MCP transport/probe and workspace loader. |

Factories perform no I/O when constructed. Graphify-backed memory reaches the binary through the
registered graph commands; only the Graphify driver starts that binary. Package dependencies are
contracts, foundation and the work package's public identity/heading helpers. No knowledge module
imports the assembled command registry, legacy root source or private sibling files.

Root compatibility modules currently bind application services. The MCP transport awaits server extraction, and rendered assistant
assets remain core-owned. Final application composition will remove the compatibility modules.

The import command retains its existing behavior: previews write nothing; execution writes a colocated
`AOF.md` and requests memory reindexing. The separate derived-store API remains available for existing
consumers. Conversion into managed work (`migrate:folder`) remains a work concern; it consumes the
same recovery services through application composition.

Run `yarn workspace @aof/knowledge test` for package contracts. Root graph, memory, import, CLI and
architecture suites retain integration coverage through the old APIs. Tests use temporary stores
and supplied collaborators; the package contracts do not invoke a live Graphify binary.
