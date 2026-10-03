---
doc: verification
---
# 136 · Discovery questions in the loop — Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13601 | `test/arch/examples/acd-example-answer-one-reader.test.mjs` | pending (136/01) | pending |
