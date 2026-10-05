---
doc: verification
---
# 148 · Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-14801 | `test/arch/memory/acd-memory-retrieval-eval.test.mjs` | pending, lands 148/01 | pending: reverse `rankRecords`' sort and read the lost pairs it names |
| FF-14802 | `test/arch/work/acd-memory-vocabulary-one-home.test.mjs` | pending, lands 148/02 | pending: re-spell the meta-label alternation in `local-indexing.mjs`, then drop one Kind from the prompt |
| FF-14803 | `test/arch/memory/acd-memory-layer-map-total.test.mjs` | pending, lands 148/05 | pending: delete `capability` from `RECORD_TYPE_LAYERS` and read the unmapped type it names |
