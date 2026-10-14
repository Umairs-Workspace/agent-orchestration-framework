---
type: story
number: 1
slug: wiki-source-citations-are-checked
title: "Wiki source citations are checked by doctor"
parent: 161
status: in-review
owner: product-owner
created: 2026-10-14
updated: 2026-10-14
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/161_milestone_the-memory-wiki-stays-true/ARCHITECTURE.md#adr-001, packages/work/src/commands/doctor.mjs, packages/work/src/cited-path-resolve.mjs, packages/work/src/citation-history.mjs, packages/work/src/audit/controls.mjs, packages/work/src/doctor/index.mjs, packages/core/src/application/bindings/commands/doctor.mjs, packages/work/test/doctor.test.mjs, test/work/doctor-command-core.test.mjs, test/audit/cited-path-resolve.test.mjs, test/arch/command/acd-cited-path-resolves.test.mjs, test/arch/command/index.mjs, test/support/cli-spawn.mjs, scripts/test-unit.mjs, scripts/test.mjs, .aof/aof.config.json]
files: [packages/work/src/wiki-citations.mjs, packages/work/src/commands/doctor.mjs, test/work/wiki-citations.test.mjs, test/work/doctor-command-core.test.mjs, scripts/test-unit.mjs, test/arch/command/acd-wiki-citation-resolver.test.mjs, test/arch/command/index.mjs]
---
# 161/01 · Wiki source citations are checked by doctor

## User story

As a maintainer using the wiki to understand AOF,
I want doctor to identify source citations that cannot resolve,
so that moved or removed code cannot silently leave misleading documentation.

## Tasks

- [x] `tasks/01_report-unresolved-source-citations.feature` — actionable diagnostics and correct file resolution.
- [x] `tasks/02_check-the-workspace-wiki.feature` — complete scope, command behavior and a shipped-command negative probe.

## Notes

The command owns the impure workspace probe; the existing item engine stays pure.
The read/write proposal is incomplete because the fresh graph was unavailable.
Retain its source/citation paths; replace its conventional doctor.test.mjs write
with the existing doctor-command-core suite, which exercises the actual command
and CLI. Keep doctor.test.mjs as context. The new probe suite is registered in
test-unit; the architecture suite is registered in the command directory index.
Own FF-16101 through the milestone's ADR-001. Do not edit any delivered feature.

Dependencies were checked at the milestone: 148, 153 and 157 are done; this story
needs no sibling output. Warnings remain advisory except with existing --strict.
