---
type: story
number: 03
slug: the-session-waits-and-the-loop-keeps-going
title: "The session waits and the loop keeps going — every needs-input site calls one awaitAnswer, a waiting lane holds its slot while the wave builds, the answer resumes the same session, the bound parks it and says so, and the loop halts only when nothing else can run"
parent: 131
depends: [1, 2]
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-25
adrs: [ADR-001, ADR-004]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/DESIGN.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-004
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-004
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-005
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-007
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-002
  - src/loop/ask-request.mjs
  - src/loop/stop-request.mjs
  - src/notify/notify.mjs
  - src/notify/form.mjs
  - src/work/observe.mjs
  - src/run-store.mjs
  - src/loop-bounds.mjs
  - src/agent-session-driver.mjs
  - src/effects/run-transitions.mjs
  - src/work-audit/spawn.mjs
  - src/work/dispatch.mjs
  - test/loop/loop-command-probe.test.mjs
files:
  - src/loop/ask.mjs
  - src/loop/wave.mjs
  - src/loop/cycle.mjs
  - src/commands/loop.mjs
  - src/commands/drive.mjs
  - src/loop/child-drive.mjs
  - src/loop-diag.mjs
  - src/run-heartbeat-consumption.mjs
  - src/work/loop.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/loop-command-reconcile.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-narration.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/loop-diag.test.mjs
  - test/support/loop/lane-fixture.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/mesh/acd-heartbeat-by-consumption.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 03 · The session waits and the loop keeps going

## User story

As **the operator running a `refine_first` loop across several lanes**,
I want **every needs-input site — the wave's lanes and the primary REFINE/VERIFY drives alike — to call one composer, `awaitAnswer` in `src/loop/ask.mjs`, which records and notifies the ask, narrates `NN/SS — waiting on you (<phase>, <elapsed>): <question>`, keeps the run alive while it waits, resumes the SAME session with my answer typed as its first input, and at the `scheduleToCloseMs` bound parks the lane and notifies `session-parked-unanswered`**,
so that **one lane's question no longer drains every other lane, the session continues from where it stopped instead of me running `claude --resume` by hand, and a lane nobody answers is parked and reported rather than silently left**.

What lands (ADR-001, ADR-004): `src/loop/ask.mjs` (`awaitAnswer`, `parkedHalt`, the injected `ctx.askWait` seam, the phase map); the four needs-input sites in `wave.mjs`/`cycle.mjs`/`commands/loop.mjs` re-aimed at it; a waiting lane holding its slot and closing `parked` (committed, not merged) at the bound; `session-needs-input` minted only by `parkedHalt` when nothing else can run (`LOOP_STOPS` unchanged); `--resume` re-entry over a standing ask; `work:drive --answer` and `spawnLaneDrive({ answerFile })`; the `loop-halted`, `loop-died`/`loop-relaunched` firing points and `readLastLoopDiagEvent`; `126/FF-12602`'s narrate table moved by exactly the new lines. The live-PTY wait is NOT built (ADR-001 §2, ratified in STATE).

## Tasks

- [x] `tasks/00_one-composer-asks-waits-and-answers.feature` — `src/loop/ask.mjs`: `awaitAnswer`'s order (read, record, file, notify, narrate), the `askWait` seam and the check order, the beat, the bound's park and notice, the silent stop park, the verbatim re-drive, the re-ask loop, `parkedHalt`, `PHASE_WORDS`
- [x] `tasks/01_the-primary-drive-waits-and-resumes-in-place.feature` — the shell, retry and verify sites call `awaitAnswer`; `drivePhase` gains `answer` over the same record; settle → interrupt → needs-input holds; the parked halt
- [x] `tasks/02_a-waiting-lane-holds-its-slot-and-the-wave-builds-on.feature` — a waiting lane keeps its slot; the others merge; the answer re-spawns the child with `--answer`; a parked lane is committed, unmerged and set aside; the parked halt comes first when nothing else can run; a drain parks silently
- [x] `tasks/03_the-answer-rides-the-drive-as-a-resumed-command.feature` — `work:drive --answer` in three homes; `drive-answer-unreadable` and `drive-answer-not-own` before any effect; the resume of the ask's own session with the answer typed; `ctx.loopDrive.answer`; `spawnLaneDrive({ answerFile })`
- [x] `tasks/04_resume-re-enters-a-standing-ask.feature` — `--resume` re-enters a standing ask in a lane and in the primary: answered → re-driven, waiting → waited with a fresh bound and no second notice; stale ask files cleared
- [x] `tasks/05_the-account-says-who-is-waiting-and-how-to-answer.feature` — the waiting, answered and parked rows through `accountLine`; the halt's ask block; `--quiet`; the parked entry's fifth key amended in; `126/FF-12602` moved
- [x] `tasks/06_the-loop-reports-its-own-halt-and-death.feature` — `loop-halted` once after the account (never for `session-needs-input`); `loop-died` / `loop-relaunched` on `--resume`; `readLastLoopDiagEvent`

## Notes

- A stop request at level ≥ 1 parks a waiting run and never cancels it; no notification — the operator is present.
- The existing needs-input suites inject an immediate-park `askWait` and keep their halts.

## Accept decision

**Accepted 2026-09-25 (`aof:verify 131`).**
- **Evidence.** The story lane is green: 40 cases across the loop, drive and narration suites, with FF-13104/FF-13105 green (VERIFICATION `### 131/01–06`). The `cycle.mjs` standing-stop halt was fixed on 03's authority at 06's build.
- **Gates.** `aof work validate 131` returned PASS. `aof work doctor 131` reported no `control-unresolved` at either severity and no missing red probe.
- **Findings.** None is open against 03.
