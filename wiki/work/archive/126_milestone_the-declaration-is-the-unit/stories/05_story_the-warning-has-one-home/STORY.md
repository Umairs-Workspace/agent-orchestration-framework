---
type: story
number: 05
slug: the-warning-has-one-home
title: "The warning has one home — the SQLite runtime is imported at one leaf whose filter is targeted and restored, and no blanket suppression exists anywhere"
parent: 126
depends: []
status: done
owner: product-owner
created: 2026-09-08
updated: 2026-09-09
adrs: [ADR-008]
reads:
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-008
  - src/degrade.mjs
  - src/effects/stores.mjs
  - src/workspace.mjs
  - package.json
  - test/arch/store/acd-shared-store-concurrency.test.mjs
  - test/mesh/mesh-effects-outbox.test.mjs
  - test/support/source-slice.mjs
  - test/support/cli-spawn.mjs
  - test/support/read-src-files.mjs
  - test/grade/harness-ruling-seam.test.mjs
  - test/mesh/global-mesh-query.test.mjs
  - test/mesh/ui/mesh-ui-global-scope.test.mjs
files:
  - src/sqlite-runtime.mjs
  - src/effects/journal.mjs
  - src/global-work-store.mjs
  - test/store/sqlite-runtime.test.mjs
  - test/store/global-work-store.test.mjs
  - test/store/index.mjs
  - test/arch/store/acd-sqlite-runtime-has-one-home.test.mjs
  - test/arch/store/index.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 05 · The warning has one home

## User story

As **an operator reading a terminal that `aof` has been writing to for hours**,
I want **the `node:sqlite` ExperimentalWarning gone from every command's output — filtered where the
runtime is imported, by a wrap that swallows only that warning and restores itself, never by a flag
that hides every experimental and deprecation warning this repository wants to see**,
so that **the first line a loop prints is the loop's, and a warning nobody can act on stops being the
only output of an eleven-hour session**.

Two modules import the runtime and each carries its own copy of the same resolve body. They collapse
onto one leaf — a subtraction, and the house rule applied to the smallest subject it has. Each
caller keeps its own refusal; the leaf resolves the runtime and decides nothing.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_one-import-home.feature` — exactly one module in `src/` imports `node:sqlite`, and
      both callers reach it by import; neither caller's refusal or degrade path moves
- [x] `tasks/01_the-filter-is-targeted-and-restored.feature` — only an `ExperimentalWarning` naming
      SQLite is swallowed; another experimental warning still prints; `process.emitWarning` is
      restored after a successful and a throwing import
- [x] `tasks/02_no-blanket-suppression-anywhere.feature` — no `--no-warnings`, `--disable-warning`
      or `NODE_OPTIONS` warning flag in `src/`, `bin/`, `scripts/`, the bundle or `package.json`

## Notes

**Independent, and the smallest story in the milestone.** Both subjects are heavily depended upon
(`src/global-work-store.mjs` by 109 modules, `src/effects/journal.mjs` by 31) and are edited only
inside their private `resolveSqlite` bodies; no other story touches either.

**The mechanism was measured before it was decided.** Wrapping `process.emitWarning` around the
dynamic import on `node v22.22.2` swallowed exactly the SQLite warning, left `DatabaseSync` present,
restored the original, and a second import in the same process emitted nothing — Node raises it once
per process. `--disable-warning=ExperimentalWarning` also works on this Node and is refused because
it is blanket.

**`test/store/global-work-store.test.mjs` is in `files:` by the repository's own convention** — the
suite that owns a declared source file rides in its story's write set — and may end the story
untouched.
