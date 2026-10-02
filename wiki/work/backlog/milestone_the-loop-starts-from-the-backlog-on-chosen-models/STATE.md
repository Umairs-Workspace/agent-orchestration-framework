---
doc: state
---
# The loop starts from the backlog, refines a whole item in one pass, and runs each phase on the model the operator chose — State

## Progress

- Captured 2026-10-02 from the operator; not yet broken down.

## Notes & decisions in flight

- Operator, 2026-10-02: "I want this done via the cli `aof work loop <> --`; we can discuss how to best lay
  this out as command line arguments." Agreed the same day: one repeatable `--model [<phase>=][<model>][:<effort>]` flag, e.g. `--model refine=opus:xhigh --model verify=fable:high`, with `--thinking` kept as the effort-only form (SPEC § Scope).

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
