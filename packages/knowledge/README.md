# @aof/knowledge

Owns Graphify binary integration, graph normalization/impact, memory selection and projections,
local indexing/retrieval, Graphify-backed memory, source recovery, imported-document storage and
digest materialization. Its commands are the five graph commands, `memory`, its alias `work:memory`, and `import:milestone`.
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
| `graphify-code-backend` / `createGraphifyCodeBackend` | The graphify driver and normalizer services, git and the nested-ignore writer. Returns the engine backend that serves `code` (ingest, relations, status) behind the port (179/ADR-002). |
| `commands/*` | Configured graph/memory operations. The serve descriptor receives its MCP transport/probe and workspace loader. |

`memory-config` / `readMemoryConfig(config)` is the memory node's one reader (180/ADR-001). It takes
the root config and answers `{ corpora, corporaSource, graph, backends, paths, legacy }` in the new
shape — `memory.corpora`, `memory.graph.share` / `memory.graph.remote` and
`memory.backends.graphify.extractionBackend` — reading the old spellings (`memory.sources`,
`memory.graphify`, a root `graph`, which `aof work update` rewrites) for one release and listing each in `legacy`. A setting spelled both
ways is refused with `memory-config-conflict`. `rewriteLegacyMemoryConfig(config)` returns the
rewritten config with its `moves` and `conflicts`, and `LEGACY_MEMORY_KEYS` is the one old-to-new
table both use. `replaceMemoryNode(config, node)` swaps the node in and drops the root `graph` it
supersedes, for the config editor's Memory save. It imports only the error contract and the corpus vocabulary. `memory.backend` is not
read there: `selectBackendName` stays its one reader.

Factories perform no I/O when constructed. Graphify-backed memory reaches the binary through the
registered graph commands; only the Graphify driver starts that binary. Package dependencies are
contracts, foundation and the work package's public identity/heading helpers. No knowledge module
imports the assembled command registry, legacy root source or private sibling files.

## The knowledge-engine port

`engine` / `createKnowledgeEngine({ backends })` is the one contract in front of every knowledge
backend (179/ADR-001). It is a pure router: it imports nothing, and faces compose it over the
backends they hold through core's `knowledge-engine` binding. The port answers exactly four verbs:

| Verb | Asks |
| --- | --- |
| `ingest(corpus, input, ctx)` | the named corpus |
| `recall(query, scope, opts, ctx)` | the record corpora, through `work` |
| `relations(paths, ctx)` | the `code` corpus |
| `status(corpus, ctx)` | the named corpus; with no corpus, every declared corpus keyed by name |

The vocabularies are frozen: `KNOWLEDGE_CORPORA` is `work`, `code`, `operator` and `imports`, and
`ENGINE_VERBS` is the four verbs above.

**The declaration.** Every backend exports `corpora`, a map from a corpus to the verbs it serves for
it, for example `{ code: ["ingest", "relations", "status"] }`. `RECORD_CORPORA` is the declaration
every record backend shares. Construction refuses, with a `TypeError` naming the backend and the
entry, a corpus or verb outside the vocabulary, a declared verb with no method, and a pair another
backend already serves (FF-17901). A record backend keeps 05/ADR-003's methods: its `ingest` is
`reindex(input.only ?? null, ctx)` and its `status` is `status(ctx)`. An engine backend names its
methods by the port's verbs.

**The miss.** A verb asked of a corpus no backend declared answers
`{ served: false, code: "corpus-unserved", corpus, verb, backends }` and calls no backend. It is a
fact to act on, never a throw and never a fallback to a backend that did not offer the pair.

Root compatibility modules currently bind application services. The MCP transport awaits server extraction, and rendered assistant
assets remain core-owned. Final application composition will remove the compatibility modules.

The import command retains its existing behavior: previews write nothing; execution writes a colocated
`AOF.md` and requests memory reindexing. The separate derived-store API remains available for existing
consumers. Conversion into managed work (`migrate:folder`) remains a work concern; it consumes the
same recovery services through application composition.

Run `yarn workspace @aof/knowledge test` for package contracts. Root graph, memory, import, CLI and
architecture suites retain integration coverage through the old APIs. Tests use temporary stores
and supplied collaborators; the package contracts do not invoke a live Graphify binary.
