# 124/01 · Cap exhaustion returns to the plan — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### One module decides cap exhaustion
`src/commands/loop.mjs` mints no `cap-exhausted` halt of its own. At its cycle-cap branch it asks
`decideCycleCapExhaustion` in `src/work/loop.mjs`, handing over the facts it already holds (ref,
type, parent, phase, cycle, cap, scope, and the plan's re-entry count read off its own counter).

### Cap exhaustion returns to the plan
A unit that exhausts its cycle cap is answered with the existing drive act aimed at its plan under
the `refine` phase — the same shape `decideLoopPhase` already returns — with the plan ref derived
from the item graph: a story's plan is its parent milestone, a driver's plan is itself. The range
keeps running.

### The escalation is bounded twice, and nothing new was added
A unit is handed back at most once per invocation and then set aside in the walk's in-process
`Set`; a plan is re-entered at most `cap` times, counted under the shell's existing
`${planRef}\0refine` key. `LOOP_STOPS` is still twelve, `LOOP_FIX_TRANSPORT_KEYS` still nine, the
loop declaration still eight keys; no counter or persisted key arrived.

### Out of scope stays terminal, and the other eleven stops are unchanged
A derived plan ref outside the loop's declared scope halts terminally with
`engine:plan-out-of-scope`, naming the plan; the read-only surfaces and the other eleven members of
`LOOP_STOPS` return exactly as before.

### The engine's own cap is ledgered, not half-wired
`nextDecision` still passes no `cycle` at any of its six call sites; `wiki/work/TECH_DEBT.md` item
91 records the dead guard, its three unreachable branches, the one live entry (the direct
`decideLoop` call) and the repair's estimate. Item 76 is compacted to budget with its stale line
citations corrected.

## Assumptions

- **The shell's counter is the one cap that fires on the `nextDecision` path** — the engine's own
  guard is reached only through the shell's direct `decideLoop` call; the refine hand-off relies on
  the shell's counter being right.
- **A parentless story is a driver of the stream** — its plan is itself, so it is never handed to a
  milestone and re-enters itself at most `cap` times.
- **A harness timeout sized against the old terminus is this story's to own** — the shell-out
  prompt suite's spawn budget was raised to 60s because a range now takes one refine before it ends.

## Gaps

### The engine's cap guard on the `nextDecision` path
- **Status:** open
- **Discharge condition:** `TECH_DEBT.md` item 91 — `nextDecision` hands the decider `cycle`,
  `lastPhase`, `gate` and `verifyCycle`, under a ruling on which module owns the loop's state machine.
Three of the pure decider's branches remain unreachable in the live path; the shell's counter is the
only cap that trips there.
