---
type: story
number: 02
slug: the-verb-and-the-shell-honour-it
title: "The verb and the shell honour it — `aof work loop <scope> --stop` writes the request through one core, the shell reads the source instead of a flag, the interrupt path always settles, a cancelled session settles cancelled, and --resume clears"
parent: 130
depends: [1]
status: not-started
owner: product-owner
created: 2026-09-13
updated: 2026-09-13
adrs: [ADR-001, ADR-002, ADR-003, ADR-006]
reads:
  - wiki/work/130_milestone_stop-a-running-loop/SPEC.md
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-002
  - wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-004
  - src/loop/stop-request.mjs
  - src/commands/loop.mjs
  - src/work/loop.mjs
  - src/work.mjs
  - src/run-store.mjs
  - src/loop-bounds.mjs
  - src/command-error.mjs
  - src/commands/drive.mjs
  - src/agent-session-driver.mjs
  - src/loop/child-drive.mjs
  - src/effects/run-transitions.mjs
  - src/commands/run-complete.mjs
  - src/loop-diag.mjs
  - src/loop-record.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-narration.test.mjs
  - test/support/mesh-worker-terminal-fixture.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/work/acd-work-command-route-coverage.test.mjs
files:
  - src/loop/stop.mjs
  - src/commands/loop.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/loop-command-narration.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 02 · The verb and the shell honour it

## User story

As **the operator whose loop is an hour into a story session on a machine that cannot signal it**,
I want **`aof work loop <scope> --stop` from any terminal to write the request through one core
(`src/loop/stop.mjs`'s `stopLoop`, which the fleet route and the desktop also reach), report what
it found (`loopRunId`, live or not, `drain` or `cancel`), and the running shell to read the source
instead of a `process.once` flag — halting at the tick head on level 1, aborting the in-flight
session's `signal` on level 2 — and to SETTLE the drive before it halts, `cancelled` when the
source cancelled it and as it ended otherwise, naming the request on the halt and clearing it on
`--resume`**,
so that **a stop is one verb everywhere, a stopped loop never leaves its run `running` (the leaked
row that walls the next mint, 20/ADR-006), and `--resume` brings the loop back without the old
request stopping it again**.

What lands (ADR-002, ADR-003): `stop: true` in the closed schema, `cli.spec.flags`, `cli.argv` and
the usage; `launch` answers `null` for `--stop` (no foreground body, no diag recorder); `run`
dispatches `input.stop === true` to `stopLoopCommand`, else the byte-identical `probeLoop`;
`stopLoop(workspace, { scope, now })` answers the seven-key document or a coded refusal
(`loop-stop-scope`, `loop-stop-no-declaration`, `loop-stop-not-local`; `loop-stop-exclusive` for
`--stop` + `--resume`); a not-live loop's request is marked honoured at once. In `runLoopBody`:
`ctx.stopSource ?? createStopSource(...)`, `signal` composed onto every drive's
`agentSessionDriverOptions`, the tick-head and post-drive reads, settle-first, `settleDriven`
mapping `failureReason: "cancelled"` → outcome `cancelled` (`failureReason: null`),
`drivenRow.outcome` `"cancelled"`, `haltOnStop` with `Details { signal, level, request, by,
cancelled }`, `markStopHonoured` at the halt, `--resume` clearing + the one new narrate line
(`Cleared stop request …`, FF-12602 → eleven).

## Tasks

- [ ] `tasks/00_stop-is-a-flag-in-three-homes.feature` — schema, spec flag, argv and usage carry `--stop`; `launch` answers `null` for it; `--stop --resume` is refused `loop-stop-exclusive`; `run` without `stop` is the unchanged probe
- [ ] `tasks/01_stoploop-writes-through-one-core.feature` — `stopLoop` resolves the scope's latest declaration, refuses by code when none / not local, reports `live` from the record's own liveness, writes or escalates the request (`drain` then `cancel`, idempotent after), marks a not-live loop honoured at once, answers seven keys; the command face maps refusals to 404/409 and renders one line
- [ ] `tasks/02_the-shell-reads-the-source.feature` — `ctx.stopSource` replaces the `process.once` pair; level 1 at the tick head halts `operator-interrupt` with the producer as data and the request in `Details`; the driver options every drive receives carry `source.signal`
- [ ] `tasks/03_the-interrupt-path-always-settles.feature` — a drive that returns after a level-1 stop settles as it ended before the halt; a drive the source cancelled settles `cancelled` with `failureReason: null`, its `driven` row reads `cancelled`, and no `running` row is left; `needs-input` stays unsettled
- [ ] `tasks/04_the-halt-marks-and-resume-clears.feature` — the halt marks the request honoured with the cancelled runId; a signal-only halt writes nothing; `--resume` clears a standing request and narrates once; FF-12602's table gains the needle

## Notes

- Every test here EXTENDS one of the four `loop-command-*` suites (`test/loop/` is at ceiling); the
  fake driver in `loop-command-probe.test.mjs` (`completingDriver`) gains a cancel-aware double
  that honours `options.signal` the way the real driver does (`agent-session-driver.mjs:1263-1269`).
- `src/commands/loop.mjs` is shared with 129/04 across milestones (SPEC Dependencies, ADR-001 §6):
  not driven in this checkout at the same time; whichever lands second adapts to the seam shape.
- `src/commands/` is at 68/68 — the core is `src/loop/stop.mjs`, never a new command module.
- Pins that must hold unchanged: FF-5304 (ten keys, `haltDecision`, the stops literal — `LOOP_STOPS`
  stays twelve), FF-5307 (`src/run-store.mjs` byte-identical), `actShape`'s whitelist.
