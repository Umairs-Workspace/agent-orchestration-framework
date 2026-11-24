# 00 · A workspace selects the file store and exposes its tracking data — Outcome

## Delivered

### A workspace resolves one work-item store from `work.store`
An omitted `work.store` and `"files"` both select the file adapter. Any other value, or a non-string, is refused as `work-store-unsupported`, naming the key and the supported value, before any tracking record is read or written. The store is resolved lazily, once per workspace object, so two workspaces in one process keep separate stores.

### A store snapshot answers item facts as portable rows
A snapshot row carries the ref, type, slug, number, parent, dependencies and live, backlog or archive membership, with an optional repository document home kept apart from the identity. Metadata is read lazily by ref, and a missing field, a missing record and a record fault stay distinguishable. A workspace that supplies its own `workItemStore` is read through it without any tracking directory existing.

## Assumptions

- **Callers that need a legacy `dir` get it only at the compatibility edge** — `readWorkItemView` turns the optional document home into the old `dir` field, so a row with no home has `dir: null`.
