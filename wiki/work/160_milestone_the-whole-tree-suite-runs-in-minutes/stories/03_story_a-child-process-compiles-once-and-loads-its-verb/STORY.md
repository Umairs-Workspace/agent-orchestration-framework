---
type: story
number: 03
slug: a-child-process-compiles-once-and-loads-its-verb
title: "A child process compiles once and loads only its verb — the compile cache on every aof and runner process, and a pinned module ceiling for a child aof"
parent: 160
status: done
owner: product-owner
created: 2026-10-14
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-004-a-child-process-compiles-once-and-loads-only-its-verbs-closure, packages/core/bin/aof.mjs, packages/core/src/cli.mjs, packages/core/src/application/default.mjs, packages/core/src/application/default-workspace.mjs, packages/core/src/application/default-session-hooks.mjs, packages/core/src/application/assemble.mjs, packages/core/src/asset-base.mjs, scripts/test-harness.mjs, scripts/test-shard.mjs, scripts/sea-entry.mjs, test/support/cli-spawn.mjs, test/arch/command/acd-cli-entry-executes.test.mjs, test/arch/command/acd-single-entry-command-core.test.mjs, test/arch/session/acd-session-verb-boots-no-registry.test.mjs, test/command/cli-session-boot-closure.test.mjs, test/command/cli-face-contract.test.mjs, test/bundle/core-workspace.test.mjs, test/arch/mesh/acd-launcher-seam.test.mjs]
files: [packages/core/bin/aof.mjs, packages/core/src/cli.mjs, packages/core/src/application/default-workspace.mjs, packages/core/src/application/default-session-hooks.mjs, packages/core/src/asset-base.mjs, scripts/test-harness.mjs, test/arch/command/acd-cli-entry-executes.test.mjs, test/command/cli-face-contract.test.mjs]
---
# 03 · A child process compiles once and loads only its verb

## User story

As the operator waiting on the gate, and as every test that starts `aof` as a child,
I want each new process to skip recompiling the modules it has compiled before, and a child `aof`
to load only what its verb uses,
so that the 1,193 unit processes and the tests that start `aof` stop paying 2–3 s each before doing
anything.

## Tasks

- [x] `tasks/00_every-process-uses-the-compile-cache.feature`: the cache is on before the application graph loads, in the bin and in every runner process, and the entry contract is unchanged.
- [x] `tasks/01_a-child-aof-loads-a-pinned-closure.feature`: the profile-led cut and the shrink-only module ceiling.

## Notes

ADR-004 is the decision. Measured at refine: importing the default application took 1.8–2.9 s
in a fresh process, and `aof --version` took 4.7 s under load. The compile cache is Node's own
(Node 22.1 or later; a no-op where absent), so it adds no dependency.

Which imports to defer is decided by the profile, not here. The `files:` list holds the CLI's
entry closure, the usual suspects. If the profile points into a module outside it, that is a
contract gap to report, not a silent widening. The SEA launcher stays out, because touching it costs
the 88 MB rebuild.

FF-7205 (`acd-session-verb-boots-no-registry`) is the existing closure control for session verbs.
Its harness is the one to reuse for counting modules.

Discovery: not applicable (EXAMPLES.md).
