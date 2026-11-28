---
doc: state
---
# Paths in finished work are history — State

## Progress

- Captured 2026-11-28 in the backlog, from the operator during `aof:continue 210`: "I want the
  ledger deleted." Stories to be broken down by `aof:refine`.

## Notes & decisions in flight

- 2026-11-28: Where this came from. 210/04 deleted two modules that 190/01's `reads:` names. The
  stream-wide validate went red. The only legal repair under 119/ADR-004 was two hand-written `F`
  records in the ledger. Those records point at the code that replaced the modules, not at a forward
  the modules became, so even this repair stretched what an `F` record means. That is what this
  milestone removes.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
