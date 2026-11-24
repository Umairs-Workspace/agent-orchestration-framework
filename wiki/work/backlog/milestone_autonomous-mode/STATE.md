---
doc: state
---
# Autonomous mode — State

## Progress

- Framed 2026-11-22, un-numbered on the backlog. Stories are to be broken down by `aof:refine`.

## Notes & decisions in flight

Operator decisions, 2026-11-22, taken while the milestone was framed:

1. `/aof:autonomous` passes `--autonomous` through to the loop.
2. A `@uat` acceptance stops the work item that owns it. Autonomous mode delivers as much of its
   sub-items, such as a milestone's other stories, as it can.
3. The internal `autonomous` field (the whole-item cascade, chore 200's leftover) is renamed to
   `all` first.

Existing `autonomous` names that stay (surveyed at framing): the `aof:autonomous` skill,
`work.autonomous.{maxAttempts,refine}`, the `loop:autonomous-cascade` loop id, and the mesh
assignment phase `autonomous`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
