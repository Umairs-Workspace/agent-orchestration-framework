---
doc: verification
---
# 135 · Key examples in the contract — Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13501 | `test/arch/examples/acd-sbe-package-one-way.test.mjs` | pending (135/01) | pending |
| FF-13502 | `test/arch/examples/acd-example-trace-declared.test.mjs` | pending (135/04) | pending |
