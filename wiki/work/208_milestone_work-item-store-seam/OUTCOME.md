# 208 · Work items are read and written through one store interface, with today's files as its first store — Outcome

## Delivered

### Item tracking has one interface, and files is its only implementation
Every production read, status move, placement and change observation of item tracking goes through the workspace's `WorkItemStore`: `snapshot` for reads and its change token, `mutate` for status, rollback and placement operations, and a disposable observation. The file adapter under `packages/work/src/store/` is the only code that touches the tracking files (m208/00, m208/02, m208/03, m208/04).

### A second store can be added without touching a consumer
The CLI, the application bindings, the mesh launcher and publisher, dispatch and worker execution, and Notion sync all obtain the store from the workspace. Injected stores with no tracking directory are driven through the real assembled commands for reads, lifecycle, placement and polling observation (m208/01, m208/02, m208/03, m208/04).

### Behaviour under the file store is the 205 baseline, and FF-20801 holds the boundary
All 150 accepted 205 captures replay unchanged with `work.store` omitted and set to `files`. FF-20801 fails any new production code that tracks items around the store (m208/05).

## Assumptions

- **The store interface covers what 209 needs** — it is proven only by the file adapter and by test doubles. Azure DevOps (209) is the first store that will exercise its shape against a real remote tracker.
- **Documents stay in the repository** — SPEC, ADRs, `.feature` contracts, VERIFICATION and evidence are read from each item's document home whatever the store. A store that gives an item no document home has no documents.

## Gaps

### A tracking store other than files
- **Status:** open
- **Discharge condition:** a second production adapter selected through `work.store` passes the four 205 lanes through the real verbs (milestone 209).
`work.store` accepts only `files`. Any other value is refused as `work-store-unsupported`.

### ADR-001's diagram
- **Status:** open
- **Discharge condition:** `aof:add-diagram 208 ADR-001` draws it once the configured diagram generator is available in this checkout.
ARCHITECTURE.md carries ADR-001's diagram brief and interface table, but no picture. Refinement recorded `diagram-generator-missing`.
