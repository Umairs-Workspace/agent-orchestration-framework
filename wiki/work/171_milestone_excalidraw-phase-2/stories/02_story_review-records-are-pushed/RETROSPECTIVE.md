---
doc: retrospective
promotionFrom: 1
---
# 02 · Review records are pushed — retrospective

## R1 · The stream gave the board transport a filesystem of its own

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** verifier · **Promoted to:** control:ADR-004/inv.3

**What happened:** `streamDiagramEvents` imported `node:fs` for its watch and swallowed two errors
with empty catches. The story's own suites and FF-17101 were green; the whole-tree gate failed
ADR-004 inv.3 (the transport imports only presentation helpers) and m42-item-3 (no new silent
catch).

**Why:** ADR-003 placed the watch in the face, and the face's file looked like the place to open
it; the controls that police that file were not in the story's lane.

**Lesson:** The board transport is handed what touches the machine — the watcher and the degrade
reporter now arrive from core's binding — and every catch in it reports a coded event.

**Refs:** `REGRESSION.md` row at 9b5d01c1; 171/R2.
