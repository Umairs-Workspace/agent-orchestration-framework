---
doc: retrospective
promotionFrom: 1
---
# 168/03 · The board shows a prototype — retrospective

## R1 · Widening the wire status was handled by mapping it once in the model

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** The wire `status` now carries a prototype's four words, and that would have
broken 11 typed call sites. The build moved `bucket` (BoardLanes) and `tabsFor` (DetailPanel) into
the pure `model.ts` beside `laneFor`, and changed `status.tsx` so its helpers read the wire status
through `laneStatus`. The lane, the ring and the tag now share one mapping. `status.tsx` and the
artifact-count pin (`artifact-sync-manifest`, 9 → 10) were not in `files:`.

**Why:** ADR-007 planned for the lane mapping, but not for every UI helper keyed on the governed
five words.

**Lesson:** When a wire union widens, map it to the existing vocabulary once in the model, and make
every view helper take the mapped value. Before settling `files:`, grep for the helpers keyed on
the old union.

**Refs:** ../../STATE.md Notes (continue 03), Feedback (continue 03); ../../VERIFICATION.md F-01.
