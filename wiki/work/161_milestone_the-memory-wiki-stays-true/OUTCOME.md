
# 161 · The compiled wiki stays true — Outcome

## Delivered

### Every direct wiki page's source citations resolve, and doctor keeps them resolving
All 12 direct wiki pages currently have zero `wiki-source-unresolved` or `wiki-source-unreadable` findings, scoped or unscoped. A later move or deletion that strands a citation in any of them becomes a doctor warning (m161/01 states the probe whole).

### The memory page is held to the code it describes
`wiki/memory.md` now describes the delivered procedure (m161/02). Because every `src/` path it cites is checked by the same probe, a module move that would stale the page now surfaces as a warning instead of drifting silently.

## Assumptions

- **Content drift beyond paths is not detected** — the probe checks that cited files exist, not that the prose still describes them; a behaviour change behind an unchanged path still needs a human rewrite.

## Gaps

### Wiki pages are not memory records
- **Status:** open-by-decision
- **Discharge condition:** a milestone decides wiki pages should be recallable; 05/ADR-001's derived-index rule currently refuses them as a second copy of indexed records.
The wiki compiles records that are already indexed; recall never returns a wiki page.
