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

Run `yarn workspace @aof/work test` for the package tests.
