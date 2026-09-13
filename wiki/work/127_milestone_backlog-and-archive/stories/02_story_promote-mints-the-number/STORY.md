---
type: story
number: 02
slug: promote-mints-the-number
title: "Promote mints the number — one verb, one home for the next number, and insert-* become what promote --at already is"
parent: 127
depends: [1]
status: in-review
owner: product-owner
created: 2026-09-11
updated: 2026-09-13
adrs: [ADR-003, ADR-005]
reads:
  - wiki/work/127_milestone_backlog-and-archive/SPEC.md
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-001
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-002
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-003
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-005
  - wiki/work/127_milestone_backlog-and-archive/stories/01_story_one-enumerator-three-roots/OUTCOME.md
  - wiki/work/41_milestone_work-item-insertion/ARCHITECTURE.md#ADR-001
  - src/work.mjs
  - src/work/reindex.mjs
  - src/effects/stream-transitions.mjs
  - .aof/templates/work/milestone/SPEC.md
  - test/work/stream/work-backlog-archive-enumerate.test.mjs
  - test/arch/planning/acd-promotion-creates-one-type.test.mjs
files:
  - src/commands/promote.mjs
  - src/commands/insert-shared.mjs
  - src/commands/insert-milestone.mjs
  - src/commands/insert-chore.mjs
  - src/commands/insert-uat.mjs
  - src/commands/promote-finding-to-chore.mjs
  - src/commands/promote-gap-to-chore.mjs
  - src/commands/continue.mjs
  - src/work-promote/promotion.mjs
  - src/command-core.mjs
  - src/cli.mjs
  - src/work/init.mjs
  - src/commands/init-update.mjs
  - src/bundle/bundle.json
  - src/bundle/commands/promote.md
  - .claude/commands/aof/promote.md
  - .codex/skills/aof-promote/SKILL.md
  - .opencode/commands/aof/promote.md
  - src/bundle/commands/add-milestone.md
  - src/bundle/commands/add-chore.md
  - src/bundle/commands/add-spike.md
  - src/bundle/commands/add-story.md
  - src/bundle/commands/add-uat.md
  - src/bundle/commands/insert-milestone.md
  - src/bundle/commands/insert-chore.md
  - src/bundle/commands/insert-uat.md
  - src/bundle/commands/refine.md
  - src/bundle/commands/continue.md
  - test/work/stream/work-promote-mints-the-number.test.mjs
  - test/work/stream/work-insert-top-level-places.test.mjs
  - test/work/stream/index.mjs
  - test/work/work-init-config.test.mjs
  - test/work/work-intake-write-side.test.mjs
  - test/work/index.mjs
  - test/planning/promote-finding-to-chore.test.mjs
  - test/arch/work/acd-one-mint.test.mjs
  - test/arch/work/acd-intake-write-side-only.test.mjs
  - test/arch/work/acd-number-null-safe.test.mjs
  - test/arch/work/acd-work-insert-command-bundle-parity.test.mjs
  - test/arch/work/index.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
  - test/arch/work/acd-work-command-route-coverage.test.mjs
  - test/arch/store/acd-cache-read-surface-boundary.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - test/command/command-core-contract.test.mjs
  - test/bundle/bundle.test.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - .claude/commands/aof/add-milestone.md
  - .codex/skills/aof-add-milestone/SKILL.md
  - .opencode/commands/aof/add-milestone.md
  - .claude/commands/aof/add-chore.md
  - .codex/skills/aof-add-chore/SKILL.md
  - .opencode/commands/aof/add-chore.md
  - .claude/commands/aof/add-spike.md
  - .codex/skills/aof-add-spike/SKILL.md
  - .opencode/commands/aof/add-spike.md
  - .claude/commands/aof/add-story.md
  - .codex/skills/aof-add-story/SKILL.md
  - .opencode/commands/aof/add-story.md
  - .claude/commands/aof/add-uat.md
  - .codex/skills/aof-add-uat/SKILL.md
  - .opencode/commands/aof/add-uat.md
  - .claude/commands/aof/insert-milestone.md
  - .codex/skills/aof-insert-milestone/SKILL.md
  - .opencode/commands/aof/insert-milestone.md
  - .claude/commands/aof/insert-chore.md
  - .codex/skills/aof-insert-chore/SKILL.md
  - .opencode/commands/aof/insert-chore.md
  - .claude/commands/aof/insert-uat.md
  - .codex/skills/aof-insert-uat/SKILL.md
  - .opencode/commands/aof/insert-uat.md
  - .claude/commands/aof/refine.md
  - .codex/skills/aof-refine/SKILL.md
  - .opencode/commands/aof/refine.md
  - .claude/commands/aof/continue.md
  - .codex/skills/aof-continue/SKILL.md
  - .opencode/commands/aof/continue.md
  - src/bundle/manifest.json
  - .aof/aof.lock.json
