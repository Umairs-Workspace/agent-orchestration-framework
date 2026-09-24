@executable @cli @work @work-stream
Feature: an answer is refused blank, over-long or carrying control characters, in answerAsk and nowhere else

  ADR-003 §1-§2. `answerAsk(dir, { workspaceId, ref, text, by, now })` is the verb's one write to
  the ask file (the verb itself is story 04's). It finds the ask for this `workspaceId` and `ref`,
  and moves it to `answered` from `waiting` or `parked`, stamping `answer`, `answeredAt` and
  `by = { actor, via, node }`. Sanitation lives here and nowhere else. A blank answer is refused
  `answer-empty`. More than 8,000 characters is refused `answer-too-long`. Any C0 control other
  than TAB, LF or CR, or DEL, is refused `answer-control-chars`. All three are status 400. The
  driver types the answer inside a bracketed paste, so an `ESC [ 201 ~` would close the paste and
  type keystrokes into an agent with shell access. Anything else is stored verbatim. The first
  answer wins: a second answer is refused `ask-already-answered` (409), and the refusal names who
  gave the first.

  RULINGS (PO, 2026-09-23). (1) A refusal is a thrown error carrying `code` and `status`, the way
  `run-store.mjs`'s `runError` carries them. (2) Sanitation runs BEFORE the lookup, so a bad
  answer is refused 400 whether or not an ask exists, and no file is read or written. (3) "Blank"
  means a non-string, or a string that is empty after `trim()`. (4) Length is counted in code
  points (`[...text].length`), so 8,000 is admitted and 8,001 is refused. (5) The stored `answer`
  is the text exactly as given: not trimmed, not normalised. (6) When the workspace and ref have
  no ask in any state, `answerAsk` answers `null` and writes nothing. That is how the verb knows to
  try the mesh leg before it refuses `answer-not-waiting` (ADR-003 §5c-d). (7) When more than one
  file matches the workspace and ref, the one with the latest `askedAt` is the ask.

  RULINGS (QA, 2026-09-23). (1) The three checks run in the ADR's order, blank, then length, then
  controls, and the first that fails names the refusal. So a lone `\u000b` or `\u000c`, which
  `trim()` removes, is refused `answer-empty`. (2) A control is refused wherever it sits: first,
  last or inside. (3) A file that is not a record is skipped as `readAsks` skips it (task 02), so
  a ref whose only file is corrupt answers `null`.

  Background:
    Given an isolated aof home and `dir` = its `loopAsksDir`
    And an ask for run `R1`, workspace `"w1"`, ref `"131/01"` has been opened `waiting`
    And `BY` = `{ actor: "you", via: "cli", node: "node-7297" }`, `NOW` = `() => new Date("2026-09-23T17:05:00.000Z")`

  Scenario: an answer to a waiting ask is stored verbatim with who and when
    When `answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "  take b — the residue is ignored\n", by: BY, now: NOW })` is awaited
    Then it answers the written record
    And `readAsk(dir, "R1")` reads `state: "answered"`, `answer: "  take b — the residue is ignored\n"`, `answeredAt: "2026-09-23T17:05:00.000Z"` and `by` deep-equal to `BY`

  Scenario: a parked ask takes an answer too
    Given the ask for `R1` has been parked
    When `answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "b", by: BY, now: NOW })` is awaited
    Then `readAsk(dir, "R1")` reads `state: "answered"`, and its `parkedAt` is kept

  Scenario Outline: a bad answer is refused before any file is read
    When `answerAsk(dir, { workspaceId: "w1", ref: <ref>, text: <text>, by: BY, now: NOW })` is awaited
    Then it rejects with `code` `<code>` and `status` 400
    And the file for `R1` is byte-unchanged

    Examples:
      | ref            | text                              | code                 |
      | `"131/01"`     | `""`                              | answer-empty         |
      | `"131/01"`     | `"  \n\t "`                       | answer-empty         |
      | `"131/01"`     | a string of 8,001 `"a"`           | answer-too-long      |
      | `"131/01"`     | `"ok\u001b[201~rm -rf ."`         | answer-control-chars |
      | `"131/01"`     | `"ok\u007f"`                      | answer-control-chars |
      | `"999/99"`     | `""`                              | answer-empty         |
      | `"131/01"`     | `undefined`                       | answer-empty         |
      | `"131/01"`     | `null`                            | answer-empty         |
      | `"131/01"`     | the number `42`                   | answer-empty         |
      | `"131/01"`     | `"\r\n"`                          | answer-empty         |
      | `"131/01"`     | U+00A0 then U+3000, nothing else  | answer-empty         |
      | `"131/01"`     | `"\u000b"`                        | answer-empty         |
      | `"131/01"`     | `"\u000c"`                        | answer-empty         |
      | `"131/01"`     | `"\u0000ok"`                      | answer-control-chars |
      | `"131/01"`     | `"ok\u0000"`                      | answer-control-chars |
      | `"131/01"`     | `"\u0000"`                        | answer-control-chars |
      | `"131/01"`     | `"a\u0008b"`                      | answer-control-chars |
      | `"131/01"`     | `"a\u000bb"`                      | answer-control-chars |
      | `"131/01"`     | `"a\u000cb"`                      | answer-control-chars |
      | `"131/01"`     | `"ok\u001f"`                      | answer-control-chars |
      | `"131/01"`     | `"\u001b[201~"`                   | answer-control-chars |
      | `"131/01"`     | 8,001 `"a"` then `"\u0000"`       | answer-too-long      |
      | `"131/01"`     | 8,001 `"😀"` (16,002 UTF-16 units) | answer-too-long     |
      | `"131/01"`     | 8,000 `"a"` then `"😀"`           | answer-too-long      |
      | `"999/99"`     | `"ok\u001b"`                      | answer-control-chars |

  Scenario: a bad answer is refused even when there is no ask directory at all
    Given `dir` does not exist
    When `answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "ok\u001b", by: BY, now: NOW })` is awaited
    Then it rejects with `code` `answer-control-chars` and `status` 400, and `dir` still does not exist

  Scenario Outline: the three whitespace controls and the upper limit are admitted
    When `answerAsk` is awaited with the text <text>
    Then it answers the written record, and the stored `answer` is <text> exactly

    Examples:
      | text                                    |
      | `"a\tb\r\nc"`                           |
      | a string of 8,000 `"a"`                 |
      | `"\ta"`                                 |
      | `"a\r"`                                 |
      | `"x\n"`                                 |
      | 8,000 `"😀"` (16,000 UTF-16 units)      |
      | 7,999 `"a"` then `"😀"`                 |
      | `"café — naïve 😀"`                     |
      | `"a"`, U+00A0, `"b"`                    |
      | `"[201~ with no ESC"`                   |

  Scenario: the first answer wins, and the refusal names who gave it
    Given `answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "b", by: BY, now: NOW })` has been awaited
    When `answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "c", by: { actor: "board", via: "board", node: "node-7297" }, now: NOW })` is awaited
    Then it rejects with `code` `ask-already-answered` and `status` 409, and its message names `"you"`
    And `readAsk(dir, "R1")` still reads `answer: "b"`

  Scenario: a ref with no ask answers null and writes nothing
    When `answerAsk(dir, { workspaceId: "w1", ref: "131/02", text: "b", by: BY, now: NOW })` is awaited
    Then it answers `null`, and the listing of `dir` is unchanged

  Scenario Outline: the answer after each prior state of the ask
    Given the ask for `R1` <prior>
    When `answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "b", by: BY, now: NOW })` is awaited
    Then it <outcome>

    Examples:
      | prior                                                            | outcome                                                                                      |
      | has been parked, and then answered `"a"` by `BY`                 | rejects `ask-already-answered` (409) naming `"you"`, and `answer` still reads `"a"`          |
      | has been answered, and then re-opened by `openAsk` as `"Decision needed: Y"` | answers the written record, `question: "Decision needed: Y"`, `answer: "b"`      |
      | has been cleared by `clearAsk`                                   | answers `null`, and no file is created                                                       |
      | has had its file overwritten with `{ not json`                   | answers `null`, and the file is byte-unchanged                                               |

  Scenario Outline: of two asks for one workspace and ref, the latest askedAt is the ask
    Given `R1` for `w1` and `"131/01"` was asked at `17:00` and is <r1>, and `R3` for the same was asked at `17:03` and is <r3>
    When `answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "b", by: BY, now: NOW })` is awaited
    Then it <outcome>, and `R1`'s file is byte-unchanged

    Examples:
      | r1        | r3        | outcome                                                  |
      | answered  | waiting   | answers `R3`'s record, now `answered` with `answer: "b"` |
      | waiting   | answered  | rejects `ask-already-answered` (409)                     |
      | waiting   | parked    | answers `R3`'s record, now `answered` with `answer: "b"` |

  Scenario: another workspace's ask for the same ref is not touched
    Given an ask for run `R2`, workspace `"w2"`, ref `"131/01"` has been opened `waiting`
    When `answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "b", by: BY, now: NOW })` is awaited
    Then `readAsk(dir, "R2")` still reads `state: "waiting"`
