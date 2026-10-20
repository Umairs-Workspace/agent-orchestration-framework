---
doc: verification
---
# 166 · A built graph travels to another machine — Verification

## Verification evidence

### 166 — the story lane and its importers (run 2026-10-20, `AOF_GLOBAL_HOME` isolated)

- **`node scripts/test.mjs --only test/graph/graph-bundle.test.mjs`** — the story suite, 32 cases, 0 failures,
  including the `@bug @finding-F-01` outline (6 rows) and the F-02 budget case. Red probe of the fix:
  `if (false && tree && inputsCurrent(…))` in `graph-build.mjs` turned 2 cases red ("graphify is not run"),
  then was restored.
  `verifies → tasks/00_export-writes-the-graph-to-the-named-path.feature`,
  `tasks/01_import-restores-a-bundle-into-its-own-project.feature`,
  `tasks/02_import-says-how-stale-the-graph-is.feature`,
  `tasks/03_a-bundle-does-not-depend-on-the-machine-that-built-it.feature` (@executable)
- **Importer sweep, `scripts/test.mjs --only` over 47 files** — every test importing `graphify.mjs`,
  `graph-build.mjs`, `graph-bundle.mjs`, the graph bindings, `assemble.mjs`, `command-core.mjs`, the command
  inventory or the workspace runtime audit: 476 cases, 0 failures, exit 0.
- **`node scripts/test-workspace.mjs @aof/knowledge`** — 190 registered cases + 7 native, 0 failures.
- **`aof work validate 166`** — PASS. **`aof work doctor 166`** — no `control-unresolved` (166 declares no
  controls); its warnings are stream-wide.

### E5 · the next build reuses the carried graph — Windows, two clones at `a816d6d1`

Procedure: in `aof-166`, `aof graph build . --json` (full build, no `AOF_GRAPHIFY_TIMEOUT_MS`), then a second
build; `aof graph export <tmp>/carry/aof.graph`; a detached worktree `aof-166-e5` at the same commit holding
the same 6662 git-visible paths byte-identical; `aof graph import … --force --json` there; then
`aof graph build . --json`, counting `graphify-out/cache/ast/` before and after.

| step | time | result |
|---|---|---|
| source, first full build | 299 s | `unchanged: false`, 19516 nodes / 39095 edges, stamp written |
| source, second build | 3 s | `unchanged: true`, graphify not run |
| export | 2 s | 528 files, stamp at `a816d6d`, graphify 0.8.44 |
| import into the second clone | 102 s, then 5.9 s on a re-run | `commitState: at-head`, cache 520 kept / 2 dropped, no warnings |
| build in the second clone | 4 s | `unchanged: true`, graphify not run; `cache/ast` 520 → 520 |

`verifies → tasks/01_import-restores-a-bundle-into-its-own-project.feature` (E5)

The first E5 run (before the fix) failed: 237 s and `unchanged: false` after the import, against 232 s for a
full build. That's F-01.

### The carry end to end, Windows control node → WSL worker

Procedure: the fixed `scripts/deploy-wsl.sh`, run by hand from `aof-166` into `~/source/aof` (WSL only:
`install-local --wsl` would also have replaced the Windows payload with this older base). Its log: native
`yarn workspaces focus` install, `node-pty : loads OK`. Then an LF checkout `~/scratch/aof-166`: a clone at
`a816d6d1` with the 33 uncommitted paths laid on with CRLF folded to LF, path list identical to Windows. The
deployed CLI (`~/source/aof/bin/aof.mjs`), with graphify 0.8.44 from the WSL store on PATH for these commands
only, imported the Windows bundle and built.

| step | time | result |
|---|---|---|
| import | 1.3 s | `at-head`, cache 442 kept / 78 rekeyed (CRLF → LF) / 2 dropped, no warnings |
| build | 0.87 s | `unchanged: true`, graphify not run; `cache/ast` 520 → 520 |
| `graph impact packages/knowledge/src/graphify.mjs` | — | `present: true`, 12 dependents, 2 dependencies: the same sets as Windows |

`verifies → tasks/03_a-bundle-does-not-depend-on-the-machine-that-built-it.feature` (@manual)

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | E5 failed: after an import, `aof graph build .` ran a full 237 s extraction (`unchanged: false`), slower than the 232 s full build. `graphify update <root>` re-extracts the whole corpus on every run, and graphify 0.8.44 never serves `.js/.mjs/.ts/.tsx/.vue/.svelte` from its AST cache (`_JS_CACHE_BYPASS_SUFFIXES`), so a carried cache saved nothing on this repo. | defect | high | blocker → `@bug @finding-F-01` outline in task 01 + fix: code-only builds stamp what they read (`graphify-out/aof-inputs.json`) and skip graphify while nothing they read has changed | product-owner (inline, operator ruling) | closed |
| F-02 | `aof graph build .` on this repo failed with `graphify-timeout` at the 120 s default; a full build takes 232–299 s. | defect | medium | fixed in the item: a code-only `update` build defaults to 15 min; every other spawn keeps 120 s | product-owner (inline) | closed |
| F-03 | `scripts/deploy-wsl.sh` has failed every run since 142: it copies `$SRC/bin/aof.mjs`, which the workspace move removed, so the WSL node still runs the pre-142 tree. | defect | medium | fixed in the item (operator ruling): the distro's `bin/aof.mjs` is written as a forward to `packages/core/bin/aof.mjs`; proved by the deploy above | product-owner (inline) | closed |

Recall at triage found no earlier finding with the same cause for any of the three. One observation recurred:
WSL's `aof --version` read `source bbf86a4+dirty` after the deploy of `a816d6d1`+166, which is
m63/F-63-K (the build id comes from git HEAD, not the deployed files). It isn't 166's, and it stays open there.

## Accept decision

**ACCEPTED** — 2026-10-20. The story lane, its importer sweep and the knowledge package lane are green.
Both `@manual` scenarios pass on real graphs, on Windows and across to WSL. The three findings are fixed in the
item and closed, and validate passes. There are no `@uat` scenarios.
