# 71/01 · A finding the cap stops chasing becomes a named work item, or a named question for a human — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. An ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `STORY.md` is.
-->

## Delivered

### The review close routes every surviving finding by one ordered rule, as code
`routeFinding()` and `routeFindings()` in `src/work-loop.mjs` are a pure decider over ADR-003's four
ordered questions with a closed answer set — `amendment`, `chore`, `story`, `recorded` — where a
Blocker (chased or outstanding) and a claim that did not reproduce never reach the questions, a Nit
is recorded and never promoted, two lenses' reports of one defect (title and `file:line` normalized)
are routed once, `creates` is only ever `"chore"` or `null`, the `story` routing is owned by the
operator, and no finding id and no finding tag is ever produced.

### `aof work promote-finding` schedules a finding as a top-level chore
`work:promote-finding` is registered in the command core and reachable as `aof work promote-finding`
with a reviewed ref, a finding title, `--remedy`, and optional `--location`/`--round`: it creates a top-level chore born `not-started`
whose `## Definition of Done` is the finding's remedy plus the no-regression line, whose `## Notes`
names the reviewed ref, the review round, the finding's title and `file:line` and a visible
`**Promotion key:**`, which appends after the highest existing number with `shifted: 0`, which is
idempotent on (reviewed ref + title normalized for case, whitespace and backticks) — including after
the chore has been closed — which refuses a missing/unresolvable ref, a blank or unsluggable title and
a blank remedy with coded reasons, and which refuses any input outside its declared set (`type`,
`at`, `parent`, `under`, …) rather than ignoring it. It has no `/aof:` bundle wrapper and is deferred
from the board, by decision (ADR-004).

### One promotion engine under `src/work-promote/`, two faces on it
`chore-seed.mjs` holds the DoD seed and both back-reference shapes; `promotion.mjs` holds the slug
derivation, the append-position resolver, the idempotence key and scan, and the seed writer.
`src/commands/promote-gap-to-chore.mjs` delegates to them with its refusals, codes, rendered lines and
`--at` flag unchanged (39/03's suite is the control, 9/9 green), and the family imports nothing from
`../commands/`.

### A promotion appends after the highest number, not after the count
`appendPosition()` answers `max(highest top-level number + 1, count)`. Over this repository's own
stream (87 top-level items, highest number 87) the count-derived default 39/03 shipped would have
inserted at 87 and renumbered one item; the engine answers 88 and shifts nothing. Both faces take
this default when no position is named.

### `aof:continue` states the triage rule at the review close
The `<finding_triage>` region of `src/bundle/commands/continue.md` — and its three rendered runtime
copies under `.claude/`, `.codex/` and `.opencode/` — instructs the four ordered questions, first
answer wins; names `aof work promote-finding` as the close's only creating verb; states that the loop
creates exactly one type in exactly one place; forbids allocating a finding id; and requires a report
of each finding's routing, each chore created by ref, and each finding handed to the operator.

### Two controls hold the creation bound
FF-7103 (`test/arch/acd-promotion-creates-one-type.test.mjs`) reads the insert engine's admissible
types out of its module-private `DOCS_BY_TYPE` by source-parsing, refuses any insert type on the
promotion path other than `PROMOTED_TYPE`, refuses `runInsertStory`, requires the prompt's review
close to name only `promote-finding` as a creator and all four routings, and binds the finding face to
no `at`/`type`/`parent`/`under` input, an unknown-input refusal, and a position resolved through
`appendPosition`. FF-7104 (`test/arch/acd-one-promotion-engine.test.mjs`) requires one definition site
per mechanic, both faces reaching the family by import, no module anywhere in `src/` matching the
promotion signature outside the family, and no `../commands/` import inside it. Both are registered
in `scripts/test.mjs`.

## Assumptions

- **The routing is applied by the agent reading the prompt** — nothing in the runtime calls
  `routeFinding()` at a review close; `<finding_triage>` instructs the agent to put each finding to the
  questions and to call the verb. The controls prove the rule is stated and decidable; only a live
  capped pass proves an agent follows it (`VERIFICATION.md` F-71-D).
- **Idempotence reads the records, not an index** — the scan matches the `**Promotion key:**` line in
  every top-level `CHORE.md`; a chore whose key line has been hand-edited or removed can be promoted a
  second time.
- **The reporting bar is the rate bound** — the promotable population is the Important-finding
  population 83's reporting bar admits; the engine imposes no numeric budget of its own.
- **The rendered runtime copies are kept in step by hand** — verified byte-identical to
  `renderBundleOutputs()` at this accept; no control enforces it (F-71-A).

## Gaps

### A real capped review pass has not yet exercised the route
- **Status:** discharged (2026-09-03, at the 71 milestone gate)
- **Discharge condition:** one `aof:continue` review close, run under the shipped `<finding_triage>`
  region with at least one surviving Important finding, is observed to call
  `aof work promote-finding` and to hand back the routing report — and the resulting chore is listed
  by `aof work list` with its back-reference intact (F-71-D).

The story's own review pass raised two Important findings and recorded both in `STATE.md`
`## Feedback (for retro)` rather than promoting them, because that pass ran under the prompt it was
replacing. **71/02's and 71/03's review passes then ran under the shipped region and promoted
instead of recording**: `88_chore_three-arch-tests-are-red-from-71-00-and-71-01-both-already-done`
(from 71/02, review round 1) and
`89_chore_ff-7106-is-declared-in-milestone-71-s-fitness-register-but-owned-by-no-story` (from 71/03,
review round 1). Both are top-level chores born `not-started`, both appended shifting nothing, both
`aof work validate` PASS, and both carry the `**Promoted from review finding:**` /
`**Raised reviewing:**` / `**Promotion key:**` back-reference. `tasks/02`'s `@manual` scenario is
discharged.
