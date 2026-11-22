---
type: story
number: 01
slug: apply-merges-keep-the-user-s-entries
title: "Apply's merges keep the user's entries — at every merge point, CLAUDE.md, .mcp.json and opencode's AGENTS.md merged rather than replaced, twice to the same tree, and a collision refused before any write"
parent: 204
depends: [00]
status: done
owner: product-owner
created: 2026-11-21
updated: 2026-11-22
adrs: [ADR-001, ADR-002, ADR-006]
reads:
  - wiki/work/204_milestone_apply-and-init-goldens/stories/01_story_apply-merges-keep-the-user-s-entries/EXAMPLES.md
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-001
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-002
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-006
  - test/golden/assets-apply.lane.mjs
  - test/golden/assets-apply.test.mjs
  - test/support/golden/harness.mjs
  - test/support/golden/baseline-store.mjs
  - scripts/golden.mjs
  - packages/core/src/application/bindings/commands/assets/apply.mjs
  - packages/core/src/adapters.mjs
  - packages/core/src/runtime-config.mjs
  - packages/core/src/claude-settings.mjs
  - packages/core/src/lock.mjs
files:
  - test/golden/assets-merge.lane.mjs
  - test/golden/assets-merge.test.mjs
  - test/golden/index.mjs
  - test/support/golden/lanes.mjs
  - test/golden/baselines/assets-merge/
  - test/golden/baselines/assets-apply/
  - test/golden/baselines/work-init/
  - test/golden/baselines/work-update/
  - packages/core/src/codex-settings.mjs
  - packages/core/src/render-plan.mjs
  - packages/core/test/codex-ownership.suite.mjs
  - packages/core/test/render-plan.suite.mjs
  - test/arch/store/acd-codex-output-ownership.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 204/01 · Apply's merges keep the user's entries

## User story

As **a user whose project already holds its own `CLAUDE.md`, `.mcp.json`, settings, Codex config
and `AGENTS.md` when they run `aof assets apply`**,
I want **apply to add aof's entries beside mine and never replace what I wrote**,
so that **adopting aof in an existing project costs me none of my own guidance, MCP servers,
hooks or settings, and a developer who breaks a merge sees it in a baseline before I do**.

What lands (ADR-002): the user's files at every merge point as data, the `assets-merge` lane's
five scenarios and their baselines, and the fix that makes `CLAUDE.md`, `.mcp.json` and opencode's
`AGENTS.md` co-authored files, merged with recorded ownership like Codex's. Today apply replaces
the first two whole. The held refusal of ADR-006 §2 lands here too, with the collision it
resembles.

## Tasks

- [x] `tasks/00_the-user-s-entries-survive-every-merge.feature` (R1): over the user's settings, Codex config and hooks, root and nested `AGENTS.md` and ignore files, only aof's entries move.
- [x] `tasks/01_claude-md-mcp-json-and-opencode-agents-md-are-merged.feature` (R2): the three files apply replaced whole become merges, and FF-20401 holds the rule.
- [x] `tasks/02_applying-twice-over-the-user-s-files-changes-nothing.feature` (R3): a second apply over the merged tree skips every file aof owns.
- [x] `tasks/03_two-writers-claiming-one-file-refuse-before-any-write.feature` (R4): a user's MCP server named as aof's refuses, and the held `AGENTS.md` conflict refuses, both writing nothing.

## Notes

- The fix moves story 00's `every-kind` and `claude` baselines: `CLAUDE.md` gains its managed
  block, the lock records `guidance` and `mcp-servers` ownership, and the journal gains the two
  co-authored Claude outputs. Re-derive them in this diff with `--lane assets-apply --update`, and
  read the diff: it must be exactly that.
- `.claude/.gitignore` written by the user is kept today with a `drift-warning`. That is held, not
  changed.
