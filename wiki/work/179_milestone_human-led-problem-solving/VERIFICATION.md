---
doc: verification
---
# 179 · AOF guides the human through problem solving without taking over — Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17901 | `test/arch/command/acd-continue-builds-only.test.mjs` | pending — lands in 179/00 | pending — recorded when the control lands in 179/00 |
| FF-17902 | `test/arch/command/acd-learning-package-one-way.test.mjs` | pending — lands in 179/01 | pending — recorded when the control lands in 179/01 |
| FF-17903 | `test/arch/bundle/acd-teach-vocabulary-one-home.test.mjs` | pending — lands in 179/03 | pending — recorded when the control lands in 179/03 |
