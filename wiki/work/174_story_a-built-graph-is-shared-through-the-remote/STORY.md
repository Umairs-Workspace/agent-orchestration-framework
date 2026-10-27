---
type: story
number: 174
slug: a-built-graph-is-shared-through-the-remote
title: "A built graph is shared through the project's own remote — a commit's graph is built once, and every other clone, worktree and node fetches it"
status: done
owner: product-owner
created: 2026-10-27
updated: 2026-10-27
depends: [173]
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/174_story_a-built-graph-is-shared-through-the-remote/EXAMPLES.md
  - wiki/work/174_story_a-built-graph-is-shared-through-the-remote/ARCHITECTURE.md#ADR-001
  - wiki/work/174_story_a-built-graph-is-shared-through-the-remote/ARCHITECTURE.md#ADR-002
  - wiki/work/174_story_a-built-graph-is-shared-through-the-remote/ARCHITECTURE.md#ADR-003
  - wiki/work/173_spike_git-ref-graph-cache/SPIKE.md
  - wiki/work/archive/38_milestone_cross-machine-worker-execution/ARCHITECTURE.md#ADR-016
  - packages/knowledge/src/graph-normalize.mjs
  - packages/knowledge/src/graphify.mjs
  - packages/knowledge/src/memory/graphify-backend.mjs
  - packages/execution/src/worktrees.mjs
  - packages/core/src/aof-gitignore.mjs
  - packages/core/src/application/bindings/graphify.mjs
  - packages/core/src/application/bindings/commands/init-update.mjs
  - test/arch/graph/acd-graph-no-face-spawn.test.mjs
  - test/arch/memory/acd-memory-index-never-on-mesh.test.mjs
  - test/support/cli-spawn.mjs
files:
  - packages/knowledge/src/graph-share.mjs
  - packages/knowledge/src/graph-bundle.mjs
  - packages/knowledge/src/commands/graph-build.mjs
  - packages/knowledge/src/commands/graph-export.mjs
  - packages/knowledge/src/commands/graph-import.mjs
  - packages/knowledge/src/commands/graph-fetch.mjs
  - packages/knowledge/src/commands/graph-publish.mjs
  - packages/knowledge/src/commands/graph-prune.mjs
  - packages/knowledge/src/commands.mjs
  - packages/knowledge/package.json
  - packages/core/src/application/bindings/commands/graph/build.mjs
  - packages/core/src/application/bindings/commands/graph/fetch.mjs
  - packages/core/src/application/bindings/commands/graph/publish.mjs
  - packages/core/src/application/bindings/commands/graph/prune.mjs
  - packages/core/src/application/bindings/command-core.mjs
  - packages/core/src/application/assemble.mjs
  - schemas/aof.schema.json
  - test/graph/graph-share.test.mjs
  - test/graph/graph-bundle.test.mjs
  - test/graph/index.mjs
  - test/arch/graph/acd-graph-share-code-graph-only.test.mjs
  - test/arch/graph/acd-graph-share-never-forces.test.mjs
  - test/arch/graph/index.mjs
  - test/arch/graph/acd-graph-command-cli-bijection.test.mjs
  - test/arch/graph/acd-codebase-grounding-via-commands.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/command/application-assembly.test.mjs
  - test/bundle/yarn-installation.test.mjs
  - scripts/workspace-runtime-audit.json
  - README.md
---
# 174 · A built graph is shared through the project's own remote

## User story

As **the operator who works on one project from several clones, worktrees and mesh nodes (the
Windows control node, the WSL worker, the Mac worker)**,
I want **`aof graph build` to fetch the codebase graph for the commit I'm on from the project's own
git remote when it has none, and to publish a clean build there for the next clone**,
so that **a commit's graph is built once, anywhere, and the ~5-minute full build (299 s measured in
166) no longer repeats on every machine and every loop lane's worktree. Today the only way around it
is `aof graph export` → move a file → `aof graph import` by hand, per clone, which nobody does
consistently, so agents ground structural decisions in a stale graph or wait for a rebuild.**

## Tasks

- [x] 00 · [build takes the graph published for its commit](tasks/00_build-takes-the-graph-published-for-its-commit.feature)
- [x] 01 · [only a clean default-branch graph is published, once](tasks/01_only-a-clean-default-branch-graph-is-published-once.feature)
- [x] 02 · [sharing is opt-in and runs by hand](tasks/02_sharing-is-opt-in-and-runs-by-hand.feature)
- [x] 03 · [only the newest twenty graphs are kept](tasks/03_only-the-newest-twenty-graphs-are-kept.feature)

## Notes

Grounded in spike `git-ref-graph-cache` (its `## Finding` is the design brief). The points refine
must carry into the contract:

- **Transport.** A ref outside the branch namespace pointing at the bundle blob:
  `refs/aof/graph/v<bundleVersion>/<commit-sha>`. Measured on GitHub: accepted, ~1 s fetch, 1.3 MB
  bundle, never downloaded by a plain clone. No new service, no new credential.
- **Key by commit; validate by inputs.** The `aof-inputs.json` digest exists only after a build, so
  it confirms a fetched graph (`inputsCurrent`) instead of locating one.
- **Publish only a clean build.** Skip with a reason when the tree has untracked or modified
  non-ignored files. `listCloneFiles` reads `--others`, so a dirty build would push uncommitted
  work's structure to the remote, where it stays fetchable by sha even after the ref is deleted.
- **No forced overwrite.** Git refuses to move a non-commit ref without `--force`. Keep that
  refusal: the first publish of a commit wins, and a later one reports "already published". Bundles
  are never compared, because each node stamps its own build time (ADR-003 corrects the spike here).
- **Surface.** `aof graph build` fetches on a miss and publishes after a clean build. `aof graph
  publish` / `aof graph fetch` do each step explicitly. A prune verb keeps the last N commits on the
  default branch. One opt-in switch, e.g. `graph.share: "git-refs" | "off"`. A node without push
  access fetches only.
- **ADR (architect).** Scope the remote cache to the **code graph only**; the memory index and the
  memory work graph (`.aof/memory-graph/`) stay excluded under `acd-memory-index-never-on-mesh`
  invariant 3. Arm a guard that the memory modules never import the ref transport, and that the
  transport never touches a mesh stream.
- **Out of scope.** Walking back to an earlier commit's graph (2 of the last 24 `main` commits would
  have hit), forks/mirrors, and cross-project sharing. Export/import stay for remotes you can't
  push to.
