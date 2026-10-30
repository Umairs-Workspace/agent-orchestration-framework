---
type: story
number: 02
slug: aof-work-update-migrates-the-old-shape
title: "aof work update rewrites an old-shape memory config to the new node, and aof work init writes only the new shape"
parent: 180
status: in-review
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
depends: [180/01]
reads: [wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-005, wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-006, packages/knowledge/src/memory-config.mjs, packages/knowledge/src/memory.mjs, packages/core/src/work/headroom.mjs, packages/core/src/workspace.mjs, test/arch/store/acd-no-clobber-without-force.test.mjs]
files: [packages/core/src/work/update.mjs, packages/core/src/application/bindings/commands/init-update.mjs, packages/core/src/application/bindings/work/init.mjs, packages/core/test/work-update.suite.mjs, test/work/work-init-config.test.mjs, packages/core/assets/commands/init.md, .claude/commands/aof/init.md, .opencode/commands/aof/init.md, .agents/skills/aof-init/SKILL.md, .agents/skills/aof-init/agents/openai.yaml, .codex/aof/workflows/workflow-contract.md, packages/core/assets/manifest.json, packages/core/assets/variants/codex/workflow.md]
---
# 02 · aof work update rewrites an old-shape memory config to the new node, and aof work init writes only the new shape

## User story

As an operator upgrading a project that already uses aof memory,
I want `aof work update` to move my old memory keys into the new node and leave everything else in
my config exactly as I wrote it,
so that I take the new shape with the update I already run, and nothing I did not ask for changes.

## Tasks

- [x] `tasks/00_update-moves-the-old-keys-into-the-node.feature` — every old key moves into the node, in the node's key order; nothing moves means no write; a conflict is left as written
- [x] `tasks/01_init-writes-only-the-new-shape-and-selects-local.feature` — a new project's config is `{"backend":"local"}` in the new shape; an existing selection is kept

## Notes

- 180/ADR-005 and ADR-006. Wave 2, parallel with 03. It calls `rewriteLegacyMemoryConfig` from story
  01's `memory-config.mjs`, and it restates no mapping.
- The rewrite goes through `work/headroom.mjs`'s `readConfig`/`writeConfig`, the one read-merge-write
  127/ADR-005 governs. A config with no move is not written at all.
- `aof work init` already writes only `memory.backend`, and this story pins that. `180/02 Q1` was
  answered on 2026-10-30: a new project's backend is `local`, not `graphify`.
  `DEFAULT_MEMORY_BACKEND`, the `/aof:init` command asset and its three rendered copies (re-rendered
  with `aof work update` in this repository) and the init-config suite change here. An existing
  project's selection is never changed.
