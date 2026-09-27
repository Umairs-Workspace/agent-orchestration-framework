---
type: story
number: 01
slug: the-question-is-read-and-recorded
title: "The question is read and recorded — the transcript's last assistant turn read by one reader in the transcript family, the ask asked in four labelled lines, one ask file per run in the aof home, and the run record's asks key"
parent: 131
depends: []
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-25
adrs: [ADR-002, ADR-003]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/archive/68_milestone_loop-telemetry/ARCHITECTURE.md#ADR-001
  - wiki/work/archive/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-007
  - src/loop/stop-request.mjs
  - src/workspace.mjs
  - src/fs.mjs
  - src/degrade.mjs
  - src/effects/run-transitions.mjs
  - src/loop/cycle.mjs
  - src/loop-bounds.mjs
files:
  - src/work/observe.mjs
  - src/agent-session-driver.mjs
  - src/run-store.mjs
  - src/work/loop.mjs
  - src/loop/ask-request.mjs
  - test/session/agent-session-driver-transcript.test.mjs
  - test/loop/loop-diag.test.mjs
  - test/run/run-heartbeat-reclaim.test.mjs
  - test/run/run-status-render.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/run/acd-run-record-node-additive.test.mjs
  - test/arch/run/acd-no-lease-store-run-record-untouched.test.mjs
  - test/arch/session/acd-attribution-is-captured-or-absent.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/loop-declaration-join.test.mjs
  - test/run/run-commands.test.mjs
  - test/run/run-dedup-atomic-persist.test.mjs
  - test/run/run-resilience-record-keys.test.mjs
  - test/run/run-retry-command.test.mjs
  - test/run/run-session-limit-resume.test.mjs
  - test/run/run-store-record.test.mjs
  - test/run/run-store-spend.test.mjs
  - test/run/run-status-document-frozen.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 01 · The question is read and recorded

## User story

As **the operator whose driven session stops to ask me something**,
I want **the session's own question — read once, by the one transcript reader in `src/work/observe.mjs`, from the last assistant turn (or a pending `AskUserQuestion`'s questions and options) — to be asked in four labelled lines (`Decision needed:`, `Options:`, `I would pick:`, `What the answer changes:`), written to one ask file per run under `<meshRoot>/loop-asks/<runId>.json` owned by `src/loop/ask-request.mjs`, and recorded on the run record's 17th key `asks`**,
so that **every face that shows or answers the ask reads the same words the session wrote, a waiting run is recorded as waiting instead of leaking `running` or being reclaimed as stale, and the wait is charged to no attempt's budget**.

What lands (ADR-002, ADR-003 §1-§4): `readLastAssistantTurn`, `askQuestionFromTurn` and `readAskQuestion` in `observe.mjs`, with the driver's private scan mapped over them (its 17 exports unchanged, `53/FF-5302`); the producer paragraph in `NEEDS_INPUT_INSTRUCTION` (threshold sentence byte-identical); `src/loop/ask-request.mjs` — the 15-key file, `ASK_STATES` `waiting | parked | answered`, `openAsk`/`parkAsk`/`answerAsk`, answer sanitation (blank, over-long, control characters refused); the run record's `asks` key and its three owner-side writers; the stale-reclaim skip for an unanswered ask; ask intervals excluded from `attemptElapsedMs`.

## Tasks

- [x] `tasks/00_the-reader-lives-in-the-transcript-family.feature` — `readLastAssistantTurn`, `askQuestionFromTurn` and `readAskQuestion` in `observe.mjs`; the driver's private scan maps over them with its four answers and its seventeen exports unchanged
- [x] `tasks/01_the-producer-asks-in-four-lines.feature` — the four-label paragraph before the sentinel sentence; the threshold sentences byte-identical; nothing a comment-stripper would eat
- [x] `tasks/02_the-ask-file-lives-in-the-aof-home.feature` — `src/loop/ask-request.mjs`: the path, the fifteen-key record, `ASK_STATES`, open/park/clear, the absence-tolerant read, `readAsks`, the unref'd poll
- [x] `tasks/03_the-answer-is-sanitised-once.feature` — `answerAsk`: blank, over-long and control-character answers refused before any lookup; verbatim storage; the first answer wins
- [x] `tasks/04_the-run-record-carries-asks.feature` — `asks` as the seventeenth key; the three owner-side writers and their refusals; every sixteen-key pin moved; `53/FF-5307` re-pinned
- [x] `tasks/05_a-waiting-run-is-not-reclaimed-or-charged.feature` — the stale scan skips an unanswered last ask; `attemptElapsedMs` subtracts clipped, merged ask intervals

## Notes

- `src/run-store.mjs` carries an uncommitted 130 edit in the shared checkout (2026-09-23); it must be committed before this story re-pins that file's `53/FF-5307` digest, or the two re-pins collide.
- Writes `test/loop/loop-command-stops.test.mjs`, `test/loop/loop-diag.test.mjs` and `test/run/run-session-limit-resume.test.mjs` BEFORE 03/04 do — the shared files are sequential by `depends`.

## Accept decision

**Accepted 2026-09-25 (`aof:verify 131`).**
- **Evidence.** The story lane is green: 40 cases, plus the shared controls (VERIFICATION `### 131/01–06`). Its own single-writer sweep was red over the delivered tree, because 05's `list.mjs` options argument tripped it. That was fixed in the gate with an exact-spelling exemption, and the sweep was re-run green (F-131-05).
- **Gates.** `aof work validate 131` returned PASS. `aof work doctor 131` reported no `control-unresolved` at either severity and no missing red probe.
- **Findings.** None is a blocker. F-131-05 is closed. F-131-06 (`createAskPoll` has no consumer) is open for the operator's ruling and recorded as a Gap in OUTCOME.
