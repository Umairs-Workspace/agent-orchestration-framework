---
doc: verification
---
# 136 · Discovery questions in the loop — Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13601 | `test/arch/examples/acd-example-answer-one-reader.test.mjs` | green, 6 cases (2026-10-04, at `bcc2210c`) | Appended `export const probeAsks = (run) => run.asks;` to `packages/specification-by-example/src/doctor-lane.mjs`. The control went red with `131's answer has one reader, and it spells no token`. Restored the file and re-ran: green. |

## Verification evidence

- **136/01 and 136/02 (`@executable`, 4 features) and FF-13601, 2026-10-03 at `b4ffd730`.** Run in
  the primary checkout with a temp `AOF_GLOBAL_HOME`, through `scripts/test.mjs --only` over
  `example-answers`, `refine-discovery-beat` and the FF-13601 control: 94 cases, 0 failures.
  - verifies → 136/01 tasks 00-01, 136/02 tasks 00-01.
- **136/03 (`@executable`, 1 feature), 2026-10-04.** `loop-command-stops` (the reader E1-E3, the
  hook E1 and E6, the bundle registration, and E4 beside 131/03's verbatim case, which is E5) and
  `agent-session-driver-transcript` (the driver's settle, E1 and E3): every 136/03 case green. The
  cases sit in the two suites that own the subject; a suite of their own overran `test/loop`'s
  ceiling and the driver's named-consumer census at the first gate run. The importer sweep over every suite that reads what 03 touched:
  the root bundle, settings-merge, 87, session-hook, silent-catch, driver-transcript,
  core-workspace and application-assembly suites green (`53/00 task03` red only under contention,
  green alone); the packages `aof` 344, `@aof/work` 315, `@aof/execution` 135, `@aof/mesh` 197,
  `@aof/work-loop` 67 cases, 0 failures.
  - verifies → 136/03 task 00.
- **`@manual`: one live loop-driven discovery question, answered (STATE `## Verification`).**
  Test-bed `aof-test-repo`, milestone 08 (`08/00 truncator`, an unrefined story whose cut marker
  is the operator's rule), `work.examples.enabled` on and the bundle re-rendered.
  1. 2026-10-03, at `47a5505a`: `aof work loop 08 --refine per-story`. The refine reached the
     discovery beat, marked Q1 `asked` and called `AskUserQuestion` with the token first and the
     four lines. The run's `asks` stayed empty and the session sat in its picker until `timeout`,
     twice (the screen recorded at the stop shows the picker). F-136-02; 136/03 built.
  2. 2026-10-04, at `bacac26d`, hook installed: the operator ran `aof work loop 08 --resume`. The
     loop printed `08/00 — waiting on you (refine, 1m): 08/00 Q1 · Discovery question — rule R2 ·…`.
     At the source, the run's `asks` entry (asked `11:49:34Z`) opens with `08/00 Q1 · Discovery
     question — rule R2 · A title longer than max is cut and shows it was cut; settles E3 and E4.`,
     then `Decision needed:`, `Options:`, `I would pick:`, `What the answer changes:` and the four
     options; `runs/.asks-pending.ndjson` holds the hook's record of the same call.
  3. The operator answered `… inside max`. The run records it verbatim, `answeredAt 11:51:43Z`.
  4. The map, read at the source: Q1 `business · answered`, E3 and E4 `[stated Q1]`, R2 reworded to
     the one-character `…` counted inside max. `collectAnswers` over the story returns a record
     with token `08/00 Q1`, the answer `… inside max` and the run's session: the stated examples
     are anchored by the loop's answer record.
  5. The loop went on: the contract `tasks/00_truncate.feature` was written from the map, built in
     a lane, verified, and milestone 08 accepted. No other lane waited (there was one).
  - verifies → SPEC outcome; ADR-001 §1-§3 (live), ADR-002 §2-§5 (live), ADR-004 (live).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-136-01 | The whole-tree gate inherits 142's squash (`88ebd022`): FF-11903 read 348 unresolved citations against a ceiling of 55, 119/00 task02 pinned a rename chain main never recorded, FF-5204 could not resolve `src/run-store.mjs`, and 122 `reads:` went stale. A module that moved and changed in one squash reads as D + A; a module split behind a forward left only its original source. | defect | major | blocker: fixed at verify | `47a5505a`: the rename ledger records PR #5's 1,106 renames and 311 derived forwards (`F` lines), read by `readCitationHistory`; pins re-pointed. FF-11903 reads 55 of 55; validate answers `[]`. | fixed |
| F-136-02 | Claude Code 2.1.288 writes a pending `AskUserQuestion` call to the transcript only once it is answered, so a driven session's question was never detected or posted: the live run timed out twice in front of it. | defect | major | blocker: fixed at verify | story 136/03 (ADR-004), `bacac26d`: a `PreToolUse` recorder hook, read by the driver, the owner and the mesh worker. Live run green. | fixed |
| F-136-03 | A mesh worker records an answer on its own run with `question: null` (`park-resume.mjs` `recordAnswer`), so a worker's answer anchors no example, against ADR-001 §4's claim; and a worker's re-drive does not carry a question the session never recorded. | gap | minor | non-blocker: the local loop path is whole; no mesh-driven refine is in use | backlog | open |
| F-136-04 | A lane on Windows printed `Error: AttachConsole failed` from node-pty's `conpty_console_list_agent.js` on stderr while its session settled `done`. | defect | minor | non-blocker: noise on a healthy lane | backlog | open |
| F-136-05 | The Plan 09 ledger was not re-measured for 136/01's, 145's and 146's new cases, and 145 did not update the command inventory for the `diagram` usage it changed, so `core-workspace` was red on this branch. | defect | minor | blocker: fixed at verify | `bacac26d`: the ledger re-measured with the check's own reader; the two `diagram` entries taken from the live inventory. | fixed |
