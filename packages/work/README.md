# @aof/work

Private workspace for work-domain behavior.

| Export | Responsibility |
| --- | --- |
| `@aof/work/lifecycle` | Status vocabulary, legal edges, acceptance horizon and epoch boundary. Zero imports; browser-safe. |
| `@aof/work/records` | Record document selection, frontmatter parsing, metadata overlays, schema/version reads, guarded status writes and frontmatter transforms. |
| `@aof/work/identity` | Folder grammars, backlog/archive root names, numeric identity comparison and story-span parsing. Zero imports; browser-safe. |
| `@aof/work/discovery` | Directory enumeration, ref/slug lookup, live-row classification and ordered listing. |
| `@aof/work/dependencies` | Dependency target rules, sibling gates/grouping and formatting-preserving dependency rewrites. Browser-safe; imports only identity. |
| `@aof/work/readiness` | Ordered next-work/ready-set selection, dependency blockers and supplied candidacy handling. |
| `@aof/work/validation` | Record, dependency-graph and feature-contract validation with a caller-supplied digest contract. |
| `@aof/work/feature-parse` | Pure Gherkin parser, including partial parse findings and example tables. |
| `@aof/work/digest` | Pure template parsing, digest rendering and shape validation over an explicit contract. |
| `@aof/work/effects` | `createWorkEffects(getServices)` contributes status advancement, bounded rollback, run-reference remapping and ruling evidence. |
| `@aof/work/acceptor/rule`, `ledger`, `admissibility` | Pure acceptance rules, evidence arithmetic and admissibility decisions. |
| `@aof/work/acceptor/criterion` | `createAcceptorCriterion` owns criterion identity, epoch selection and guarded revisions with supplied frozen-asset readers. |
| `@aof/work/acceptor/store` | `createAcceptorStore` owns ledger persistence and surgical configuration writes using the supplied ledger path. |
| `@aof/work/acceptor/observations` | `createAcceptorObservations` owns observation classification and census, using supplied journal reads and dispatch-path policy. |
| `@aof/work/audit/reads` | Pure audit read/limit records and declaration checks. |
| `@aof/work/declared-id`, `audit/controls` | Declaration grammar, fitness-register readers and pure doctor controls. |
| `@aof/work/audit/hook-wiring` | Read-only hook duplication checks. |
| `@aof/work/audit/census`, `audit/evidence` | Audit census and evidence factories with supplied bounded execution and installed-program locations. |
| `@aof/work/audit/prompt-layer` | Prompt audit factory using supplied runtime/resource vocabulary. |
| `@aof/work/audit/declared-bounds` | Bounds comparison factory using supplied reference data and configuration resolvers. |
| `@aof/work/audit/seam-liveness` | Seam audit factory using supplied graph readers and test-root declarations. |
| `@aof/work/audit/report` | Report assembly factory using supplied lane services and work-graph checks. |
| `@aof/work/ref-scope`, `story-contract`, `cited-path-resolve` | Shared work scope, declared contract paths and citation/rename resolution. |
| `@aof/work/grade` | Pure report normalization, grade compilation and bounded failure payloads. |
| `@aof/work/diagrams/layout` | Diagram names, paths and link grammar. |
| `@aof/work/doctor` | `createWorkDoctor` owns snapshot reads and check orchestration; core supplies execution projection, run reads and the configured diagram check. |
| `@aof/work/doctor/*` | Coherence, freshness, budgets, identity, rubric, execution-record, dependency and loop-ready checks. `createDoctorDiagrams` receives diagram configuration policy. |
| `@aof/work/counters` | Pure work and execution counters over supplied records. |
| `@aof/work/tune/formation`, `provenance`, `distance` | Candidate formation, citation resolution and distance calculations. |
| `@aof/work/tune/proposal` | `createTuneProposals` shapes proposals using the supplied model-map policy and asset path. |
| `@aof/work/tune/corpus` | `createTuneCorpus` joins work records with supplied retrospective, execution, observation and graph readers. |
| `@aof/work/commands/tune` | `createTuneCommand` contributes the tune descriptor and report builder; core supplies corpus, proposal, graph and registry collaborators. |
| `@aof/work/archive` | Verbatim archive moves, crossing-link rewrites and moved-ref enumeration. |
| `@aof/work/reindex` | Insert shift selection, ref remaps and surgical frontmatter updates. |
| `@aof/work/upgrade` | `createWorkUpgrade` supplies schema migration planning, application and changelog rendering using core's installed-version resolver. |
| `@aof/work/promote/chore-seed`, `promote/promotion` | Chore content seeding, back-references, append positioning and idempotence scans. |
| `@aof/work/commands/promote-gap-to-chore` | `createPromoteGapCommand` contributes gap promotion with supplied insertion flags and operation. |
| `@aof/work/commands/promote-finding-to-chore` | `createPromoteFindingCommand` contributes finding promotion with supplied insertion and cache-read operations. |
| `@aof/work/insertion/scaffold` | `createWorkInsertion` owns template scaffolding, insertion flags/count gates and nested story insertion with supplied version and stream-transition policies. |
| `@aof/work/commands/promote` | `createPromoteCommand` owns backlog promotion, number stamping, dependency rewrites and the top-level insertion alias with supplied scaffold/transition services. |
| `@aof/work/commands/insert-chore`, `insert-milestone`, `insert-story`, `insert-uat` | Command factories contribute the four insertion descriptors using the composed insertion services. |

