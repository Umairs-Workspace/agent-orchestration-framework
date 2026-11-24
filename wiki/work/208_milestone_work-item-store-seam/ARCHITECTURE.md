---
doc: architecture
---
# 208 · Work item tracking

## ADR-001 · Resolve one WorkItemStore for the workspace

Core resolves `work.store` when loading a workspace and supplies the selected store to its consumers. An omitted key and the string `files` both select the file adapter. An explicit unknown value or a value of the wrong type yields an actionable configuration error naming the key and the supported value, before a tracking operation can write. Keep resolution lazy for commands that do not open a work stream. Two workspaces living in one process retain separate roots and lifetimes.

The interface in `@aof/work` works in terms of work refs and rows. A snapshot exposes ordered item identities and their type, slug, title, status, parent, dependencies, number/order and live, backlog or archive membership. Missing fields and record faults remain distinguishable. Listing, lookup and scoped metadata reads can share a snapshot. A returned item may identify a repository document home, separately from its tracking identity. A caller must be able to exercise the port with an opaque ref and a test double that never opens a tracking file. Keep absolute paths, directory queries and legacy `dir` fields at the file or CLI compatibility boundary. Repo documents, feature files, run records and historical attachments retain their current homes.

The first adapter delegates to the existing discovery and record mechanisms. Preserve workspace-specific digest reuse, lazy metadata reads, missing record semantics and the flat CLI envelopes. Reuse pure vocabulary, ordering and dependency rules. Distinguish those rules from file access by inspecting the imported symbol and its implementation. Preserve existing exported entry points needed by callers through compatibility facades that resolve the store. Production code must receive its workspace store even when a legacy entry point defaults to files for a legacy caller.


| Operation family | Inputs and result at the boundary |
|---|---|
| Read | Open a workspace snapshot and list, find or read by logical ref against it. Return rows, optional parent/document home, ordered dependencies and explicit missing/fault information. A caller may share a snapshot across those reads. |
| Guarded lifecycle | Ref, destination, optional expected states and clock. Return the applied transition or the existing coded refusal. The separate rollback operation retains its narrower predicate. |
| Placement | Accept the verb's semantic arguments (item/ref, parent, slot, dependencies, confirmation or preview). Return the existing move/shift/remap outcome or refusal. Preserve the document home and attached evidence alongside the tracking change. |
| Observation | Obtain the current opaque token and retain or release workspace observations. A change makes the next read eligible for refresh. No event delivery order or exactly-once notification is required. |

### Diagram

Show where a CLI or mesh consumer obtains its workspace store, which side owns tracking files, and where repository documents and cached rows enter the read path. The separate cache and document flows explain why the tracking store cannot replace either one.

## ADR-002 · Put identity-changing operations behind the same store as guarded status

The status operation takes an item ref, target word and the existing optional expected source state or states. The file adapter checks the current record at the mutation boundary, applies the correct lifecycle and preserves the existing error codes, status-line edit, date handling and separate bounded rollback semantics. The status command keeps its acceptance checks, item locks and event effects. A stale precondition, an unusable record and an illegal edge retain their distinct diagnostics. Keep the guarded writer at `packages/work/src/records.mjs:229` as the initial implementation.

Use operation-level methods for promote, insert, archive and renumber, including their existing previews, confirmation checks, ref remaps and refusal paths. The same boundary covers initialization of tracking fields, migration and prototype creation. The adapter owns the storage-specific planning and application of a move, including coordinated document-home moves and reference repairs. The application retains the current ordering of locks, journal events and projection updates. Reuse the shipped move implementations and rollback paths. Recomputing identity strings or issuing a series of generic field setters at the command face would lose their collision and no-write guarantees.

## ADR-003 · Keep read authority and change observation explicit

The work reader still composes local tracking rows with the existing global projection. Preserve local versus reported-elsewhere provenance, missing checkout degradation, the worktree exclusions and cache-only refs. Both local reads in `packages/work/src/read.mjs:213` and own-workspace publication in `packages/core/src/application/bindings/global-work-store.mjs:10` use the workspace store. SQLite remains the mesh projection. Document bodies and historical evidence continue to be read through their document services.

Expose an opaque change token and a disposable change observation handle. The consumer may compare tokens for equality and request a fresh snapshot. It may not parse a stat tuple or require a file event. A notification invalidates a prior observation and can coalesce several changes. The file adapter retains the existing watch, dirty state, digest safety walk and watcher cleanup. A failed watch falls back to refresh on the existing schedule. A polling test double returning a new token must reach the same publish path without a filesystem event. Disposing one workspace releases its observation and leaves other active workspaces operational. Preserve the existing dirty-only fast path, shared read and retry semantics in `packages/work/src/discovery.mjs:335` and the launcher's workspace retention lifecycle.

## ADR-004 · Enforce the boundary and compare to the accepted oracle

Scan production packages and app entry points in the registered architecture suite. Resolve relative imports, package exports, re-exports and namespace member access to the owning file or symbol. Permit adapter implementation modules and explicit, justified compatibility delegators. Pure identity vocabulary and document-only reads stay usable. Include a detector for reimplemented tracking reads and writes at known seams, such as enumerating item directories or extracting status frontmatter. A package-wide exception would hide the internal callers this migration must catch. Record the offending caller and operation on failure.

Exercise the selected store through the real work verbs. Run all four milestone 205 lanes in comparison mode against their accepted files. Exercise both default and explicit file selection. An injected recording or polling test double proves routing where identical file output alone could mask a bypass. The oracle remains the 150 captures delivered by milestone 205. A persistent second provider belongs to 209.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-20801 | Production item tracking reaches the selected workspace store. Storage-specific item discovery, field mutation and file watches have a file-adapter owner. | `test/arch/work/acd-work-item-store-boundary.test.mjs` | ADR-001, ADR-002, ADR-003, ADR-004 |

Register the control in `test/arch/work/index.mjs`. Its negative fixtures must fail on a launcher importing the file digest and a command reading status through a re-export. Include a positive control reading a SPEC body through its document home. At build, record the observed failing path and diagnostic in VERIFICATION.md, then the green run after removing the planted bypass.

Architecture recall `44ef2e6e-cf77-4d4f-8eb1-9dcf5cdafcec` informed the symbol-level boundary, the distinction between records and independent loop documents, the upgrade dependency direction, and preservation of the mesh authority and provenance decisions.

## Breakdown rationale

The code-only graph built on 2026-11-23 at 21:22:40 UTC contains 22,641 nodes and 49,941 edges with zero egress. Impact reports 48 direct dependents of discovery and 29 of records. Core’s read binding is a direct dependent of the work reader. Separate effect bindings consume item and stream transitions. Both the mesh publisher and launcher consume discovery and have separate core bindings. These edges place authority selection first, then query, lifecycle, placement and mesh migrations, followed by enforcement and replay. Shared adapter composition and core assembly paths are declared in the participating stories so the wave planner can serialize their edits.
