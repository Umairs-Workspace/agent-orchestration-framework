---
doc: state
---
# 209 · A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files — State

## Progress

- Not broken down yet. `aof:refine` adds the stories.

## Notes & decisions in flight

- AOF drives board updates. The local milestone folder survives publication and stays in place
  while the milestone is in flight. External edits stop the workflow. The recovery direction
  is an explicit resync from AOF to the board.
- Open for refinement: what counts as local cleanup after `done`? The existing archive operation
  preserves repo documents, verification evidence and incoming links. Resolve the destination
  of that history and the timing of cleanup if the final board write is still pending.
- Also open: which board changes count as external edits (for example a comment or a change to
  an unmapped field), and whether the stop extends to independent workflows on the same board.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
