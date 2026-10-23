# 02 · An idle view costs almost nothing — Outcome

## Delivered

### The polled routes answer 304 when nothing changed
`/api/work/list` and `/api/mesh/status` send an `ETag` and answer `304` to a matching `If-None-Match`; an error answer carries no tag. The tag is two FNV-1a lanes plus the length, computed in `packages/server/src/static-serve.mjs`, and the fleet's tag ignores `diagnostics.generatedAt`.

### Every UI poll is scheduled through one cadence
`apps/ui/src/lib/poll-cadence.mjs` schedules every interval poll in `apps/ui/src` (FF-16703). It makes no request while the window is hidden, polls at once when the window is shown, doubles while answers are unchanged up to 15 s, and returns to the 5 s base on a change, a user action, or a pending assign. The clock ticks and the session launcher's outcome wait are exempt. While a Resync watches, every board poll stays at the base.

## Gaps

### A mounted proof of the cadence wiring
- **Status:** open
- **Discharge condition:** the UI harness gains a visibility seam, and a mounted case drives pause, show and back-off through a real surface.
Pause, show, back-off and snap-back are proven on the scheduler with an injected clock and visibility. The surfaces' wiring, including Home's capture-phase pokes, is checked by source alone (m167/F-07).
