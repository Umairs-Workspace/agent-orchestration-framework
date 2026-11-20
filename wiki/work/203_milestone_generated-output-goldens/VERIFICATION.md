---
doc: verification
---
# 203 · Every file aof generates is held to a committed baseline — Verification

## Fitness functions

Declared at refine (2026-11-20). Each control lands with story 00, and each owes its red probe
here when it does.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-20301 | `test/arch/testing/acd-golden-normaliser-closed.test.mjs` | pending: lands with 203/00 | pending: add a seventh rule to `normalise.mjs`, and a `replaceAll` on captured content in another golden module |
| FF-20302 | `test/arch/testing/acd-golden-baselines-written-by-the-script.test.mjs` | pending: lands with 203/00 | pending: import `baseline-writer.mjs` from a module under `test/`, and read an update variable from the environment |
| FF-20303 | `test/arch/testing/acd-golden-baselines-eol-pinned.test.mjs` | pending: lands with 203/00 | pending: remove the `test/golden/baselines/**` pin from `.gitattributes`, and commit a baseline file without the `.golden` suffix |
