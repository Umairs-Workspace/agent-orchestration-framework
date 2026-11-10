---
doc: retrospective
updated: 2026-10-06
---
# 05 · The contract is formulated from the map — Retrospective

## R1 — new cases landed without the ledger that counts them

- **Kind:** mistake · **Area:** process (test) · **Stage:** build · **Owner:** developer
- **Raised by:** `aof:verify 135`

**What happened.** 05 added 12 registered cases to the discovery-beat suite. 142's Plan 09 ledger
pins the registry's total (`registryCases`), and 05 did not raise it, so `core-workspace` was red
until verify did (F-135-02). The render also rewrote `.aof/aof.lock.json`, which was not in
`files:`.

**Why.** The importer sweep covers suites that import the changed files. The ledger counts the whole
registry and imports none of them.

**Lesson.** A story that adds or renames a registered case runs `test/bundle/core-workspace.test.mjs`
in its lane. A story that renders bundle assets lists `.aof/aof.lock.json` in `files:`.

**Refs:** F-135-02; `3eb38e39`.
