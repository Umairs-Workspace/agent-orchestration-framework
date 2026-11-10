# 01 · Recall the operator's local auto-memory beside work-stream lessons — Outcome

## Delivered

### Opt-in operator auto-memory source
`memory.sources: ["claude-auto-memory"]` makes the next whole-stream ingest add the selected project's Claude auto-memory entries to the index; an absent or empty setting indexes exactly the work stream, with no external read.

### Operator lessons from feedback and project entries
Each `feedback` or `project` entry becomes one read-only `lesson` (`owner` operator, `near-miss`, source type kept as a tag, whole body searchable, locator is the entry's own path), while `user`, `reference`, `MEMORY.md` and malformed entries are skipped with a named diagnostic that never reveals contents.

### Separate, rebuild-faithful recall
Operator and repository records of the same fact both appear, each citing its own source; edits, deletions and disabling are reflected on the next full rebuild, a scoped rebuild stays work-item-only, and neither graph extraction nor mesh transport ever sees the entries.

## Assumptions

- **The entries exist only on the node that holds the Claude home** — knowledge a worker or another machine needs has to be promoted into the repository.

## Gaps

### Deduplication between operator and repository lessons
- **Status:** open-by-decision
- **Discharge condition:** a milestone that decides operator and repository records of one fact should collapse into a single recall result.
A known duplicate stays visible twice; no matching or merge exists.
