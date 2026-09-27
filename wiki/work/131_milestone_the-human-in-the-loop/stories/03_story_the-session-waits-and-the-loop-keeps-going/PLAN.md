# 03 · The session waits and the loop keeps going — build plan

## Mechanism

One composer and four call sites. The four sites stop minting a halt and hand the unsettled
needs-input run to `awaitAnswer`. They get back either a run to settle as they already do, or a
parked entry. Build in this order, so each step leans on the one before:

1. **The drive first (task 03).** `--answer` is read beside `--fix`, before the mint, and
   refuses before any effect. With an answer, the launch is the ask's session resumed and the
   answer typed. This is the one path every re-drive takes, and it can be proven alone against
   the fake PTY. `spawnLaneDrive` only grows one argv pair.
2. **The composer (task 00).** `src/loop/ask.mjs` imports the 01 and 02 leaves (`ask-request`,
   `readAskQuestion`, the run-store ask writers, `notify`, `form`) and nothing of the loop. The
   wait is a loop over `askWait.next()`. Each check reads the file, then `stopping()`, then
   `expired`. In production `next()` is a REF'D `setTimeout(pollMs)`, because the PTY is gone and
   every other live interval is unref'd. An unref'd wait lets the loop exit on `beforeExit`
   (task 00, ruling 13). The test fake drives the clock. `drive` is a closure the site hands in,
   so the composer never learns which topology it serves. The `--resume` re-entry
   (`reenterStandingAsks`) and the stale sweep (`sweepStaleAsks`) live here too, which keeps the
   shell's delta small.
3. **The primary sites (task 01).** The site in the shell, the retry ladder and the verify cross
   each swap a two-line halt for a call. `drivePhase` gains `answer`. It rides `ctx.loopDrive`
   with the waiting record as `retryRecord`, so nothing is minted.
4. **The wave (task 02).** A lane's needs-input branch awaits the composer inside the lane
   promise. The lane simply stays in `lanes` while it waits, so no scheduling changes. A parked
   answer takes the committed-halt path minus the merge, and it closes `parked`. The tick checks
   the parked list before every nothing-to-dispatch halt. The drain parks through `stopping()`.
5. **`--resume` (task 04),** then **the account (task 05),** then **the notices (task 06)**. These
   are additive, and each sits on code already green.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run every suite in the story's `files:` through the test
runner's `--only`, and the standing controls this path crosses: `53/FF-5302`, `70/FF-7007`,
`130/FF-13002`, `129/FF-12902` and the loop family boundary. Then run one end-to-end probe over
the lane fixture with two lanes, the fake child answering `needs-input` for one of them. Answer
it through `answerAsk` (131/01) while the other lane merges. The waiting lane must re-spawn with
`--answer`, settle `done` under the same `runId`, merge, and leave no ask file. The wave must
answer `complete`. If it answers `session-needs-input`, the site still mints the old halt.

## Out of scope

- `work:answer`, the board route and the mesh leg are 04's. Here the suites write `answered`
  through `answerAsk` directly.
- FF-13104 and FF-13105 are 06's. This story's cases prove the behaviour those controls will guard.
- The live-PTY wait (ADR-001 §2, ratified).

## Known traps

- `FF-6903` (extended) pins the hook's heartbeat bytes and the one armed interval in `wave.mjs`.
  Lift the enqueue (the bytes, the append and the consume) into ONE export in the heartbeat
  consumption module, and call it from `beatWaveRun` and the composer. Re-aim
  that control's wave leg at the export, and admit the composer's beat by name (ADR-001 §3). Do
  not copy `heartbeatLine`.
- `126/FF-12602` counts narrate calls per file. Add `ask.mjs` to `FAMILY`, and move each count by
  exactly the lines added, naming each one.
- Twelve cases across three loop suites use needs-input to leave a lane open. Inject the
  immediate park and keep their assertions. The reconcile cases about RECLAIM need a seed with
  no ask (task 04, ruling 7), or they silently start testing re-entry.
- Size. The developer's feasibility estimate is about +80–90 lines in the loop command once
  the re-entry and the sweep sit in `ask.mjs`, and about +80 in `wave.mjs`. The ADR's ~50 and ≤ 40
  predate the `--resume` re-entry contract, so review measures the real delta against these
  estimates, and anything more is a review finding.
- The retry ladder answers `{ phaseRun, parked }`, and it never halts on a park (task 01, ruling
  8), because the wave and the shell give the park different meanings.
- `reportDegrade` throttles per code for 5 s. Reset the sink before any case that asserts a degrade.
