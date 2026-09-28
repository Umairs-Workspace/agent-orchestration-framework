# @aof/work

Private workspace for work-domain behavior.

| Export | Responsibility |
| --- | --- |
| `@aof/work/lifecycle` | Status vocabulary, legal edges, acceptance horizon and epoch boundary. Zero imports; browser-safe. |
| `@aof/work/records` | Record document selection, frontmatter parsing, metadata overlays, schema/version reads, guarded status writes and frontmatter transforms. |
| `@aof/work/identity` | Folder grammars, backlog/archive root names, numeric identity comparison and story-span parsing. Zero imports; browser-safe. |
| `@aof/work/discovery` | Directory enumeration, ref/slug lookup, live-row classification and ordered listing. |
| `@aof/work/effects` | `createWorkEffects(getServices)` contributes status advancement, bounded rollback, run-reference remapping and ruling evidence. |

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

The existing `src/work.mjs` and `src/acceptance-horizon.mjs` exports forward to these
implementations. Record formats, error codes and the existing status/rollback
write bounds are unchanged.

Registration is inert. Handlers await the supplied service provider when invoked;
the package imports neither core nor a journal singleton. Core currently supplies
workspace configuration/identity loading, run-record writing and acceptor writing from
`src/`, alongside the extracted record and discovery APIs. Validation and readiness
also remain in core for now. The CLI remains part of core.

Run `yarn workspace @aof/work test` for the package tests.
