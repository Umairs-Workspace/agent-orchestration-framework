# 03 · The board shows a prototype — Outcome

## Delivered

### A prototype card sits in an existing lane
The board places a prototype in an existing status lane: `active` in in-progress, `paused` in not-started, and `done` and `abandoned` in done. The mapping is `laneStatus` in `apps/ui/src/board/model.ts`, which the card's status ring also reads. The card is tagged `prototype · <status>` and shows the prototype's own status word.

### Prototypes are counted nowhere
No milestone tally, story count, active-milestone count or blocked-gate count includes a prototype, and a milestone focus shows none.

### Opening a prototype shows its two documents
A prototype card opens on `PROTOTYPE.md` with a `STATE.md` tab and no other tabs. `PROTOTYPE` is in the one artifact set (`packages/work/src/artifacts.mjs`), so `work:doc` serves it and a worker streams it.

## Gaps

### The prototype tag on a narrow lane card
- **Status:** open
- **Discharge condition:** a render of a lane card carrying `prototype · abandoned` at 390 and 768, judged against the lane card's baseline.
Nobody has judged whether the longest tag truncates beside the status ring and ref on a narrow lane card (VERIFICATION F-02).
