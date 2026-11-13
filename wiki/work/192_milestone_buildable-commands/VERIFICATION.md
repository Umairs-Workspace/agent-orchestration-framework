---
doc: verification
---
# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — Verification

Written at `aof:verify 192`. Opened at refine (2026-11-13) only to carry the red-probe register
for the controls `ARCHITECTURE.md` declares. FF-19205, FF-19206 and FF-19207 landed with 192/00 and were each probed red on 2026-11-13.

One developer-run `@manual` check is owed by 192/02 and is recorded here when it runs: this
checkout's rendered refine command, Codex refine skill and three briefs, compared with the same
files at the commit before the story, whitespace collapsed (ADR-005 §4).

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-19205 | `test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs` | green (192/00) | red when the empty block slot keeps its blank line (`bundle-compose.mjs`), and when the loader returns the common body uncomposed (`bundle.mjs`), 2026-11-13 |
| FF-19206 | `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` | green (192/00) | red when the fixture Codex procedure loses the `demo.notes` slot its common source carries, naming `notes-demo`, `codex`, `demo.notes`, 2026-11-13 |
| FF-19207 | `test/arch/practices/acd-render-reads-project-config-only.test.mjs` | green (192/00) | red when `bundle-compose.mjs` imports `node:os`, and when the update merges the machine-wide config before loading, 2026-11-13 |
| FF-19208 | `test/arch/practices/acd-off-renders-no-practice-prose.test.mjs` | pending (192/02) | not yet run |
