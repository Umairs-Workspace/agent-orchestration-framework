---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: loop:build-to-green
kind: loop
title: Build executable work to green
controlled: executable scenarios and fitness functions green
reference: [prose:src/bundle/commands/continue.md]
measurement: [prose:src/bundle/commands/continue.md]
actuator: [prose:src/bundle/agents/aof-developer.md]
cadence: event:per-phase
ceiling: [config:work.loop.buildNoProgressRounds]
owner: unknown
optimizing: true
layer: operational
---
# Build to green

Framework record source: `src/bundle/loops/build-to-green.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

This is a loop because the build phase repeatedly drives executable scenarios and fitness functions
to green; that controlled variable, its task-feature reference, and the rerun-based measurement are
specified in `src/bundle/commands/continue.md:52-58` (also catalogued in RESEARCH §Q1.1). The
measurement and reference therefore remain honest `prose:` authorities rather than fabricated
machine pointers.

The narrowest artifact that acts is the developer agent definition, not the phase prompt:
`src/bundle/commands/continue.md:55-57` delegates the work to `aof-developer`, whose definition begins
at `src/bundle/agents/aof-developer.md:1`. The phase trigger justifies `event:per-phase`. No owner
authority was found (RESEARCH §Q1.1), so `owner` is deliberately `unknown`; no citation is invented.
The failure bound is `config:work.loop.buildNoProgressRounds`: consecutive rounds without a reduction
in failing scenarios. It deliberately does not restate a numeric round count; all-green remains the
success terminator while the configured progress authority bounds only work that has stopped progressing.

`optimizing: true` records that the loop pushes scenarios-green toward the extremum “all green”, while
its developer actuator can edit what that measurement observes. No monitoring edge is declared because
the repository cites no independent watcher.

**`layer: operational`, corroborated by its own cadence.** The trigger is `event:per-phase`,
whose scope sits inside a single phase of a single item — the innermost scope this vocabulary has —
and the layer this record declares is the one that scope implies. The layer is an ordinal position on
a second axis, never a duration: it is compared with the layer of the loop that sets this one, and no
interval is derived from it.

**Its reference is set by `loop:autonomous-cascade`, one layer above it.** The edge is declared on
the cascade's own record, where it is labelled as this milestone's judgment rather than a citation:
the item the cascade selects is what determines this loop's setpoint, its task `.feature`. A
management loop setting an operational loop's reference crosses exactly one layer, which is what
distinguishes supervision from two cycles pulling the same developer in different directions.
`owner:` is a separate claim and is untouched: no role is recorded as accountable for this loop, so
it stays `unknown` and the accountability gap is still reported.
