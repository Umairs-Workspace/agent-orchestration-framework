---
type: story
number: 02
slug: the-drive-is-a-child
title: "The drive is a child — aof work drive takes a lent run and a fix file, stdin is its cancel channel, and src/loop/child-drive.mjs spawns it and reads exactly one document"
parent: 129
depends: []
status: done
owner: product-owner
created: 2026-09-12
updated: 2026-09-13
adrs: [ADR-005, ADR-008]
reads:
  - wiki/work/129_milestone_loop-concurrency/SPEC.md
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-005
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-008
  - wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-001
  - src/commands/drive.mjs
  - src/work-audit/spawn.mjs
  - src/agent-session-driver.mjs
  - src/commands/loop.mjs
  - src/commands/resolve.mjs
  - src/spine/face.mjs
  - src/workspace.mjs
  - src/loop-diag.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/warm-fix-loop.test.mjs
  - test/loop/loop-fix-transport-shape.test.mjs
  - test/audit/audit-spawn-bounded.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/work/acd-phase-door-not-a-driver.test.mjs
  - test/arch/session/acd-session-driver-single-home.test.mjs
  - test/arch/audit/acd-audit-never-imports-project-code.test.mjs
  - test/arch/command/acd-cli-entry-executes.test.mjs
  - scripts/sea-entry.mjs
files:
  - src/commands/drive.mjs
  - src/loop/child-drive.mjs
  - src/work-audit/spawn.mjs
  - src/agent-session-driver.mjs
  - test/arch/audit/acd-audit-never-imports-project-code.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/warm-fix-loop.test.mjs
  - test/audit/audit-spawn-bounded.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/loop/loop-fix-transport-shape.test.mjs
  - test/arch/audit/acd-control-derives-its-census.test.mjs
  - test/session/agent-session-driver-door.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 02 · The drive is a child

## User story

As **the loop shell that must survive a session's death**,
I want **`aof work drive <phase> <ref> --run <id> [--fix <file>] --json` to execute a lane's
session as a separate process — never minting or settling the lent run, returning its settlement
context on the one JSON document it prints, and stopping its session gracefully when its stdin
closes — and a `src/loop/child-drive.mjs` that spawns it shell-lessly through `runBounded` and
reads exactly that document**,
so that **a lane's kill-time death is one lane's `runtime_offline` and never the loop's, the fix
transport crosses the process boundary in the shape it already has, and no PTY driver is ever
loaded into the loop's own process**.

What lands (ADR-005): `--run` and `--fix` in `work:drive-<phase>`'s closed input schema, CLI flags
and argv (`managedRunId` read from `--run` before `ctx.loopDrive`; `--fix` read where
`ctx.loopDrive.fix` is read today); `settlementContext` on the result; `onPtyLive(kill)` wired to
`process.stdin`'s `end` under `--run`; `runBounded` gains `signal`, `graceMs` and `stdin: "pipe"`
(abort → stdin end → grace → kill → outcome `aborted`); `src/loop/child-drive.mjs` — `spawnLaneDrive`
— `process.execPath` + this tree's `src/cli.mjs`, `cwd` = the lane, env inherited, a non-zero exit
without a document mapped to `failed / runtime_offline` with the stderr tail; the `src/loop`
exemption in the budget table (ADR-008 §2).

## Tasks

- [x] `tasks/00_the-drive-takes-a-lent-run.feature` — `--run <id>` mints nothing, settles nothing, heartbeats the lent id, and returns `settlementContext`; `--fix <file>` is read as the fix transport; a bare drive and `--dry-run` are byte-identical
- [x] `tasks/01_stdin-is-the-cancel-channel.feature` — under `--run` a closed stdin stops the session through the driver's own bracket; without `--run` stdin is untouched
- [x] `tasks/02_run-bounded-gains-abort.feature` — `signal` / `graceMs` / `stdin: "pipe"` are additive; an abort ends stdin, waits the grace, kills, and answers `aborted`; existing callers are byte-identical
- [x] `tasks/03_child-drive-spawns-and-parses.feature` — `spawnLaneDrive` spawns `process.execPath` with the CLI entry, no shell, `cwd` the lane; exactly one document is read; exit-without-document is `runtime_offline`; `src/loop/` is an admitted exemption

## Notes

- Feasibility (2026-09-13): the `cancelled` outcome is reachable only through the driver's own
  `stopForOutcome` bracket, so `src/agent-session-driver.mjs` gains ONE additive option (`signal`)
  and joins this write set; its export set and direct-import set are unchanged.
  `acd-audit-never-imports-project-code` pins `SPAWN_OUTCOMES` to three — it is in the write set.
  `test/loop/` and `test/audit/` are at ceiling: task 03's cases land in
  `drive-command-phase-drivers.test.mjs`, no new suite. Under the SEA embedded runtime there is no
  `cli.mjs` on disk — the spawn falls back to `[process.execPath, "work", …]`.

- Shares no subject file with 01 or 03 — the first wave at the bound of 3.
- The fix file lives under the aof home (`AOF_GLOBAL_HOME`-honouring), never in a checkout
  (ADR-005 §3); this story owns the reader, 04 owns the writer.
