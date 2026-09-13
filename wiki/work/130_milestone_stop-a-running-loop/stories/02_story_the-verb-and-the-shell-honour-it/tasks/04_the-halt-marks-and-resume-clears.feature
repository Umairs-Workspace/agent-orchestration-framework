@executable @cli @work @work-stream
Feature: the halt marks the request honoured, a signal-only halt writes nothing, and --resume clears a standing request with one narrated line

  ADR-003 §5-§6, §8; ADR-001 §4. Before a halt for the request is returned, when
  `source.request() != null` the shell calls `markStopHonoured(dir, loopRunId, { now, cancelled })`
  — `state: "honoured"`, `honouredAt`, and the runId it cancelled (or `null` on a drain). A halt
  raised by a signal alone writes nothing: there is no request to mark. Under `--resume`, after
  `loopRunId` is resolved, a standing request for it — `requested` OR `honoured` — is cleared
  through `clearStopRequest` and narrated ONCE: `Cleared stop request for <loopRunId>
  (<state>, level <level>) — resumed.` This is the one new in-flight line; it rides `narrate` by
  126/ADR-002's role rule, so FF-12602's count moves from ten to eleven and its needle table gains
  `Cleared stop request` in the same diff. Every write goes through `stop-request.mjs`'s exports:
  the shell spells no path and calls no `fs` (no `writeFile`, `mkdir` or `rename` form appears in
  it). The stale rule holds by construction — only `--resume` can find a request keyed by its own
  `loopRunId`, and it clears whatever it finds.

  RULINGS (QA, 2026-09-13). (1) The mark keys on the REQUEST, not the producer: a halt whose
  producer is `SIGINT` while a request also stands is still marked honoured (§5's condition is
  `source.request() != null`). (2) `cancelled` on the mark is the run the source's abort settled
  `cancelled` — at whichever drive site (03's ruling 1) — and `null` when none was, including a
  level-2 halt before any drive. (3) A resume with nothing to resume mints a fresh id and clears
  nothing: a file for any other id is untouched and no `Cleared` line prints. (4) A request
  written AFTER the resume cleared, under the resumed id, is a new request and halts the loop at
  its next poll — the clear is of the standing file, not an immunity.

  Background:
    Given a loop fixture over stream `03`, an isolated aof home with `dir` = `loopStopsDir()`, and `report` collecting the lines
    And a fake `ctx.stopSource` whose `request()` answers what the test wrote to `dir`, and a driver double that honours `options.signal`

  Scenario Outline: the halt marks what it honoured
    Given a request for the loop's `loopRunId` at level <level> `requested` in `dir`
    And the source's level is <level> with producer <producer>, flipped <when>
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then the loop halts `operator-interrupt` with producer <producer>
    And the request file reads `state` `"honoured"`, `honouredAt` the fixture's instant, `level` <level>, `cancelled` <cancelled>

    Examples:
      | level | producer         | when                                        | cancelled                          |
      | 1     | `"stop-request"` | before the first tick                       | `null`                             |
      | 2     | `"stop-request"` | before the first tick                       | `null`                             |
      | 1     | `"stop-request"` | while the drive is in flight                | `null`                             |
      | 2     | `"stop-request"` | while the drive is in flight                | the cancelled drive's runId        |
      | 2     | `"stop-request"` | after the tick-head poll, before the spawn  | the minted, never-spawned runId    |
      | 2     | `"stop-request"` | while retry attempt 2 is in flight          | attempt 2's runId                  |
      | 1     | `"SIGINT"`       | before the first tick (the signal first, the file also at level 1) | `null`      |

  Scenario: an already-honoured request still halts, and is re-marked idempotently
    Given a request at level 1 already `honoured` at instant `T0` with `cancelled: null`
    And the source's level is 1 (it reads the level, never the state)
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then the loop halts `operator-interrupt` before any drive
    And the file still reads `honouredAt` `T0` — or the fixture's instant, but `state` `"honoured"` and `cancelled` `null` either way

  Scenario Outline: a signal-only halt writes nothing, even when it cancelled a run
    Given no request exists and the source's level is <level> with producer <producer>, flipped <when>
    When `runLoopBody({ scope: "03" }, ctx)` is awaited
    Then the loop halts `operator-interrupt` with `Details: signal=<producer>; level=<level><cancelled>.`
    And `dir` holds no file and need not exist

    Examples:
      | level | producer    | when                          | cancelled                 |
      | 1     | `"SIGINT"`  | before the first tick         | ``                        |
      | 1     | `"SIGTERM"` | before the first tick         | ``                        |
      | 2     | `"SIGINT"`  | before the first tick         | ``                        |
      | 1     | `"SIGINT"`  | while the drive is in flight  | ``                        |
      | 2     | `"SIGTERM"` | while the drive is in flight  | `; cancelled=<the runId>` |

  Scenario Outline: resume clears a standing request and says so once
    Given a prior declaration for scope `03` with `loopRunId` `"L1"` on the fixture's run records
    And a request for <id> in `dir` <state>
    When `runLoopBody({ scope: "03", resume: true }, ctx)` is awaited with the source at level 0
    Then `readStopRequest(dir, "L1")` answers `null` and a file for any other id is byte-identical
    And the printed lines contain exactly <lines> matching `^Cleared stop request for L1 \(<word>, level <level>\) — resumed\.$`
    And the loop then walks as a resume does — its next act is not a halt on the old request

    Examples:
      | id        | state                       | lines | word        | level |
      | `"L1"`    | at level 1 `honoured`       | one   | honoured    | 1     |
      | `"L1"`    | at level 2 `honoured`       | one   | honoured    | 2     |
      | `"L1"`    | at level 1 `requested`      | one   | requested   | 1     |
      | `"L1"`    | at level 2 `requested`      | one   | requested   | 2     |
      | `"L1"`    | does not exist              | none  | —           | —     |
      | `"L-old"` | at level 2 `honoured`       | none  | —           | —     |

  Scenario: a resume with nothing to resume clears nothing
    Given no run in scope carries a declaration and a request for `"L-old"` at level 2 `honoured` in `dir`
    When `runLoopBody({ scope: "03", resume: true }, ctx)` is awaited
    Then the only printed line is `Nothing to resume in 03 — no run carries a loop declaration.`
    And `"L-old"`'s file is byte-identical

  Scenario: a request written after the clear halts the resumed loop
    Given a prior declaration `"L1"` and a request for `"L1"` at level 1 `honoured` at `T0` in `dir`
    And on the poll after the first drive settles `done`, a NEW request for `"L1"` at level 1 `requested` is written to `dir` and the source's level flips to 1 with producer `"stop-request"`
    When `runLoopBody({ scope: "03", resume: true }, ctx)` is awaited
    Then one `Cleared stop request for L1 (honoured, level 1) — resumed.` line precedes the drive
    And the loop halts `operator-interrupt` after that drive with `driven` one `done` row
    And `dir/L1.json` reads `state` `"honoured"` with `honouredAt` the fixture's instant, later than `T0`

  Scenario: a fresh loop never inherits a stale request
    Given a request for some other `loopRunId` `"L-old"` at level 2 `honoured` in `dir`
    When `runLoopBody({ scope: "03" }, ctx)` — NOT a resume — is awaited with a driver double resolving `done`
    Then the new loop's `loopRunId` differs from `"L-old"`, it drives `03/01`, and `"L-old"`'s file is untouched

  Scenario: the resume line is in the narration seam table
    When `test/arch/loop/acd-loop-narrates-in-flight.test.mjs`'s seam table is read
    Then it carries the needle `Cleared stop request` mapped to `narrate` and its expected count is eleven
    And `runLoopBody` under `--quiet` prints no `Cleared stop request` line while the terminal account is byte-identical to the loud run's from its first `Driven` row

  Scenario: the shell spells no path and calls no fs
    When the comment-stripped source of `src/commands/loop.mjs` is read
    Then it contains no `loop-stops`, no `writeFile(`, no `mkdir(` and no `rename(` call form
    And it imports `createStopSource`, `loopStopsDir`, `markStopHonoured`, `clearStopRequest` and `readStopRequest` from `../loop/stop-request.mjs`
