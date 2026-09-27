---
doc: verification
---
# 138 · The session driver sees claude's screen — Verification

## Fitness functions

Run each probe at the source: mutate one file, run the control and read its failure, then restore
the file and run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13801 | `test/arch/terminal/acd-screen-has-one-reader.test.mjs` | pending (138/00) | — |
| FF-13802 | `test/arch/terminal/acd-screen-registry-is-recorded.test.mjs` | pending (138/01) | — |
