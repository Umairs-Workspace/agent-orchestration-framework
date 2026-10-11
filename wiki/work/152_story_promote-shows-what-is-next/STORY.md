---
type: story
number: 152
slug: promote-shows-what-is-next
title: "Promote shows what to promote next — the ready backlog items in order, and picks the first on request"
status: done
owner: product-owner
created: 2026-10-05
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
reads:
  - packages/work/src/commands/promote.mjs
  - packages/work/src/dependencies.mjs
  - packages/work/src/discovery.mjs
  - packages/work/src/records.mjs
  - packages/work/src/insertion/scaffold.mjs
  - packages/work/src/promote/promotion.mjs
  - packages/core/src/application/bindings/commands/promote.mjs
  - packages/core/assets/commands/promote.md
  - test/work/stream/index.mjs
  - test/work/stream/work-promote-mints-the-number.test.mjs
  - test/work/stream/work-backlog-archive-enumerate.test.mjs
  - test/arch/work/acd-work-insert-command-bundle-parity.test.mjs
  - test/arch/planning/acd-one-promotion-engine.test.mjs
  - test/arch/store/acd-cache-read-surface-boundary.test.mjs
  - test/command/application-assembly.test.mjs
files:
  - packages/work/src/commands/promote.mjs
  - packages/work/src/promote/candidates.mjs
  - packages/work/src/discovery.mjs
  - test/work/stream/work-promote-shows-candidates.test.mjs
  - test/work/stream/index.mjs
  - test/arch/work/acd-work-insert-command-bundle-parity.test.mjs
  - test/fixtures/application/command-inventory.json
  - packages/core/assets/commands/promote.md
  - packages/core/assets/manifest.json
  - packages/core/src/adapters.mjs
  - .claude/commands/aof/promote.md
  - .opencode/commands/aof/promote.md
  - .codex/skills/aof-promote/SKILL.md
  - .aof/aof.lock.json
---
# 152 · Promote shows what to promote next

## User story

As **the operator who schedules work by promoting backlog items into the stream**,
I want **`aof:promote --show-candidates` to list the backlog items that can be promoted now, in the
order they should go, and `aof:promote --next-item` to promote the first one**,
so that **I stop opening every backlog record and tracing its `depends:` by hand to work out what is
unblocked. That reading is slow, and getting it wrong costs a refused promote, or an item scheduled
ahead of work it needs.**

## Tasks

- [x] `tasks/00_promote-lists-the-candidates.feature` — `aof work promote --show-candidates` lists
  the items promote would accept, ordered by what each unblocks, then oldest, then slug, and then
  the waiting items with what each waits on. It writes nothing.
- [x] `tasks/01_promote-next-item-promotes-the-head.feature` — `--next-item` promotes the head of
  that list through the named promote's own path, refuses `promote-no-candidates` when there is
  none, and refuses conflicting arguments.
- [x] `tasks/02_the-promote-command-offers-both-flags.feature` — `/aof:promote` offers both modes,
  drives the verb's `--json` face, and never picks an item itself.

## Notes

- **Today:** `aof work promote` already gates on `depends:` (ADR-003 §6), refusing with
  `promote-depends-backlog` / `promote-depends-unresolved`. It only answers "can THIS item go?"
  after you name one. It never answers "which items can go?".
- **Candidate** (Q1): a backlog item the depends gate (`classifyDepends`) accepts now. A
  dependency that is in the stream but not done does not block. The rule is the gate's, never a
  second copy of it.
- **Order** (Q2): first by how many backlog items it unblocks, then by oldest `created:`, then by
  the backlog listing's order (group path, then slug). An item with no `created:` sorts after every
  dated one. **"Unblocks"** (Q6, defaulted) counts every backlog item that waits on it, directly or
  through another backlog item.
- **Waiting items** (Q3): listed after the candidates, each with the gate's own offenders
  (`entry`, `code`).
- **`--next-item`** (Q4, defaulted): promotes the head of that list through `promoteRow`, the path a
  named promote takes. It takes `--at`/`--yes` with the same meaning. When there is no candidate it
  refuses `promote-no-candidates` and nothing changes.
- **Arguments** (Q5, defaulted): a slug, `--next-item` and `--show-candidates` are mutually
  exclusive, and `--at`/`--yes` do not combine with `--show-candidates`. A conflict is refused as
  `promote-flag-conflict` before the work tree is read.
- **Review close (2026-10-06):**
  - **Fixed:** `-h` reached free-text resolution as a slug and promoted `a-halted-lane-is-reaped`
    by substring (measured on the real tree, restored from git). A flag-shaped argument is now
    `promote-flag-conflict`.
  - **Fixed:** `byGroupThenSlug` is exported from `discovery.mjs`, its one home, not copied.
  - **Fixed at verify (F-01):** the claude renderer dropped `argument-hint` for every command. It now
    renders it, so task 02 checks the hint in the claude and codex copies. OpenCode has no such field.
