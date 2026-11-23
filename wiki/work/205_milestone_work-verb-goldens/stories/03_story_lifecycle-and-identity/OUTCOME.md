# 03 · Archive, status and renumber preserve mutations and refusals — Outcome

## Delivered

### Archive, status and renumber are held to their full stream change

The `work-stream-life` lane runs 22 cases as 38 scenarios. It holds `archive` (one item, `--done`, nested and governed items, links that cross the move), `status` (each lifecycle's legal and refused moves, prototypes included, and the regression-gate refusal) and `renumber` (a parent, a story, preview, and occupied, archived and invalid targets).

### A refusal is held as an unchanged stream

Every refused archive, status move and renumber is captured with its stdout, stderr and exit, and with a before/after export that is identical byte for byte.

## Assumptions

- **The baselines hold two behaviours as they are** — `archive --done` also archives a done prototype, and `renumber` leaves a sibling's bare `depends: [00]` unchanged. Changing either is a reviewed baseline diff (ADR-002, RESEARCH).
