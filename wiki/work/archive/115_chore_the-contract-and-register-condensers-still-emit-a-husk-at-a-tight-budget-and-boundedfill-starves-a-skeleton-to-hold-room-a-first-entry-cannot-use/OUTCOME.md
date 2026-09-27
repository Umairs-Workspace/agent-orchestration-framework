# 115 · The Contract And Register Condensers Still Emit A Husk At A Tight Budget And Boundedfill Starves A Skeleton To Hold Room A First Entry Cannot Use — Outcome

## Delivered

### No bounded reduction is offered as one while naming none of its own entries
`condensedResult` (`src/phase-brief.mjs:430`) returns `null` for any reduction with `total > 0` and
`kept === 0`, so the never-a-husk rule sits in the one place a reduction becomes a section and binds
every bounded condenser — including a sixth one — rather than the single packer path chore 95 bound.

### The contract index and the fitness register carry an OPENED first entry instead of a husk
`condenseTaskContracts` and `condenseFitnessRegister` share the architecture slice's retry through
`boundedFillOrOpen` (`src/phase-brief.mjs:533`): where no scenario or row fits the room whole, the
first is carried opened under `TASKS_OPENED_FORM` / `FITNESS_OPENED_FORM`, and the stated count says
`1 of N` in the form that was actually emitted.

### A contract's opening names a scenario rather than its tags
What `condenseTaskContracts` opens is `headlineOf(scenarios[0])` — the last line of the unit — so the
room is spent on the line that names the scenario, not on the `@executable` tag lines above it.

### The fill's reserve is held only for a first entry that could claim it
`boundedFill` (`src/phase-brief.mjs:466`) holds `optional[0].length + join` back only while that is
`<= room`, and holds nothing otherwise, so a skeleton is no longer starved of room nothing can spend —
the defect that lost three of milestone 72's four ADR headings, now fixed once in the helper under all
three condensers instead of worked around in one of them.

### Unshippability is priced against every declared form, including the best one
`assemble` (`src/phase-brief.mjs:1141`) takes the minimum of `full`, `floorLength` and `bestLength`,
so a section whose condenser now DECLINES a tiny room still reaches the brief in the larger form it
does answer at, rather than being called unshippable and dropped entirely.

### The invariant is swept, not sampled
`test/brief-carries-the-contract.test.mjs` runs green (exit 0, 0 failures) with the never-a-husk rule
asserted at every budget for every bounded condenser, alongside a lane pinning the reserve's
could-claim-it condition.

## Assumptions

- **An opened entry is priced the way its listed form was** — `boundedFillOrOpen` takes the caller's
  own `pad` (1 for the architecture slice's heading/passage newline, 0 elsewhere); a caller whose
  layout adds padding it does not declare would re-fill against an entry it does not emit.
