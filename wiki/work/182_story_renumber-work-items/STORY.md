---
type: story
number: 182
slug: renumber-work-items
title: "Renumber a work item without shifting other work or losing memory"
status: done
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/182_story_renumber-work-items/ARCHITECTURE.md
files:
  - README.md
  - packages/work/package.json
  - packages/work/src/renumber.mjs
  - packages/work/src/ref-history.mjs
  - packages/work/src/stream-transitions.mjs
  - packages/work/src/commands/renumber.mjs
  - packages/work/src/commands.mjs
  - packages/work/src/memory-accounting.mjs
  - packages/core/src/application/assemble.mjs
  - packages/core/src/application/bindings/command-core.mjs
  - packages/core/src/application/bindings/effects/stream-transitions.mjs
  - packages/core/src/application/bindings/commands/renumber.mjs
  - test/work/stream/work-renumber.test.mjs
  - test/work/stream/index.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
  - test/arch/work/acd-work-command-route-coverage.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
---
# 182 · Renumber work items

## User story
As an operator integrating parallel AOF work streams, I want to assign an existing item a vacant number through a supported verb, so that its links, linked stores and memory remain usable without shifting unrelated work.

## Tasks
- [x] [00 · Guard and preview a renumber](tasks/00_renumber.feature)
- [x] [01 · Preserve reference and memory identity](tasks/01_references-memory.feature)

## Origin
Requested after acceptance of unattended-loop fixes: move that story from 175 to 181 and ship the reusable verb.

## Accept decision

Accepted on 2026-10-30: both task contracts are satisfied. The selected suites passed 151 cases; all four moved loop-defect regressions also passed. Validity is clean and doctor has zero errors and no unresolved controls. The requested 175→181 migration succeeded with status and evidence preserved. OUTCOME.md and RETROSPECTIVE.md record delivery and the observed CLI lesson. The control-store effect remains queued for its designated worker; local remap and full memory refresh completed.
