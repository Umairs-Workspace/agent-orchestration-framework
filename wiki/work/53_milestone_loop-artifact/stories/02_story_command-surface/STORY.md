---
type: story
number: 02
slug: command-surface
title: "`aof work loop` and the three drivers — the shell becomes a command"
parent: 53
depends: [53/00, 53/01]
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-17
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · `aof work loop` and the three drivers

## User story

As an **operator driving a milestone**, I want to type `aof work loop 53` and have the CLI sequence,
dispatch, gate and retry until the range is done or it halts at a real gate — and I want
`aof work loop 53 --resume` to pick it up after a machine-off, so that a stalled overnight run is
one command to recover instead of a manual re-ping, and so that **an event can start the same work
by calling the same command** with no Claude session acting as orchestrator.

## Context

Two new command modules, and the milestone's only two shared edit points:

- `src/commands/drive.mjs` — `createPhaseDriverCommand` × 3, ids `work:drive-<phase>`, routes
  `["work","drive",<phase>]`. Each spawns **one** session running `/aof:<phase> <ref>` through
  53/00's driver, watches the transcript to a terminal outcome, and returns it.
- `src/commands/loop.mjs` — `work:loop`, route `["work","loop"]`, on the launcher seam. This is the
  milestone's **impure edge**: it composes `work:next` / `work:tasks` / `work:validate`, asks the
  pure engine what to do, drives, writes `brief.loop` through `transitionRunStart`, reclaims stranded
  runs on `--resume`, and reads the cap.

The SPEC names the atomic drivers `aof work refine|continue|verify` — and RESEARCH §Q2 found all
three ids and routes **already taken** by m42's "one door per act" commands, which answer *where*
should this run and whose own header says *"It does NOT spawn anything itself."* ADR-002 rules the
new family additive and the shipped doors untouched, because the board's Continue button today means
"tell me where" and a door that sometimes starts a foreground PTY on the board server's machine is
the exact defect `continue.mjs:3-8` records. The two families are complementary: **the door decides,
the driver executes.**

Two mechanics from RESEARCH §Q2 shape `work:loop` specifically. A long-lived foreground command
declares `cli.launch` (`src/spine/face.mjs:144-161`, precedent `mesh-serve.mjs`), and **`--json`
never launches** — face policy, checked before the seam is consulted. So the registered `run()` is a
**probe**, and that probe's document is the frozen `--json` state contract that milestones 54, 62 and
63 consume.

ADR references: 53/ADR-002 (the driver family, the doors untouched), 53/ADR-005 (the launcher seam,
the probe, the frozen contract, the stop set), 53/ADR-004 §3 (what `--resume` actually does),
53/ADR-003 (the scope refusal, surfaced here).

## Acceptance

- **`aof work drive <phase> <ref>` spawns exactly one session** running `/aof:<phase> <ref>` through
  `src/agent-session-driver.mjs`, watches it to `{outcome: done|failed|needs-input}`, captures the
  session id, and returns it. It makes **no** where-decision — no `node` flag, no `assignWork`, no
  local/remote branch. `src/commands/continue.mjs` is **not edited**; its three commands, routes and
  `{where, command}` contract are untouched.
- **`aof work loop <scope>` drives the range to terminal or halts at a stop**, sequencing only
  through `work:next` — whose result is passed through **verbatim**, never re-derived, so every
  candidacy, lease and item-lock guard m26/m27/m43 added is inherited at every ready-return.
- **The registered `run()` is a probe**: it resolves the scope, asks `work:next` once, asks the
  engine what it *would* do, and returns. Zero spawns, zero run records, zero status writes.
  `cli.launch` returns `null` under `--json` and a function otherwise; `--dry-run` is the **human**
  probe — same document, rendered.
- **The spawn seam is a declared `ctx` key.** `work:loop` and each `work:drive-<phase>` read
  `ctx.agentSessionDriverOptions ?? {}` and pass it verbatim into `driveInteractiveClaudeSession`
  — one name, both families, following `ctx.globalWorkStoreOptions` exactly (ADR-010 §2). Without
  it none of this story is mechanisable. Each driver also carries a `--dry-run` report-only flag
  (ADR-010 §3): `{ref, phase, command}`, zero spawns, exit 0 — the form the bijection gate probes
  with, because a driver always spawns and a spawned probe admits no fake seam.
- **`state` is FOUR members** — `ready`, `blocked`, `done`, `halted`. ADR-010 §5 struck `refused`:
  a refused invocation emits no LoopState at all, but the face's one error envelope
  (`src/spine/face.mjs:186-194`) carrying a `LOOP_REFUSALS` code and a non-zero exit.
- **The `--json` document's key set equals ADR-005 §3's frozen contract exactly**, including the
  nested `act` and `resumable` shapes, and `stops` always carries the closed set in full. Every
  emitted stop carries its `producer`. Stop-specific operator facts never widen that document or
  `act`: they are emitted through the existing human `report` callback, alongside the exact
  `aof work loop <scope> --resume` command.
