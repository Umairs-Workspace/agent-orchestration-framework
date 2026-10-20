---
type: story
number: 166
slug: a-built-graph-travels-to-another-machine
title: "A built graph travels to another machine — a second clone reuses it instead of paying for graphify again"
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-20
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/166_story_a-built-graph-travels-to-another-machine/EXAMPLES.md
  - wiki/work/archive/10_milestone_graphify-memory-backend/ARCHITECTURE.md#ADR-005
  - packages/knowledge/src/graph-normalize.mjs
  - packages/knowledge/src/commands/graph-impact.mjs
  - packages/knowledge/src/commands/shared.mjs
  - packages/core/src/aof-gitignore.mjs
  - packages/execution/src/worktrees.mjs
  - test/arch/graph/acd-graph-no-face-spawn.test.mjs
  - test/arch/graph/acd-graph-privacy-boundary.test.mjs
  - test/graph/graph-command-core.test.mjs
  - test/support/cli-spawn.mjs
files:
  - packages/knowledge/src/graph-bundle.mjs
  - packages/knowledge/src/commands/graph-export.mjs
  - packages/knowledge/src/commands/graph-import.mjs
  - packages/knowledge/src/commands/graph-build.mjs
  - packages/knowledge/src/graphify.mjs
  - packages/core/src/application/bindings/commands/graph/build.mjs
  - packages/core/src/application/bindings/graphify.mjs
  - packages/knowledge/package.json
  - packages/knowledge/src/commands.mjs
  - packages/core/src/application/bindings/commands/graph/export.mjs
  - packages/core/src/application/bindings/commands/graph/import.mjs
  - packages/core/src/application/bindings/command-core.mjs
  - packages/core/src/application/assemble.mjs
  - test/graph/graph-bundle.test.mjs
  - test/graph/index.mjs
  - test/arch/graph/acd-graph-command-cli-bijection.test.mjs
  - test/arch/graph/acd-codebase-grounding-via-commands.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/command/application-assembly.test.mjs
  - test/arch/graph/acd-codebase-grounding-no-parse.test.mjs
  - test/bundle/yarn-installation.test.mjs
  - scripts/workspace-runtime-audit.json
  - scripts/deploy-wsl.sh
  - README.md
---
# 166 · A built graph travels to another machine

## User story

As **the operator who runs the same aof project on more than one machine**,
I want **to carry the code graph already built on one machine over to a clone on another, and have
the next `aof graph build` there update it incrementally**,
so that **I don't pay for a second full graphify extraction (time and LLM tokens) just because
the work moved machines. The graph stays out of git (10/ADR-005: derived and disposable, never a
second authoritative copy), so today copying the folder by hand is the only way to reuse it.**

## Tasks

- [x] 00 · [export writes the graph to the named path](tasks/00_export-writes-the-graph-to-the-named-path.feature)
- [x] 01 · [import restores a bundle into its own project](tasks/01_import-restores-a-bundle-into-its-own-project.feature)
- [x] 02 · [import says how stale the graph is](tasks/02_import-says-how-stale-the-graph-is.feature)
- [x] 03 · [a bundle does not depend on the machine that built it](tasks/03_a-bundle-does-not-depend-on-the-machine-that-built-it.feature)

## Notes

- Scope: the CODE graph only, `<projectRoot>/graphify-out/` (gitignored). It's read by
  `aof graph build/query/impact/triage`, test selection (`work/src/testing/select.mjs`),
  story-contract derive, the seam-liveness audit and the graph MCP server. The verb belongs in the
  existing `aof graph` family; never add a sibling.
- The memory store is out of scope. Its records are parsed from the committed `.md` stream, and
  `aof work memory reindex` rebuilds them cheaply. Its optional re-rank graph
  (`.aof/memory-graph/graphify-out/`) fails soft.
- The bundle must carry graphify's own cache. Without it, the receiving build is a full re-extract.
- Stamp the source commit (and graph age) into the bundle so the receiver can show how stale it is.
  The agent prompts already surface a reused graph's age.
- Resolved at refine (measured 2026-10-20): `graph.json`, `manifest.json` and the AST cache are repo-relative; `cache/stat-index.json` and `.graphify_root` are absolute and machine-local; CRLF and LF checkouts key the cache differently while extracting identically. See EXAMPLES.md and PLAN.md.
- Operator rulings (166 Q1–Q4): the path is always required; an existing target is replaced only with `--force`; a graphify version mismatch warns; a bundle from another project is refused with no override.
- Verify finding F-01 (2026-10-20): `graphify update` re-extracts the whole corpus on every run and never caches JS/TS (`_JS_CACHE_BYPASS_SUFFIXES`), so the carried cache alone could not make E5 hold. Fixed in this story: a code-only build stamps what it read (`graphify-out/aof-inputs.json`, line-ending-neutral, carried in the bundle) and the next build runs no graphify while nothing it read has changed. F-02: the code-only build's default budget is 15 minutes (a full build here is 232 s).
- Out of scope: committing either graph, or syncing graphs over the mesh automatically.
