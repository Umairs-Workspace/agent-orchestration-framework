---
doc: state
---
# 208 · Work item store seam

## Progress

- 2026-11-23 — Refined in solo mode: ADR-001 to ADR-004, FF-20801, six stories with example maps and task contracts. Milestone 205's four accepted lanes are the file-store oracle.
- 2026-11-24 — `aof:continue 208`, solo. The first attempt stalled in full-suite verification and was abandoned (R2). The resumed build took 208/00 to 208/05 to built and self-reviewed, each on a green whole-tree gate in a detached snapshot.
- 2026-11-24 — `aof:verify 208`: the story lanes are green, FF-20801 was red-probed, and all six stories were accepted at `d4b12bfa`. The milestone gate result is in VERIFICATION, Accept decision.

## Closure record

Compacted at verify, 2026-11-24. The build-time notes as they stood, including every story's gate rounds and log paths, are in this milestone's verify commit `d4b12bfa`.

- **Durable decisions** are ADR-001 to ADR-004 (ARCHITECTURE). These were settled during the build and stay as recorded:
  - `work.store` is resolved lazily per workspace object, and the schema admits only `files`.
  - Run-driven moves carry a separate runtime tracking context, so replay resolves the event's own workspace.
  - Archive and renumber load only at mutation, which lowered the `work find` module ceiling to 763.
  - FF-20801 names its admitted file-engine factories and six manual-read exceptions, each with a reason.
- **Carried to 209:** the interface is proven only by the file adapter and by test doubles. 209 adds the first production store, selected by a YAML definition under `.aof/` that may reference adapter code beside it. The manifest schema and its execution are 209's.
- **ADR-001's diagram** was not drawn (`diagram-generator-missing`). It is recorded as an open gap in OUTCOME.

## Feedback (for retro)

Archived at verify. Its lessons graduated into `RETROSPECTIVE.md` (208 R1 and R2). No story surfaced a lesson of its own.