schema: 1
aofVersion: 0.1.0
---
# 02 · Promote mints the number

## User story

As **an operator capturing an idea before deciding whether it is next**,
I want **`aof:add-*` to land the item un-numbered under `backlog/`, and one verb —
`aof work promote <slug> [--at P]` — to be the moment it gets its number and enters the stream**,
so that **the stream's order is the order of work rather than the order of ideas**, the `insert-*`
family stops being a second numbering engine, and every renumber that happens is the one the
operator asked for by naming a position.

What lands: `aof work promote <slug> [--at P] [--yes] [--json]` in `src/commands/promote.mjs` (and
`/aof:promote`) — append through `appendPosition` or open `--at P` through the EXISTING reindex
engine, MOVE the backlog folder into the stream, stamp `number:` surgically (41/ADR-001), validate
`depends:`; `insert-milestone|chore|uat` become scaffold-into-backlog + `promote --at P`; `work.intake`
is the write-side default the `aof:add-*` prompts read; `aof:refine` / `aof:continue` promote as
step 0. The `promote-*-to-chore` faces are unchanged (71/ADR-003).

## Tasks

- [x] `tasks/00_promote-mints-the-number.feature` — `aof work promote <slug>` resolves exactly one backlog row, appends through `appendPosition`, renames the leaf into the stream and stamps `number:` surgically
- [x] `tasks/01_at-opens-the-slot-through-the-engine.feature` — `--at P` shifts through the existing seam and gate, refuses an archived number, and the rewrite reaches all three roots
- [x] `tasks/02_depends-are-validated-at-promotion.feature` — a backlog item's `depends:` is a planning note until promotion checks it: numbers resolve live or archived, a backlog slug is refused
- [x] `tasks/03_insert-verbs-are-aliases-of-promote.feature` — `insert-milestone|chore|uat` are scaffold-into-backlog + `promote --at`; `insert-story` keeps the nested engine; `insert-shared` shrinks
- [x] `tasks/04_intake-is-the-write-side-default.feature` — `work.intake` written only into a config init-config creates, read by promote's refusal text and nowhere on the read side; `/aof:promote` ships; a phase door refuses a backlog ref
- [ ] `tasks/05_the-prompts-have-one-door.feature` — the `aof:add-*` prompts land on the intake and compute no number; `aof:refine` / `aof:continue` promote as step 0
- [ ] `tasks/06_the-two-controls-go-red-on-contact.feature` — FF-12703 and FF-12704 land, go red under their probes, and `insert-shared.mjs` is measured

## Notes

- Lands FF-12703 and FF-12704. Depends on 01 for the backlog row shape `promote` resolves through.
- Ratified in the contract beat (2026-09-12), sharpening ADR-003 without reopening it — each
  spelled out in the task that binds it: `insert-story` is not an alias (the nested slot-open keeps
  its caller; FF-12703 binds the TOP-LEVEL one to `promote.mjs`); `runInsertTopLevel` moves to
  `promote.mjs` (the other import direction is a cycle); `appendPosition` has four callers; a phase
  door refuses a backlog ref (a mint inside a dispatched run reads a worker's stream); the shift
  rewrite reaches all three roots and `--at` refuses an archived number. The ledgers learn `work:promote`.
- `work.intake: "backlog"` is written by `initConfig` (chore 51) only into a config it creates.
- A promoted item enters the fleet cache as an appended insert does today; the cache-first row
  shape is story 04's. `insert-story.md` is untouched.
