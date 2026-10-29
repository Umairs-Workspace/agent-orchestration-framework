---
type: story
number: 01
slug: aof-memory-is-the-command
title: "aof memory is the command and aof work memory its alias"
parent: 178
status: done
owner: product-owner
created: 2026-10-29
updated: 2026-10-29
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/178_milestone_memory-top-level-with-corpora/ARCHITECTURE.md#adr-001, packages/contracts/src/commands.mjs, packages/core/src/application/bindings/spine/face.mjs, packages/core/src/application/assemble.mjs, packages/work/src/commands/promote.mjs, packages/work/src/commands/feedback.mjs, test/arch/command/acd-readme-names-what-ships.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/support/source-slice.mjs]
files: [packages/knowledge/src/commands/memory.mjs, packages/knowledge/src/commands.mjs, packages/knowledge/src/memory.mjs, packages/knowledge/src/commands/import-milestone.mjs, packages/core/src/application/bindings/commands/work/memory.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/src/cli.mjs, test/fixtures/application/command-inventory.json, test/arch/work/acd-work-command-cli-bijection.test.mjs, test/arch/work/acd-work-command-route-coverage.test.mjs, test/arch/command/acd-work-memory-routed.test.mjs, test/arch/command/acd-memory-alias-one-implementation.test.mjs, test/arch/command/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/command/work-memory-command.test.mjs, test/command/command-core-contract.test.mjs, test/memory/import-command-core.test.mjs, packages/knowledge/test/memory-meta-normalised.suite.mjs]
---
# 01 · aof memory is the command and aof work memory its alias

## User story

As an operator or an agent recalling prior knowledge,
I want memory's verbs under `aof memory`, with `aof work memory` still answering exactly as it does,
so that memory reads as the concern of its own that it now is, and nothing that already calls the
old path breaks while the prompts move over.

## Tasks

- [x] `tasks/00_aof-memory-answers-through-both-doors.feature` — every verb answers under `aof memory`, and the alias answers the same bytes
- [x] `tasks/01_help-and-hints-name-aof-memory.feature` — help, usage and every CLI hint spell `aof memory`; the alias is one implementation (FF-17801)

## Notes

- 178/ADR-001: one descriptor, two registered doors. The alias spreads the canonical command and
  replaces only `id` and `cli.route`. It keeps the id `work:memory`.
- The bar is byte for byte across all six verbs and both projections (`--block`, `--json`),
  through both doors. The one intended difference is the usage text, which spells `aof memory`.
- `aof --help` gains a `memory` family. `KNOWLEDGE_COMMAND_IDS` gains `memory`.
- FF-17801 lands here.
- Ratified while authoring this contract (STATE, 2026-10-29): the stale-store hint
  (`memory.mjs` status), import-milestone's reindex warning and `cli.mjs`'s work-command examples
  spell `aof memory` too, not only the usage text. `aof --help` needs a rule for it: a one-word
  route lands in Usage unless `HELP_FAMILY_TITLES` names its word as a family.
- The new FF file moves the `test/arch/command` budget row (allowance 0), so the budget control
  is in `files:`. The canonical door's cases join `work-memory-command.test.mjs` rather than a new
  suite, because `test/command` is at its ceiling of 10.
- Shares `memory.mjs` and `memory-meta-normalised.suite.mjs` with 03 (the stale hint versus the
  version pins), so the two serialise.
