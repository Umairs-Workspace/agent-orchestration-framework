# 01 · Readers retain the same answers and source attribution — Outcome

## Delivered

### Work reads and diagnostics answer from the selected store
`find`, `list`, `doc`, `next`, diagram planning, `validate`, `doctor`, counters, audit, observe, memory accounting and tuning take item identity and metadata from the workspace's store. Repository documents and evidence are still read from each item's document home.

### Local and reported-elsewhere provenance is unchanged
The work reader still combines local rows with the mesh projection: a checkout's own newer status wins with local provenance, a remote-only row stays visible without a local home, and archived items resolve by `find` while staying out of the default listing.

### Doctor opens each tracking record once
Doctor reuses the body the file store has already read. With a store that supplies no body, doctor reads the repository document itself.
