---
type: story
number: 00
slug: grill-me-ships-and-writes-nothing
title: "`aof:grill-me` ships for Claude Code and writes nothing — a learning command that reads the record and leaves every gate as it found it"
parent: 189
depends: []
status: not-started
owner: product-owner
created: 2026-11-01
updated: 2026-11-01
adrs: [ADR-001, ADR-002]
reads:
  - wiki/work/189_milestone_human-understanding-checks/SPEC.md
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-001
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-002
  - wiki/work/188_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-004
  - wiki/work/188_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-007
  - packages/learning/assets/commands/teach.md
  - packages/learning/test/teach-frame.suite.mjs
  - packages/core/assets/commands/explain.md
  - test/bundle/explain-command.test.mjs
  - test/arch/command/acd-continue-builds-only.test.mjs
  - packages/core/src/practices.mjs
  - packages/core/src/work/bundle-runtime.mjs
  - packages/core/src/asset-base.mjs
files:
  - packages/learning/assets/bundle.json
  - packages/learning/assets/commands/grill-me.md
  - packages/learning/src/contribution.mjs
  - packages/learning/test/index.mjs
  - packages/learning/test/grill-me-frame.suite.mjs
  - test/arch/command/acd-grill-me-writes-nothing.test.mjs
  - test/arch/command/index.mjs
  - packages/learning/README.md
  - .claude/commands/aof/grill-me.md
  - .aof/aof.lock.json
  - .aof/aof.apply-journal.json
  - packages/core/assets/manifest.json
  - README.md
  - docs/acd.md
  - wiki/prompt-audit.md
  - packages/core/test/bundle.suite.mjs
  - packages/core/test/bundle-runtime-variants.suite.mjs
  - packages/core/test/planning-cowork-plugin.suite.mjs
  - packages/core/test/hyperagent-runtime.suite.mjs
  - test/arch/planning/acd-cowork-skills-from-command-source.test.mjs
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - test/arch/bundle/acd-bundle-membership.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/bundle/bundle-asset-manifest-complete.test.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 189/00 · `aof:grill-me` ships for Claude Code and writes nothing

## User story

As **an operator who has just finished a story and wants to know what they actually understand**,
I want **a `/aof:grill-me <ref>` command that reads the story's record and checks me against it,
without starting a run, moving a status or writing a single file**,
so that **asking how well I understand the work can never be mistaken for, or change, whether the
work shipped**.

What lands (ADR-001, ADR-002): the `grill-me` member in `@aof/learning`'s bundle for Claude Code only,
`grill-me.md`'s frame (its config, the read-only promise, what it accepts and refuses, its outcomes), the
renders, and every census that counts commands. The checks themselves are 01's.

## Tasks

- [ ] 00 [aof:grill-me ships for Claude Code through the practices registry](tasks/00_grill-me-ships-for-claude-through-the-practices-registry.feature)
- [ ] 01 [a check reads the record and writes nothing](tasks/01_a-check-reads-the-record-and-writes-nothing.feature)

## Notes

- The censuses are 188/02's found write set, minus the door: a check has no flag on `continue`, so
  `test/fixtures/application/command-inventory.json` and the door's suites are untouched.
- `packages/learning/test` gains `grill-me-frame.suite.mjs`, and `test/arch/command` gains FF-18901's
  file (32 → 33). Both budget rows restate their reasons.
- Codex and OpenCode render no `grill-me` (ADR-001 §2), so only the Claude render is in `files:`.
