# 05 · Memory status reports conformance and layers — Outcome

## Delivered

### Status names every record type's layer
`aof work memory status`, on both backends, lists every record type with its count and the layer it serves from `RECORD_TYPE_LAYERS`, the one partition of record types: semantic holds adr, capability, gap and summary, and procedural holds lesson. A type missing from the map is counted as `unmapped` and is still listed. The type counts sum to `recordCount` (FF-14803).

- **Status reads every record** — the seam composes it from one unbounded recall, which on graphify also loads the graph for re-ranking (ADR-004).

### Status reports vocabulary conformance
`status` reports blank and non-enum counts for Kind, Area and Stage over lessons, blank Owner, and non-enum gap status. Every count is nested, so `status` gains no top-level number.

### The block line shows tags
A tagged record's `--block` line carries `[t1; t2]` between its title and its source. An untagged line is byte-identical to the line before this story.

## Gaps

### The episodic layer
- **Status:** open
- **Discharge condition:** `episodic-memory-is-recallable` adds its record types to `RECORD_TYPE_LAYERS`.
`status` reports the episodic layer, and no record type maps to it, so its count is always 0.
