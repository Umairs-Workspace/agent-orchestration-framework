# 04 · Mesh refresh and publication observe the selected store — Outcome

## Delivered

### Mesh publication refreshes on the store's opaque change token
The publisher and launcher compare each workspace store's token and read a fresh snapshot only when it changes. An unchanged token reuses the existing snapshot, and a new token also releases the permanent-fault backoff. A store that polls and has no file watcher reaches publication in the same way.

### Each workspace's observation has its own lifetime
Releasing one workspace closes only its observation. Shutdown waits for an observation that is still opening and disposes of it once. The file adapter keeps its own watches, dirty-only fast path and failed-watch fallback to scheduled refresh.

### An item with no document home is reported, not invented
A selected item whose document home is missing is published as a fault, with no row or path made up for it.
