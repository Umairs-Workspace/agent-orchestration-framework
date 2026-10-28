---
doc: retrospective
promotionFrom: 1
---
# 03 · The diagram surface has no terminal — retrospective

## R1 · Removing lanes and lines owed the suites that count them

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** The importer sweep found two pins outside `files:`.
`terminal-harness-drives-a-grid.suite.mjs` counts the socket suite's lanes (23 → 17), and
`terminals-home-route.suite.mjs` pins `TerminalControl.tsx`'s line count (839 → 834). Adding the
surface-table scenario as an eighth gate lane also broke that file's own seven-lane census.

**Why:** Refine declared the suites that test the removed seam, not the suites that count the lanes
or lines it lived in.

**Lesson:** A removal story greps the tests for the removed file's name and for the suite export it
shrinks, and declares the counting suites at refine; the sweep at the close is what caught these.

**Refs:** STATE `## Feedback (for retro)` (172/03 close).
