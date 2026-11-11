# 167/02 · An idle view costs almost nothing — build plan

## Mechanism

**Server.** One small ETag step in each face, just before `sendJson`: hash the serialised body,
compare it with `If-None-Match`, and send either `304` or `200` with the `ETag` header. The two
faces are separate packages (`@aof/server`'s board, `@aof/mesh`'s fleet), so each has its own
four-line step. No shared helper earns a new import edge.

**Client.** `poll-cadence.mjs` is a pure scheduler. `createPoll({ baseMs, capMs, run, isHidden,
onVisible })` returns `{ start, stop, changed, unchanged, poke, pin, unpin }`. It owns one
`setTimeout` chain, never `setInterval`, so the delay can move between polls. Each `run()` reports
`changed` or `unchanged` from the response status. `poke()` is a user action, and `pin()`/`unpin()`
bracket a pending assign. Visibility comes from `document.visibilityState` and its
`visibilitychange` event, injected so the suite drives it without a DOM.

Each surface's `useEffect` that today builds a `setInterval` builds a poll instead: Board's three,
DetailPanel's runs poll, Fleet's status poll and Home's feed poll. The `api.ts` modules keep the
last `ETag` per URL and send `If-None-Match`. A `304` resolves to "unchanged" and keeps the
previous data, so no surface re-renders.

## Verification step

Open the desktop app's fleet over the live daemon with the 00 meter in place. Leave it visible
for 3 minutes with nothing changing: `request` counts for `fleet` fall from 12 a minute to the
capped rate, and every answer after the first is a `304`. Minimise the window for 2 minutes: the
count stops rising. Restore it: one request at once.

## Out of scope

- Server push (ADR-004, alternative).
- The desktop supervisor's own `mesh status` spawn every 3 s (STATE, open item).
