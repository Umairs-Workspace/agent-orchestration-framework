# 00 · The declared cap — Outcome

## Delivered

### Every loop deadline and cap resolves from one home
`src/loop-bounds.mjs` resolves all seven declared bounds from `work.loop.*` — heartbeat,
schedule-to-start, start-to-close, schedule-to-close, review rounds, build no-progress rounds and
progress max resets — each with a documented default, and a malformed declared value falls back to
that default rather than crashing the caller.

### The two bounds that already had homes still have them
`work.dispatch.concurrency` keeps its single pre-existing reader and `work.autonomous.maxAttempts`
keeps its closed reader set; neither was moved into the new leaf, and the existing cap single-home
guard was extended to cover the leaf rather than joined by a sibling.

### A second review round is refused unless a blocker is named
`decideReviewRound` admits round one and refuses round two without an explicit blocker claim,
reporting which blocker class would admit it; an exhausted cap halts rather than looping.

### The declared review cap binds the production re-review path
`decideReviewGate` (`src/work-loop.mjs`) consumes the gate's real `{ path, problem }` finding shape
and is called from `src/commands/loop.mjs`, so the cap is enforced where re-review actually happens;
the review-round count is counted apart from the engine cycle, and a blocker is an explicit claim
rather than an inference from finding prose.

### No framework loop record declares an uncapped ceiling
Every `ceiling:` under `src/bundle/loops/*.md` is `none` or a pointer list, and a `config:` pointer
naming a key no resolver resolves is reported as a finding rather than accepted as a declaration.

## Assumptions

- **The declared value is a starting point, not a settled one** — `N = 1` on review rests on
  external evidence and this repo's own m52 measurement; the runtime enforces whatever `work.loop.*`
  declares, and the number is expected to move once 68's telemetry has a measured milestone under it.
- **A blocker is something a caller states** — the loop shell cannot infer one from finding prose,
  so a second round is reachable only when a caller passes an explicit blocker claim.

## Gaps

### `scheduleToStart` has no measurement behind it
- **Status:** open
- **Discharge condition:** a measured dispatch-latency distribution from 68's telemetry replaces the
  documented default.

Every other value in the bounds table is derived from a recorded event on this tree; the 10-minute
schedule-to-start is a documented default chosen so a shorter one would not alert on ordinary
dispatch latency.
