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
- **After the restart onto `74a3a714+dirty` (2026-10-20 09:09 UTC), with F-06's fix:** the
  `event-id-conflict` stopped, but `mesh serve` still measured 62% of one core over a 30 s sample.
  It logged 348 `workdir-missing` and 406 `workspace-workdir-unresolvable` lines in its first 6
  minutes, and `work-read-cache-unavailable` kept firing (9 times). So F-06 was one amplifier, not
  the cause. The degrade line does not name its workspace, which is itself an observability gap.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] Soak test under budget on the control node
