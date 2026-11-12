---
doc: state
---
# 192 · Discovery researches the domain before it asks — State

## Progress

- Not yet broken down. Promote with `aof:promote operator-aware-discovery`, then `aof:refine <NN>`.

## Notes & decisions in flight

- 2026-11-12 — Captured from an operator conversation. In domain-heavy projects (fraud, property
  management, regulatory), refine asks the operator questions as if they were the domain specialist.
  The root cause is the two-label question taxonomy: `business` conflates domain fact with operator
  policy, and an unplaceable question defaults to "ask the human". Items 1–4 of that conversation's
  proposal (split the labels, research first, the operator profile, the explain-first question
  shape) are in scope. The glossary, "not mine to decide" routing, the quality lints and profile
  learning are deferred to a follow-up.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
