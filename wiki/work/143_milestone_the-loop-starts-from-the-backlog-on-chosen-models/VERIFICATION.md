---
doc: verification
---
# 143 · Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-14301 | `test/arch/loop/acd-loop-promotes-through-the-one-door.test.mjs` | pending — 143/00 | pending |
| FF-14302 | `test/arch/loop/acd-loop-refine-scope-single-home.test.mjs` | pending — 143/01 | pending |
| FF-14303 | `test/arch/session/acd-session-choice-single-home.test.mjs` | pending — 143/02 | pending |
