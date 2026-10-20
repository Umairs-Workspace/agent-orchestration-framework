---
doc: state
---
# The daemon stays within a resource budget — State

## Progress

- [ ] Captured 2026-10-20 in the backlog; promote with `aof:promote daemon-stays-within-a-resource-budget`,
  then `aof:refine <NN>`.

## Notes & decisions

- The motivating evidence lives in `~/.aof/mesh/logs/degrade.log` and `mesh-serve.log` on the
  control node (2026-10-19/20), measured from logs, not a profiler. Refine should turn its three
  faults into the soak test's planted faults.
- The budget numbers (idle, viewer-open) are the operator's call at refine. They are not defaulted
  here.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] Soak test under budget on the control node
