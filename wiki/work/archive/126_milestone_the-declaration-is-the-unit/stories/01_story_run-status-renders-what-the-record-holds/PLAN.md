# 126/01 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

This is a renderer change and only a renderer change, and the discipline is to keep it that way.
The `--json` adapter already returns the whole record; the human render prints two of its sixteen
keys. Widen the render to name what the record holds — phase, cycle against cap, level and attempt
from the loop envelope on the brief; session, node, failure reason; elapsed and heartbeat age; and
which source answered, because a cache-answered history is a worker's mirror and the operator should
know that.

The two time figures are the only place a builder can drift. Do not compute them in the renderer.
`126/00` lands a pure per-attempt duration in the engine — reclaimed ends at last heartbeat, settled
at `updatedAt`, running at `now` — and this render imports that, handing it an injected `now` the
way `mesh status` already injects one for staleness. No `Date.now()`, no `new Date()` in the module.

Then the trap. This file is byte-pinned by a sha256 in the control that holds `53/ADR-004`'s "not
edited" invariant, and that pin has been re-pinned once already. Re-pin it in the same diff and
write the reason beside it, the way the last re-pin did. Do not delete the entry: an unpinned file is
covered by nothing. Leg 1 of that control — the envelope round-trip — is not yours; `126/02` moves
its key count and collides with you on the file, which the wave partition orders.

## The verification step

Three fixtures through the registered command with `--json`: a disk-answered item with a populated
loop envelope, a cache-answered `fromWorker` item, and an item with no runs. Assert each document is
key-for-key what it is today. Then render the first and see the phase and cycle it holds appear, and
feed a reclaimed record whose reclaim stamp is hours after its last heartbeat and confirm the elapsed
shown is the heartbeat one. Finally run the byte-pin control and confirm it is green with the new
digest and would go red without the entry.

## Deliberately out of scope

`src/board-ui.mjs` and `ui/` are untouched and their pins stay. No `--verbose` flag: the honest
render is the default, not an opt-in. No new field on the record or the envelope.
