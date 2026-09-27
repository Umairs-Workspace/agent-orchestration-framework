@executable @cli @work @work-stream
Feature: the drive resumes a run's own session with the answer as its typed command, and refuses any other session before it does anything

  ADR-001 §1 and §6, ADR-003 §7. `work:drive <phase>` gains `answer`, the path of an ask file, in
  the three homes `126/ADR-002` §6 names: the closed input schema, `cli.spec.flags` and `cli.argv`.
  `src/commands/drive.mjs` reads the file BEFORE any mint, compile or spawn, next to `--fix`, and
  refuses before any effect. A readable answer that belongs to the lent run launches the driver
  with `resumeSessionId` = the ask's `sessionId` and the brief's `command` = the answer, verbatim.
  In-process the same fact rides `ctx.loopDrive.answer = { runId, sessionId, text }`, and `--answer`
  wins over it, as `--fix` wins over `ctx.loopDrive.fix`. `spawnLaneDrive` (`src/loop/child-drive.mjs`)
  gains `answerFile` and passes `--answer <file>` after `--run`.

  RULINGS (PO, 2026-09-23).
  (1) Refusal `drive-answer-unreadable` (400) covers: a path that cannot be read, content that is
  not an ask record (read through `readAsk`'s rules, 131/01 task 02), a `state` other than
  `answered`, and an `answer` that is not a non-empty string.
  (2) Refusal `drive-answer-not-own` (409) covers an answer with no lent run (neither `--run` nor
  `ctx.loopDrive.runId`), an answer whose `runId` is not the lent run's, and an answer whose
  `sessionId` is not the `sessionId` on that run's record, read from the item's runs. A record with
  no `sessionId`, or no such record, is not own. A run resumes only its own conversation
  (`70/FF-7007`, extended).
  (3) Both refusals are thrown through `commandError` before `transitionRunStart`,
  `compileBriefForItem`, the stdin cancel bracket or the driver. Under `--json` each prints one
  document, `{ ok: false, code }`, which `spawnLaneDrive` reads as `refused`.
  (4) With an answer: the brief's `task` is the drive's own phase, its `command` is the answer
  text byte for byte, and it carries no `context`, because a resumed session already holds its
  tree. A fix transport present beside it is NOT composed. The answer resumes the ask's session,
  not the build run's (`resolvePhaseResumeTarget` is not consulted). A raw
  `agentSessionDriverOptions.resumeSessionId` is still stripped.
  (5) The resume's spend baseline is taken as for any warm launch (`snapshotTranscriptTree` over the
  ask's session), so only the bytes appended by the resumed turn are charged.
  (6) Refine and verify accept an answer too. They resume their OWN session, which
  `70/FF-7007` does not forbid. That control forbids resuming a build session into a reviewer, and
  its cases stay green unchanged.
  (7) `answerFile` is optional. When it is absent or empty the argv is byte-identical to today's.
  `answerFile` and `fixFile` together are a caller error, thrown as a `TypeError` before any spawn.

  RULINGS (QA, 2026-09-23). (1) The checks run in this order, and the first that fails names the
  refusal: the file is read (`drive-answer-unreadable`), then a lent run must exist, then the
  `runId` must match, then the record's `sessionId` (`drive-answer-not-own`). `ref-required` and
  `ref-not-found` still come first. (2) The lent record must be `running` too. A settled record
  waits on nothing, so it is `drive-answer-not-own`. (3) `--dry-run` answers before any answer is
  read, as it answers before a fix is read. (4) `answer: ""` is absent, the `length > 0` guard `run`
  and `fix` take. A `--fix` beside an answer is still read, after the answer is judged: an
  unreadable one refuses `drive-fix-unreadable`, and a readable one is not composed. (5) The
  in-process `ctx.loopDrive.answer` passes the same checks, its `text` standing for the file's
  `answer`. (6) The drive re-checks nothing else in the text. Sanitation is `answerAsk`'s alone
  (ADR-003 §2), so a TAB, CR or LF is typed as it stands. (7) In `spawnLaneDrive`, an `answerFile`
  that is not a non-empty string is absent, as a `fixFile` is. The `TypeError` fires only when both
  are non-empty strings.

  RULINGS (PO, answering QA, 2026-09-23). (8) QA rulings (1) to (7) are RATIFIED.

  RULINGS (PO, answering the developer, 2026-09-23).
  (9) The answer is read through 01's `readAsk(path.dirname(file), <basename without .json>)`
  inside one `try`. A `TypeError` (a name that is not one segment) and an `EISDIR` are both
  `drive-answer-unreadable`. The state is compared through `ASK_STATES` (task 00, ruling 14).
  (10) AMENDS PO ruling (3) and the refusal outline: "`compileBriefForItem` was never called"
  cannot be observed, because it is a direct import with no seam. That clause is proven
  STRUCTURALLY instead: in `drive.mjs`'s stripped source, the answer read comes before
  `compileBriefForItem(`, `transitionRunStart(` and `armStdinCancel(`. The outline keeps the rest
  of its observations.

  Background:
    Given the drive-command fixture: item `03/01` in a temporary repo under an isolated `AOF_GLOBAL_HOME`, a fake PTY spawn and a fake `which`
    And a lent run `R` on `03/01` whose record carries `sessionId` `S1`
    And an ask file `A` for `R`, `answered`, with `sessionId` `S1` and `answer` `"take option B\nand keep the tests"`

  Scenario: an answer resumes the lent run's own session with the answer typed
    When `work:drive-continue` runs with `{ ref: "03/01", run: "R", answer: A }`
    Then the fake PTY was spawned once, with `--resume S1` in its args
    And the body typed into it is `"take option B\nand keep the tests"`, byte for byte
    And no run was minted, and the record for `R` is still `running`

  Scenario: the three homes carry the flag
    When `aof work drive continue 03/01 --run R --answer <A> --json` is parsed
    Then the command input deep-equals `{ ref: "03/01", run: "R", answer: "<A>" }`, and the closed schema admits it
    And `--answer` with no value is refused by the argv parser as `--fix` with no value is

  Scenario: an answer that is not this run's is refused before anything happens
    Given the ask file's `runId` is `R2`
    When `work:drive-continue` runs with `{ ref: "03/01", run: "R", answer: A }`
    Then it is refused `drive-answer-not-own`, the fake PTY was never spawned, and the item's runs are unchanged

  Scenario: an unreadable answer is refused before anything happens
    Given the ask file `A` does not exist
    When `work:drive-continue` runs with `{ ref: "03/01", run: "R", answer: A }`
    Then it is refused `drive-answer-unreadable`, and the fake PTY was never spawned

  Scenario: the in-process loop hands the same answer through the loop drive
    When `work:drive-refine` runs with `{ ref: "03/01" }` and `ctx.loopDrive` = `{ runId: "R", answer: { runId: "R", sessionId: "S1", text: "yes" } }`
    Then the fake PTY was spawned with `--resume S1`, and the typed body is `"yes"`

  Scenario: the lane child is spawned with the answer file
    When `spawnLaneDrive({ ref: "03/01", phase: "continue", runId: "R", lane: <dir>, answerFile: A, spawnChild: <spy> })` is awaited
    Then the spy's argv ends `work drive continue 03/01 --run R --answer <A> --json`
    And `spawnLaneDrive` with no `answerFile` spawns exactly today's argv

  Scenario Outline: every way an answer is unreadable or not this run's is refused before any effect
    Given the ask file `A` <file>, and the lend is <lend>
    When `work:drive-continue` runs with `{ ref: "03/01", answer: A }` and that lend
    Then it is refused `<code>` with status <status>, and under `--json` it prints one document with `ok: false` and that `code`
    And the fake PTY was never spawned, stdin was never resumed, and the item's runs are byte-unchanged

    Examples:
      | file                                                   | lend                                        | code                    | status |
      | does not exist                                         | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | is a directory                                         | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | holds `{ not json`                                     | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | is empty (zero bytes)                                  | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | holds a JSON array                                     | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | holds JSON `null`                                      | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | reads `waiting`                                        | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | reads `parked`                                         | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | holds the record with `state` `"ANSWERED"`             | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | holds `{ "state": "answered" }` and nothing else       | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | reads `answered` with `answer` `""`                    | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | reads `answered` with `answer` `42`                    | `run: "R"`                                  | drive-answer-unreadable | 400    |
      | does not exist                                         | none: no `run` and no `ctx.loopDrive`       | drive-answer-unreadable | 400    |
      | is the Background's                                    | none: no `run` and no `ctx.loopDrive`       | drive-answer-not-own    | 409    |
      | reads `answered` for `runId` `R2`                      | `run: "R"`                                  | drive-answer-not-own    | 409    |
      | reads `answered` with `runId` `null`                   | `run: "R"`                                  | drive-answer-not-own    | 409    |
      | reads `answered` for session `S2`                      | `run: "R"`                                  | drive-answer-not-own    | 409    |
      | reads `answered` with `sessionId` `null`               | `run: "R"`                                  | drive-answer-not-own    | 409    |
      | is the Background's, and `R`'s record has no `sessionId` | `run: "R"`                                | drive-answer-not-own    | 409    |
      | reads `answered` for `runId` `R9`                      | `run: "R9"`, and the item has no run `R9`   | drive-answer-not-own    | 409    |
      | is the Background's, and `R`'s record is settled `done` | `run: "R"`                                 | drive-answer-not-own    | 409    |

  Scenario Outline: the explicit flag wins over the loop drive, and an empty one is absent
    Given `ctx.loopDrive` is <loopDrive>
    When `work:drive-continue` runs with <input>
    Then <outcome>

    Examples:
      | input                                  | loopDrive                                                                          | outcome                                                                           |
      | `{ ref: "03/01", run: "R", answer: A }` | `{ runId: "R", answer: { runId: "R", sessionId: "S1", text: "yes" } }`            | the PTY resumes `S1` and types A's answer, not `"yes"`                            |
      | `{ ref: "03/01", answer: "" }`          | `{ runId: "R", answer: { runId: "R", sessionId: "S1", text: "yes" } }`            | the PTY resumes `S1` and types `"yes"`                                            |
      | `{ ref: "03/01", answer: A }`           | `{ runId: "R" }`                                                                   | the PTY resumes `S1` and types A's answer                                         |
      | `{ ref: "03/01", run: "R", answer: A }` | `{ runId: "R2" }`                                                                  | the PTY resumes `S1` and types A's answer, the `run` lending `R` as today         |
      | `{ ref: "03/01" }`                      | `{ runId: "R" }`                                                                   | the PTY is spawned with no `--resume` and types `/aof:continue 03/01`, as today   |
      | `{ ref: "03/01" }`                      | `{ runId: "R", answer: { runId: "R2", sessionId: "S1", text: "yes" } }`           | it is refused `drive-answer-not-own`, and the PTY was never spawned               |
      | `{ ref: "03/01" }`                      | `{ runId: "R", answer: { runId: "R", sessionId: "S1", text: "" } }`               | it is refused `drive-answer-unreadable`, and the PTY was never spawned            |

  Scenario Outline: the resumed launch carries the answer and nothing else
    Given <setup>
    When `work:drive-<phase>` runs with `{ ref: "03/01", run: "R", answer: A }`
    Then the brief's `task` is `<phase>`, its `command` is A's answer byte for byte, and it has no `context`
    And the driver's `resumeSessionId` is `S1`, and the spend baseline was snapshotted over `S1.jsonl`

    Examples:
      | phase    | setup                                                                                    |
      | continue | nothing else                                                                             |
      | continue | `ctx.loopDrive.fix` carrying a `buildRun` whose `resumeBuildRun` names session `S0`      |
      | continue | `ctx.agentSessionDriverOptions.resumeSessionId` = `"SX"`                                 |
      | continue | `A`'s answer is `"a\tb\r\nc"`                                                            |
      | refine   | nothing else                                                                             |
      | verify   | nothing else                                                                             |

  Scenario Outline: the answer is judged after the dry run and before the fix file
    When `work:drive-continue` runs with `{ ref: "03/01", run: "R", <flags> }`
    Then <outcome>

    Examples:
      | flags                                          | outcome                                                                           |
      | `dryRun: true, answer: <a missing file>`       | it answers the dry-run document `{ ref, phase, command }`, refusing nothing       |
      | `answer: <a missing file>, fix: <{ not json>`  | it is refused `drive-answer-unreadable`                                           |
      | `answer: A, fix: <{ not json>`                 | it is refused `drive-fix-unreadable`, and the PTY was never spawned               |
      | `answer: A, fix: <a readable fix transport>`   | the PTY resumes `S1` and types A's answer, with no `## REVIEW FINDINGS`          |

  Scenario Outline: the lane child's argv carries the answer file only when there is one
    When `spawnLaneDrive({ ref: "03/01", phase: "continue", runId: "R", lane, spawnChild })` is awaited with `answerFile` <answerFile> and `fixFile` <fixFile>
    Then <argv>

    Examples:
      | answerFile       | fixFile | argv                                                                               |
      | `A`              | absent  | the spy's argv ends `--run R --answer <A> --json`                                  |
      | absent           | absent  | the spy's argv ends `--run R --json`, byte-identical to today                      |
      | `""`             | absent  | the spy's argv ends `--run R --json`                                               |
      | `42`             | absent  | the spy's argv ends `--run R --json`                                               |
      | absent           | `F`     | the spy's argv ends `--run R --fix <F> --json`                                     |
      | `A`              | `""`    | the spy's argv ends `--run R --answer <A> --json`                                  |
      | `A`              | `F`     | it throws a `TypeError`, and the spy was never called                              |
      | `C:/x y/a.json`  | absent  | `--answer` is followed by the one argv element `C:/x y/a.json`                     |

  Scenario Outline: the argv parser reads --answer as it reads --fix
    When `aof work drive continue 03/01 <flags>` is parsed
    Then <input>

    Examples:
      | flags                          | input                                                                     |
      | `--run R --answer A --json`    | the command input is `{ ref: "03/01", run: "R", answer: "A" }`            |
      | `--run R --json`               | the command input is `{ ref: "03/01", run: "R" }`, with no `answer` key   |
      | `--run R --answer`             | it is refused by the argv parser, as `--run R --fix` is                   |
      | `--answer A --fix F`           | the command input is `{ ref: "03/01", answer: "A", fix: "F" }`            |
