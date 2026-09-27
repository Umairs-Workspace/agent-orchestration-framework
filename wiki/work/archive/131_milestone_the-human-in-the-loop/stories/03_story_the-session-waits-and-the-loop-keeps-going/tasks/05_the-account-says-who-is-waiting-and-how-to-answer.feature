@executable @cli @work @work-stream
Feature: the loop's account names the question while it waits, and a halt on a question prints the ask and the command that answers it

  ADR-004 §4, ADR-006 §1, DESIGN §4. Three rows ride `narrate`, each spelled by `accountLine` from
  `src/notify/form.mjs` over the event's envelope. They are the waiting row `<ref> — waiting on you
  (<phase>, <elapsed>): <one-line ask>` (at the ask and again every `heartbeatMs`), the answered row
  `<ref> — answered by <who> (<phase>, <elapsed>)`, and the parked row `<ref> — parked, unanswered
  (<phase>, <elapsed>): <one-line ask>`. A `session-needs-input` halt is followed by its ASK BLOCK
  on `report`: for each parked entry, the full ask indented two spaces, then
  `  answer: aof work answer <ref> "…"`. `reportLine` prints the block from the halt's `Details`,
  and its sixteen call sites stay sixteen. `126/FF-12602`'s needle table and counts move by
  exactly these lines, and `src/loop/ask.mjs` joins its `FAMILY`.

  RULINGS (PO, 2026-09-23).
  (1) AMENDMENT to ADR-004 §3, ratified in this authoring beat: a parked entry carries FIVE keys,
  `{ ref, runId, sessionId, askedAt, question }`, because the block prints the full ask and the
  ADR's four keys cannot spell it. `question` is the text `awaitAnswer` read, or `null`.
  (2) The halt line's `Details:` shows `parked` WITHOUT `question`, so the one-line halt stays one
  line. The block carries the question. The projection is `reportLine`'s own, and `reportFacts` is
  not changed.
  (3) The block follows the halt line, one block per entry in `askedAt` order. Each line of the
  question is prefixed with two spaces, and blank lines are kept blank. The answer line spells the
  ellipsis `…` as DESIGN §4 does. A `null` question prints only the answer line.
  (4) The waiting rows are in flight. `--quiet` silences them, and it silences the answered and
  parked rows. It does not silence the halt line or the block, which are the account.
  (5) No row is repainted. Each one is a new line, because the printer is a line stream teed to the
  diag log (ADR-004 §4's departure from DESIGN §4).
  (6) The stale-ask line of task 04, `Ask <runId> — stale: its run is not running; cleared.`, rides
  `narrate` as well.
  (7) FF-12602's leg-3 counts move by exactly the lines this story adds, each named in the
  assertion's message. The shell's count and the ladder's count stay as they are, unless a line is
  added there. `src/loop/ask.mjs` joins `FAMILY`, and its own narrate count is asserted. No row may
  be spelled on `report`. The no-in-flight-on-report regex gains the phrase `waiting on you`.

  RULINGS (QA, 2026-09-23). (1) EXTENDS PO ruling (3), for the PO to ratify: the block prints for
  every halt whose `Details` carry a non-empty `parked`, whatever the stop. That covers
  `session-needs-input`, an `operator-interrupt` that parked a wait (task 01 QA 3, task 02 PO 6) and
  a drain that parked a lane (task 02 QA 2). The operator needs the answer command in each. (2) The
  question is split on `\r?\n`. A line blank after `trimEnd()` prints empty, with no indent. Every
  other line prints as two spaces and then the line as it stands, its own indent kept. (3) The halt
  line's projection keeps four keys in the order `ref, runId, sessionId, askedAt`. (4) A row's
  `<elapsed>` is `now − record.createdAt` at the check that narrates it (task 00, PO ruling 2), so a
  row re-narrated a day later reads that day. (5) No row carries a CR or an ESC byte. (6) Each row is
  `accountLine`'s bytes. The one-line clip is the formatter's (131/02 task 01) and is not re-applied.

  RULINGS (PO, answering QA, 2026-09-23). (8) QA ruling (1) is RATIFIED, and it AMENDS PO ruling
  (3). The ask block prints after ANY halt whose `Details` carry a non-empty `parked`:
  `session-needs-input`, and also an `operator-interrupt` or a drained halt that parked asks. The
  answer command is never lost. (9) QA rulings (2) to (6) are RATIFIED.

  RULINGS (PO, answering the developer, 2026-09-23). (10) AMENDS ruling (7): the no-in-flight-on-
  report regex gains nothing. FF-13108 keeps `waiting on you` in `form.mjs` alone, so the rows
  are `accountLine(` calls, and FF-12602 asserts that every `accountLine(` call in the family is
  on `narrate`. (11) The sixteen `reportLine` sites stay sixteen (task 04, ruling 14).

  Background:
    Given the loop-command-narration fixture with one collector for `report` and `narrate`, and an isolated `AOF_GLOBAL_HOME`
    And `03/01`'s refine drive answers `needs-input`, its question being three lines: `Decision needed: split 03?`, a blank line, and `Options: A or B`

  Scenario: the waiting row reaches the collector in the one shape every face shares
    Given the ask is answered by `umami` after one `heartbeatMs`
    When the loop walks scope `03`
    Then the collector holds `03/01 — waiting on you (refine, <elapsed>): Decision needed: split 03? Options: A or B` twice, at the ask and after one `heartbeatMs`
    And each is byte-equal to `accountLine` of the `session-needs-input` envelope at that instant
    And then `03/01 — answered by umami (refine, <elapsed>)`

  Scenario: a halt on a question prints the ask and how to answer it
    Given `ctx.askWait` parks at the first check
    When the loop walks scope `03`
    Then the report lines end with the halt line, then `  Decision needed: split 03?`, `` (an empty line), `  Options: A or B`, and `  answer: aof work answer 03/01 "…"`
    And the halt line's `Details:` names `parked` with `ref`, `runId`, `sessionId` and `askedAt`, and not the question
    And the collector holds `03/01 — parked, unanswered (refine, <elapsed>): Decision needed: split 03? Options: A or B`

  Scenario: --quiet keeps the account and drops the rows
    Given `ctx.askWait` parks at the first check
    When the loop walks scope `03` with `quiet: true`
    Then no collected line contains `waiting on you` or `parked, unanswered`
    And the halt line and its four block lines were collected

  Scenario: the structural control reads the new home and counts exactly the new lines
    When `test/arch/loop/acd-loop-narrates-in-flight.test.mjs` runs
    Then its `FAMILY` includes `src/loop/ask.mjs`, and every `accountLine` row call in `ask.mjs` is on `narrate`
    And the shell still has one `console.log`, sixteen `reportLine` call sites and three drive sites

  Scenario Outline: each row is accountLine of its own envelope, at the instant it is narrated
    Given `03/01`'s <drive> run was created at `2026-09-23T17:00:00.000Z`, and its question is <question>
    When its <row> row is narrated at <at>
    Then the collector holds `<line>`

    Examples:
      | drive                     | question                  | row             | at                         | line                                                                                   |
      | refine                    | the Background's three lines | waiting      | `2026-09-23T17:12:00.000Z` | 03/01 — waiting on you (refine, 12m): Decision needed: split 03? Options: A or B      |
      | refine                    | `null`                    | waiting         | `2026-09-23T17:12:00.000Z` | 03/01 — waiting on you (refine, 12m)                                                   |
      | refine                    | `"Pick:\tA  or B"`   | waiting         | `2026-09-23T17:12:00.000Z` | 03/01 — waiting on you (refine, 12m): Pick: A or B                                     |
      | continue                  | the Background's three lines | waiting      | `2026-09-23T20:10:00.000Z` | 03/01 — waiting on you (build, 3h 10m): Decision needed: split 03? Options: A or B     |
      | verify                    | the Background's three lines | waiting      | `2026-09-23T17:00:45.000Z` | 03/01 — waiting on you (verify, 45s): Decision needed: split 03? Options: A or B      |
      | continue, re-entered on `--resume` | the Background's three lines | waiting | `2026-09-24T23:00:00.000Z` | 03/01 — waiting on you (build, 1d 6h): Decision needed: split 03? Options: A or B |
      | refine                    | the Background's three lines | answered by `umami` | `2026-09-23T17:12:00.000Z` | 03/01 — answered by umami (refine, 12m)                                     |
      | refine                    | the Background's three lines | parked       | `2026-09-24T17:00:00.000Z` | 03/01 — parked, unanswered (refine, 1d): Decision needed: split 03? Options: A or B   |
      | refine                    | `null`                    | parked          | `2026-09-23T17:12:00.000Z` | 03/01 — parked, unanswered (refine, 12m)                                               |

  Scenario Outline: the block prints each parked question indented, blank lines blank, then how to answer it
    Given a halt <stop> whose `Details.parked` holds <entries>
    When `reportLine` prints it
    Then the lines after the halt line are exactly <lines>

    Examples:
      | stop                          | entries                                                                  | lines                                                                                                                         |
      | on `session-needs-input`      | `03/01` asking `"Decision needed: split 03?\n\nOptions: A or B"`         | `  Decision needed: split 03?`, an empty line, `  Options: A or B`, `  answer: aof work answer 03/01 "…"`                     |
      | on `session-needs-input`      | `03/01` asking `null`                                                    | `  answer: aof work answer 03/01 "…"`                                                                                         |
      | on `session-needs-input`      | `03/01` asking `"a\r\nb"`                                                | `  a`, `  b`, `  answer: aof work answer 03/01 "…"`                                                                            |
      | on `session-needs-input`      | `03/01` asking `"Options:\n  - A\n   \n  - B"`                           | `  Options:`, `    - A`, an empty line, `    - B`, `  answer: aof work answer 03/01 "…"`                                     |
      | on `session-needs-input`      | `03/01` asked at 10:00 `"Q1"`, and `03/02` asked at 09:00 `"Q2"`         | `  Q2`, `  answer: aof work answer 03/02 "…"`, `  Q1`, `  answer: aof work answer 03/01 "…"`                                  |
      | on `operator-interrupt`       | `07/01` asking `"Q"`                                                     | `  Q`, `  answer: aof work answer 07/01 "…"`                                                                                  |
      | on `grade-indeterminate` at `07/02` | `07/01` asking `"Q"`, parked by the drain                          | `  Q`, `  answer: aof work answer 07/01 "…"`                                                                                  |
      | on `run-not-retryable`        | nothing (`Details` carry no `parked`)                                    | none: the halt line is the last line                                                                                           |

  Scenario Outline: the halt line names each parked entry in four keys and stays one line
    Given a `session-needs-input` halt whose `Details.parked` holds <entries>
    When `reportLine` prints it
    Then the halt line contains `<details>`, and it holds no newline and no question text

    Examples:
      | entries                                                                                                           | details                                                                                                                                                  |
      | `{ ref: "03/01", runId: "R", sessionId: "S1", askedAt: "2026-09-23T17:12:00.000Z", question: "Q\nR" }`             | Details: parked=[{"ref":"03/01","runId":"R","sessionId":"S1","askedAt":"2026-09-23T17:12:00.000Z"}].                                                     |
      | `{ ref: "03/01", runId: "R", sessionId: null, askedAt: "2026-09-23T17:12:00.000Z", question: null }`               | Details: parked=[{"ref":"03/01","runId":"R","sessionId":null,"askedAt":"2026-09-23T17:12:00.000Z"}].                                                     |
      | `03/02` (`R2`, `S2`, asked `2026-09-23T09:00:00.000Z`), then `03/01` (`R1`, `S1`, asked `2026-09-23T10:00:00.000Z`) | parked=[{"ref":"03/02","runId":"R2","sessionId":"S2","askedAt":"2026-09-23T09:00:00.000Z"},{"ref":"03/01","runId":"R1","sessionId":"S1","askedAt":"2026-09-23T10:00:00.000Z"}] |

  Scenario Outline: --quiet drops what is in flight and keeps the account
    Given <situation>
    When the loop walks scope `03` with `quiet` <quiet>
    Then a collected line containing `<needle>` appears <count>

    Examples:
      | situation                                                 | quiet   | needle                                 | count |
      | the ask is answered by `umami` after one `heartbeatMs`    | `false` | waiting on you                         | twice |
      | the ask is answered by `umami` after one `heartbeatMs`    | `true`  | waiting on you                         | never |
      | the ask is answered by `umami` after one `heartbeatMs`    | `false` | answered by umami                      | once  |
      | the ask is answered by `umami` after one `heartbeatMs`    | `true`  | answered by umami                      | never |
      | `ctx.askWait` parks at the first check                    | `false` | parked, unanswered                     | once  |
      | `ctx.askWait` parks at the first check                    | `true`  | parked, unanswered                     | never |
      | `ctx.askWait` parks at the first check                    | `true`  | halted on session-needs-input          | once  |
      | `ctx.askWait` parks at the first check                    | `true`  | answer: aof work answer 03/01 "…"      | once  |
      | a stale ask file for `R9`, and `resume: true`             | `false` | Ask R9 — stale                         | once  |
      | a stale ask file for `R9`, and `resume: true`             | `true`  | Ask R9 — stale                         | never |

  Scenario: no row is repainted
    Given the ask is answered after two `heartbeatMs`
    When the loop walks scope `03`
    Then the collector holds three waiting rows, each its own line, and no collected line contains a CR or an ESC byte
