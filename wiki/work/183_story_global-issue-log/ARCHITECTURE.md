# Architecture — 183

## ADR-001: Local global issue records
Accepted 2026-10-31. The core owns issues:log, issues:list and issues:remove because issue capture is available without a workspace. All routes use the existing command registry and workspace:false. The global home resolver remains the authority for AOF_GLOBAL_HOME and ~/.aof.

Records live at <global-home>/issues/<id>.json, schema version 1, with summary, optional details, createdAt and cwd. They are local operator notes, separate from the mesh work projection and the work stream; no automatic sync or memory ingestion occurs. Listing is newest first with ID as tie-breaker. Removal unlinks one validated ID only. Invalid input and corrupt records produce coded errors.

Each log writes a private pending file then publishes with an exclusive hard link. Readers ignore pending files. Concurrent processes cannot overwrite a published record or observe half a JSON document; no shared index or new dependency is needed. Interrupted writes may leave ignored pending files. The global home must support hard links (standard local NTFS and Unix filesystems do); a publication error is reported, never silently downgraded to unsafe writes.

The store module owns disk access; the command module owns schemas, adapters and presentation. Directory budgets grow by exactly one core root module, one core command module and one store suite, with zero allowance. The store suite covers this new durable store and its actual CLI rather than extending an unrelated cache suite. All tests use isolated temporary global homes (164/R1).

The frozen command descriptor fixture and registration counts include all three verbs; the pre-existing omitted work:renumber descriptor is restored at the same integration boundary. Shared command-spine BDD scenarios reuse the existing grammar and require no new test family.