Doctor checks import pure shared predicates directly rather than importing the snapshot reader.
The work package depends on contracts for error envelopes and claim provenance; it does not import
work-graph or execution. Core composes those collaborators, avoiding a cycle with work-graph's
dependency on work records. Legacy source paths remain transitional adapters.

Records take concrete item descriptors (`ref`, `dir`, `type`) and use
`@aof/foundation/fs` for atomic writes. They do not discover workspaces, load
configuration, consult mesh projections or emit effects. Status policy belongs to
the lifecycle module; the command/transition layer still owns effect publication.
`readItemMeta(item, view)` accepts an optional caller-supplied metadata overlay.
`coerceSchemaVersion(raw)` is shared with validation and preserves future versions.

Discovery takes an explicit work directory and an optional `{ items, meta }` view.
`listItems` derives identity from folders without opening record documents; `findWork`
and `listStream` enrich those identities through the record API. Views replace the
directory scan and can carry remote rows with no local path. Discovery owns no cache
store or workspace configuration. `readWorkDirectory` is the tolerant directory reader
also used by the transitional core validator when inspecting an item's task folder.

Readiness takes an explicit work directory and optional `{ view, candidacyView,
throughReview }` options. The caller supplies routing/lease decisions as a map;
the package neither reads mesh state nor claims work. A complete view can supply
pathless rows. Without a view it uses the package's discovery and record readers.
Dependency rules share the same numeric grammar with validation and rewriting;
their text transforms return strings and perform no writes.

`validateWork(workDir, config, scope, { getDigestContract })` uses configuration as
data and reads records without loading a workspace. Digest records require the
supplied contract getter; other records never call it. Missing a getter fails
explicitly instead of skipping digest checks. Core owns template location and
version policy; `renderDigestDocument` takes `{ contract, schemaVersion, aofVersion }`.

The existing `src/work.mjs` and `src/acceptance-horizon.mjs` exports forward to these
implementations. Record formats, error codes and the existing status/rollback
write bounds are unchanged.

Registration is inert. Handlers await the supplied service provider when invoked;
the package imports neither core nor a journal singleton. Core currently supplies
workspace configuration/identity loading and application composition from `src/`,
alongside the extracted execution and work APIs. Acceptance services receive frozen
asset readers, the ledger path, journal reads and mesh dispatch-path policy explicitly.
They do not import core, mesh or the journal singleton. Observation composition calls
the supplied pure slug function to derive its prefix; journal reads happen on demand.
Core's digest adapter supplies the shipped template and product version. The CLI
remains part of core.

Audit composition performs no I/O. `createAuditCensus` and `createAuditEvidence` receive
`runBounded`, its default deadline and the installed-program locator; evidence also receives
attempted-command formatting. Programs resolve from the installed toolkit while their subjects
and working directories resolve from the audited project. `createAuditPromptLayer`,
`createAuditDeclaredBounds` and `createAuditSeamLiveness` receive their vocabulary, reference/bounds
and graph collaborators. `createAuditReport` joins the supplied lanes and graph checks. Work owns
the audit algorithms without importing core, execution or work-graph. In particular, injecting
graph checks avoids a cycle with work-graph's existing dependency on work records.

Run `yarn workspace @aof/work test` for the package tests.

Tuning construction performs no reads. Corpus assembly preserves each source's locator and
declared read contract. Proposal policy is supplied explicitly, keeping assistant assets in core.
The tune command requests the registry only when proposals need an acceptor verdict; it invokes
the shared acceptor in report-only mode. Work neither imports the application registry nor owns
a second acceptance rule. Core's legacy paths remain composition adapters during migration.

Mutation engines take an explicit work directory. Archive and reindex import only work-owned
readers and their filesystem primitives; command policy and effect publication remain outside
these engines. Upgrade invokes the supplied version resolver only when applying a pending stamp.
Planning is read-only, current records are unchanged, and newer schemas still refuse the whole run.

Promotion commands share one content seed and one idempotence/append engine. Structural placement
and existing-chore scans read the local work tree. Finding resolution uses the supplied cache reader;
core binds it to the existing shared read service. Both commands call the supplied insertion operation,
whose work-owned implementation uses the supplied stream-transition policy. Constructing either command performs
no reads or writes, and the promotion engine imports no command module.

Insertion reads templates from the explicit workspace's asset directory and obtains installed-version
policy from core. It validates and counts before calling the supplied stream transition; that transition
retains locking, ref remapping and effect publication. Work owns the subsequent scaffold, move, number
stamp and dependency rewrite. The four insert descriptors remain thin callers of those shared services.

`createWorkContribution(commands)` registers the package's 37 work and testing operations under
`@aof/work`. Core supplies configured descriptors in ordered groups, preserving the existing command
list. The contribution preserves descriptor identity and rejects operations owned by other packages;
the shared registry detects duplicate IDs and routes. Other packages can extend the `work` namespace.
