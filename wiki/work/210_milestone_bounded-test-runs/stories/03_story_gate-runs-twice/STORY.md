---
type: story
number: 03
slug: gate-runs-twice
title: "A milestone's whole tree runs at most twice, then hands over"
parent: 210
depends: []
status: done
owner: product-owner
created: 2026-11-26
updated: 2026-11-27
schema: 1
aofVersion: 0.1.0
adrs: [ADR-007, ADR-002]
reads: [wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-007, packages/specification-by-example/src/answers.mjs, packages/core/src/application/bindings/work-examples/answers.mjs, test/arch/examples/acd-example-answer-one-reader.test.mjs, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-002, packages/work/src/testing/record.mjs, packages/work/src/commands/item-status.mjs, wiki/work/209_milestone_azure-devops-work-store/REGRESSION.md]
files: [.claude/commands/aof/refine.md, .claude/commands/aof/verify.md, .claude/commands/aof/design-system.md, .aof/aof.lock.json, .aof/aof.apply-journal.json, test/fixtures/application/command-inventory.json, packages/acd/assets/manifest.json, scripts/workspace-runtime-audit.json, packages/core/src/application/assemble.mjs, packages/work/src/commands/regression-gate.mjs, packages/specification-by-example/src/map.mjs, packages/specification-by-example/test/example-map-parse.suite.mjs, packages/work/src/regression-record.mjs, packages/core/src/application/bindings/commands/regression-gate.mjs, test/run/regression-gate.test.mjs, test/support/regression-gate-fixture.mjs, packages/work/test/status-gate.test.mjs]
---
# 03 · A milestone's whole tree runs at most twice, then hands over

## User story

As an operator paying for whole-tree runs,
I want the regression gate to launch the whole tree at most twice for a milestone (the gate, and
one confirming run after its reds are fixed), and to hand the milestone to me after that,
so that a red gate leads to targeted fix rounds and a decision, not a third or fourth fifty-minute
run.

## Tasks

- [x] [two launches per milestone](tasks/00_two-launches-per-milestone.feature)
- [x] [a confirmed third launch](tasks/01_confirmed-third-launch.feature)
- [x] [gate failures carry their suite](tasks/02_gate-failures-carry-their-suite.feature)

## Notes

The gate's program, sharding, resume and accept door are unchanged. The `--again` override reads
the operator's confirmation through the one answer reader, and adds the `G` token kind to the map
grammar. This story also hands the
gate record's failures their suite file from the sharded report's units, so a fix round can start
from a gate red (ADR-002, ADR-004).
