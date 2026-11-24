# 05 · A registered control guards tracking and every 205 capture still matches — Outcome

## Delivered

### FF-20801 fails new code that tracks items around the store
The registered architecture suite resolves each production call through imports, re-exports, aliases and namespace access. It fails the build on a file-layer tracking operation outside the file adapter, or on a hand-rolled status read, status write or item-folder enumeration, naming the file, line and operation. Reading a document's body is allowed.

### The 205 work-verb baselines replay under both selections
The golden index runs all 150 accepted captures once with `work.store` omitted and once with `files`, against unchanged baseline files.

### Notion sync and run context read tracking through the store
Notion's tracked-metadata reads and the runtime tracking context used by dispatch and worker execution take item facts from the selected store.

## Assumptions

- **The admitted exceptions stay narrow** — FF-20801 names its file-adapter modules, its file-engine command factories and six manual-read exceptions, each with a stated reason. A new exception is a reviewed change to the control.
