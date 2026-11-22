---
doc: verification
---
# 204 · What aof apply, init and clean write is held to baselines — Verification

## Fitness functions

Declared at refine (2026-11-21). FF-20401 lands with story 01 and FF-20402 with story 02, each as a
case beside FF-15404's, and each owes its red probe here when it does.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-20401 | `test/arch/store/acd-codex-output-ownership.test.mjs` | pending: lands with 204/01 | pending: restore the runtime gate in the co-authored predicate, so a claude `CLAUDE.md` is planned as a whole-file write over the user's file |
| FF-20402 | `test/arch/store/acd-codex-output-ownership.test.mjs` | pending: lands with 204/02 | pending: make clean delete an owned entry on a whole-file hash match again, so a merged `AGENTS.md` holding the user's lines is planned as `delete` |