- **The driver amendment is exactly ADR-015 §7's one line.** A completion watcher may contribute
  optional `failureReason`; no reset/resetAt/resumeAfter field is added to or forwarded through the
  driver contract, no second seam is added, and PTY exit keeps its existing `agent_error` behavior.
  For a `session_limit` with no driver reset metadata, the command edge calls the existing run-store
  policy exactly as `parseResumeAfter(null, { now })`, records its returned `resumeAfter` through
  `transitionRunComplete`, and then asks `transitionRunStart({mode:"retry"})`. The retry refusal's
  `error.readyAt` is the authoritative operator instant. The loop reports it without adding it to
  frozen `LoopState` or `act`; no new config key, clock seam or run-store edit is introduced.
- **The gate runs between phases with a bounded retry**: `drive continue` → `work:validate <ref>` →
  on findings, re-drive up to the **resolved** `work.autonomous.maxAttempts` → `drive verify`. On
  exhaustion the loop stops with `cap-exhausted` and the findings as the record. The cap is **read**
  from the existing key with the existing default of 3 — no new key, no new default, no new
  resolution site.
- **`--resume` is settle → recover → re-ask**: stranded `running` records in scope are force-failed
  as `runtime_offline` through the run store's own reclaim path (keeping them retryable), the most
  recent `brief.loop` declaration is recovered (an explicit `--level`/`--cap` wins, an absent one
  inherits), and the loop re-asks `work:next`. **No position is persisted or restored.** A loop that
  minted no runs has nothing to resume, and says so.
- **Loop state reaches the board with zero board change** — it rides `brief.loop` on the run records,
  which `work:run-status` already returns whole. `src/commands/run-status.mjs`, `src/board-ui.mjs`
  and `ui/` are not edited, and `src/run-store.mjs` is not edited.
- **`aof work loop 53/02` is a loud, coded, zero-side-effect refusal** (`loop-scope-unsupported`)
  naming both admitted forms and pointing at `aof work drive`. **`--level L3`** is
  `loop-level-locked` naming milestone 55. Both refuse before anything is spawned or minted.
- **An L1 loop writes nothing** — it walks the scope reporting the `act` an L2 loop would take, and
  leaves every file and every byte of the tree unchanged.
- **Registration is additive and CLI-reachable**: four imports + four `COMMANDS` entries in
  `src/command-core.mjs`, all four resolving through `deriveRouteTable`/`resolveRoute` with **no
  `src/cli.mjs` branch**. The one bijection leg that is not already general is `argsFor`'s deliberate
  `default: throw` — four cases, landing in the **same diff as the registration**.
- **The story's evidence lands WITH the story, registered.** Nine new behavioural suites under this
  story's two frozen name families — `test/drive-command-phase-drivers.test.mjs` and
  `test/loop-command-{probe,sequencing,gate,stops,resume,board-state,refusals,registration}.test.mjs`
  — each **imported AND spread** in `scripts/test.mjs` inside this story's own labelled
  `// milestone 53 / story 02` block, in the same diff as the commands they mechanise. Not later,
  and not 53/05's: a story accepted on evidence that is neither on disk nor reachable by the runner
  is TECH_DEBT item 48 exactly, which is the failure ADR-011 §1/§2 exists to prevent.
- **Task 04 evidence is owned by observable contract, not by prose count.** Every task-04 headline
  scenario and every task-04 Examples row must have an executable assertion, with the stop-producer,
  failure-reason, store-readiness and human-report row-id sets checked for exact coverage. Parameterised cases and shared assertions are
  allowed; a green aggregate count alone is not traceability, and no separate test is required for
  each `Given`/`When`/`Then`/`And` sentence. The default-watch no-op proof must settle from a real
  temp transcript while its fake PTY remains live, so immediate PTY exit cannot make it false-green.

## Tasks

- [x] [00 — `aof work drive <phase> <ref>` spawns one session, types one prompt, returns one outcome, and decides no where](tasks/00_phase-drivers.feature)
- [x] [01 — `aof work loop <scope> --json` is a probe: the frozen state document, zero spawns, zero writes](tasks/01_loop-probe-and-json-contract.feature)
- [x] [02 — the drive path sequences via `work:next` and dispatches by the frozen phase map](tasks/02_sequencing-and-dispatch.feature)
- [x] [03 — the gate runs `work:validate` between continue and verify, with a retry the shell bounds](tasks/03_gate-and-bounded-retry.feature)
- [x] [04 — each of the eight stops halts with its id, its ref and the exact resume command](tasks/04_stop-conditions.feature)
- [x] [05 — `--resume` settles the stranded, recovers the declaration, re-asks — and restores no position](tasks/05_resume.feature)
- [x] [06 — loop state reaches the board as `brief.loop` on the run records, with zero board change](tasks/06_loop-state-on-the-board.feature)
- [x] [07 — the inert loops: a coded scope refusal, a locked L3, and an L1 that writes nothing](tasks/07_refusals-and-inert-levels.feature)
- [x] [08 — four commands on the derived route table: reachable, non-colliding, clean under `--json`](tasks/08_registration-and-routing.feature)

## Notes

`resolveDirectivePhase` (`continue.mjs:114-133`) already resolves a milestone `continue` to the
`autonomous` directive. Once 53/04 reduces `autonomous.md` to a shell-out, **a milestone continue
becomes a loop with zero code change in `continue.mjs`** — the composition happens at the prompt,
where m42 put the seam.
