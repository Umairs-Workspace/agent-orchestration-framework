---
doc: verification
---
# 134 · Discovery before formulation — Verification

## Fitness functions

Each probe was run at the source: mutate one file, run the control, read the failure, restore the
file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13402 | `test/arch/examples/acd-example-map-single-home.test.mjs` | GREEN (3 ok) | appended `export const probeLabel = (line) => line.endsWith("[confirmed]");` to `src/config-inspect.mjs` → `src/config-inspect.mjs: spells a bracketed provenance label` (134/02 build, 2026-09-24) |
