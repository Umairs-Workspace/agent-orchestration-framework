---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: loop:autonomous-cascade
kind: loop
title: Advance a work range to done
controlled: items reaching done over a work range
reference: [command:work:next]
measurement: [command:work:next]
actuator: [prose:src/bundle/agents/aof-product-owner.md, prose:src/bundle/agents/aof-developer.md, prose:src/bundle/agents/aof-qa.md]
cadence: event:per-item
ceiling: [config:work.autonomous.maxAttempts]
owner: unknown
optimizing: true
layer: management
target-setting: [loop:build-to-green, loop:review-fix-rereview]
---
# Autonomous cascade

Framework record source: `src/bundle/loops/autonomous-cascade.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

The loop controls items reaching done over an operator-selected range (`src/bundle/commands/autonomous.md:3-10`).
Both reference and measurement are the dependency-aware result of `work:next`, invoked repeatedly by
the loop shell at `src/commands/loop.mjs:754`. The per-ready-item phase dispatch at
`src/work/loop.mjs:596-611` establishes `event:per-item`, not a clock.

Those same lines dispatch refine, continue, and verify. Their narrowest acting artifacts are the
product-owner, developer, and QA agent definitions listed in `actuator`, rather than the autonomous
orchestration prompt itself. The retry bound is owned by `work.autonomous.maxAttempts`, read at
`src/bundle/commands/autonomous.md:14`; the record points at the config authority and deliberately does
not duplicate its numeric value. RESEARCH §Q1.4 found no declared loop owner, so `owner` is `unknown`.
That gap is unchanged and is not silenced by this record's edges: `owner:` names the role accountable
for the loop, and it is still nobody. What is now declared is the separate fact of who sets this
loop's reference — `actor:operator`, on its own record, from the range argument it passes.

`optimizing: true` records that the cascade drives the count of items reaching done upward through
agents that change item state. No independent counter-metric watcher is cited, so no monitoring edge is
invented.

**`layer: management`, corroborated by its own cadence.** The trigger is `event:per-item`, whose scope
is one item — one step above a phase and one below a milestone — and the layer this record declares is
the one that scope implies. Nothing here is a duration: the layer is an ordinal position on a second
axis, compared with the layers of the loops it sets, and no interval is derived from it.

**Two AUTHORED target-setting edges, and no citation is offered for either relation.** What is
*discovered* is that `src/work/loop.mjs:596-611` dispatches refine, continue and verify
per ready item, and that `work:next` determines **which** item. What is *authored* is the claim that
this dispatch **is** target-setting — that the cascade's output, the selected item, is what determines
the two inner loops' setpoints:

- `loop:build-to-green` — the selected item's task `.feature` is what the build drives to green
  (`src/bundle/commands/continue.md:186-189`). The `.feature` itself is co-authored by three roles in
  one refine session, two of which have no `actor:` node at all, so no single existing node is a
  complete citable owner of it; naming a partial author would look discovered and be worse than an
  authored cascade edge.
- `loop:review-fix-rereview` — the selected item's contract and ADRs are what the review judges
  (`src/bundle/commands/continue.md:196-201`).

That is a faithful cascade relation — the outer loop's output is the inner loop's setpoint — and it is
milestone 58's judgment (ADR-001 §3), not something this repository states anywhere. Both edges cross
exactly one layer, `management → operational`, which is what makes the relation supervision rather
than two cycles fighting over the same actuator.
