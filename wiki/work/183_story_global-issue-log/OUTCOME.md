# 183 · Global issue log — Outcome

## Delivered

### Local issue capture
AOF provides issues log, issues list and issues remove from any directory, storing timestamped issue records with origin and optional details in the configured global AOF home.

## Assumptions

- **Local filesystem** — the global home supports hard links for atomic exclusive publication (verified on Windows NTFS); unsupported filesystems return the underlying write error.
- **Local notes** — issue records are neither mesh work items nor automatically indexed memory records.
