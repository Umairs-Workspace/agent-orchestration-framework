---
doc: state
---
# The loop starts from the backlog, refines a whole item in one pass, and runs each phase on the model the operator chose — State

## Progress

- Captured 2026-10-02 from the operator; not yet broken down.

## Notes & decisions in flight

- Operator, 2026-10-02: "I want this done via the cli `aof work loop <> --`; we can discuss how to best lay
  this out as command line arguments." The layout is the first open question in SPEC.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
