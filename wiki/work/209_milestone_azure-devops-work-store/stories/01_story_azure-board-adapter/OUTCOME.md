# 01 · An Azure project supplies the mapped reads and guarded writes — Outcome

## Delivered

### An opt-in Azure DevOps board definition ships under `.aof/boards/azure-devops/`
`board.yaml`, `adapter.mjs`, `http.mjs` and a setup guide. The guide covers an inherited Agile process: the reused and custom types, the five governed states including Blocked, Prototype's four states, the `Custom.AofRef`, `Custom.AofKey` and `Custom.AofMembership` fields, the `StackRank` order, and the hierarchy and dependency links.

### The adapter checks the project before it reads or writes
Once per adapter, it checks the project's process, the area, each mapped type's states and fields, and the relation types. A mismatch names the type, state or field, and no board write is made.

### Reads hydrate the whole area across batches
Paged WIQL ID queries are followed by `workitemsbatch` detail. Relations and ranks survive across batches, a targeted read accounts for every missing ID, and an unmapped board state faults the affected record.

### Writes are guarded per item
Each update is a JSON-patch carrying a revision test. A stale one is refused by Azure (412) and reported for that item alone. A lost create acknowledgement keeps the caller's correlation key, and an upload is acknowledged only once its item relation is verified.

### The revisions feed is the board's change source
`reporting/workitemrevisions` is read from its continuation token on a five-second cadence. An expired or unusable cursor reports lost coverage rather than a quiet board.

### Sign-in goes through `az`
The adapter mints its token in-process with `az account get-access-token` and sends it with the personal-account pass-through header. It reuses the token until it expires and never writes it to diagnostics.

## Assumptions

- **Recorded transport**: every behaviour above was proved against recorded HTTP in the response shapes spike 206 measured. Evidence from a live project belongs to 209/05's live run.
