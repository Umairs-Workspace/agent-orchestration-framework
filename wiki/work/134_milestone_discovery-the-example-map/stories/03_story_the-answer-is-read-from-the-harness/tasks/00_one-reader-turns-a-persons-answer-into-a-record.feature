@executable @cli @work @work-stream
Feature: One reader turns a person's answer in the harness transcript into a record, and nothing else reads it

  WHY. An example may be labelled `confirmed` or `stated` only when a person agreed to it, and the
  label is checked against a record the agent did not write (SPEC, ADR-003). That record is the
  harness's own `toolUseResult` on the `user` line that answers an `AskUserQuestion` call
  (RESEARCH R1). If two modules read it, they can disagree about what counts as an answer, so one
  module does, `src/work-examples/answers.mjs`, and FF-13401 holds the rest of `src/**` to that.

  The reader keeps only answers whose question opens with a map token (`<story ref> Q<n>` or
  `<story ref> E<n>`, read by story 02's `readMapToken`). An answered question becomes one record.
  A refused call becomes none. The record names the giver only as the record supports it: the person
  at that session's harness, through that entrypoint (RESEARCH R3).

  RULINGS (developer feasibility, 2026-09-24, measured over this project's 47 answered and 8
  refused calls).
  (1) An answered call is a `user` line whose `tool_result` block names the asking block's id and
      whose top-level `toolUseResult` is an OBJECT `{ questions, answers }`; `is_error` is absent
      on it. A refused call's `toolUseResult` is the STRING `"User rejected tool use"` with
      `is_error: true`. The reader type-guards: only an object `toolUseResult` can yield a record.
  (2) One call may ask several questions (17 of 47). Each tokened key of its one `answers` object
      is one record, all under the same `toolUseId`, so a record is identified by
      `(toolUseId, question)`, never by `toolUseId` alone.
  (3) The answer is kept verbatim as the harness wrote it. `multiSelect` was never observed, so its
      encoding is unmeasured; the reader keeps whatever string is there and interprets nothing.
  (4) `entrypoint` was present on every answered line; a line without one still yields a record,
      with `entrypoint: null`.

  RULINGS (QA, 2026-09-24).
  (1) A result is linked to its call only through `tool_use_id` = the `id` of an asking `tool_use`
      block whose `name` is in `HUMAN_INPUT_TOOL_NAMES`. A result for any other tool, or for an id no
      asking block carries, yields nothing, whatever its `toolUseResult` holds.
  (2) An `answers` key counts only when it is the text of a question the asking block's
      `input.questions` asked. A key the call never asked yields nothing: the anchor claims a person
      was asked, and the asking block is the only record of what was asked.
  (3) A result with `is_error: true` yields nothing even when its `toolUseResult` is an object. An
      answer that is not a non-empty string yields nothing (the writer, task 01, refuses one).
      A non-empty answer is kept exactly, surrounding spaces included.
  (4) Records come in transcript line order, and within one call in the order of `input.questions`.
  (5) A line that is not JSON is skipped, and the lines around it are still read.

  Background:
    Given `readAnswers` is imported from `src/work-examples/answers.mjs`
    And every transcript below is a fixture `.jsonl` text held in memory, built from the line shapes RESEARCH R1 measured

  Scenario Outline: an answered question with a token becomes one record — <case>
    Given a transcript whose `assistant` line makes <asked>
    And whose `user` line answers with <result>
    When `readAnswers` reads the transcript
    Then it returns <records>

    Examples:
      | case                             | asked                                                                                         | result                                                                                                  | records                                                                    |
      | one tokened question             | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | an object `toolUseResult` answering it `anyone with an account`                                         | one record, token `134/02 Q1`, answer `anyone with an account`             |
      | an example put to confirm        | an `AskUserQuestion` call `toolu_01` asking `134/02 E2 · active loan → not offered. Is that right?` | an object `toolUseResult` answering it `Yes`                                                      | one record, token `134/02 E2`, answer `Yes`                                |
      | a free-text "Other" answer       | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | an object `toolUseResult` answering it, through "Other", `Members only — not on Sundays.`               | one record whose answer is `Members only — not on Sundays.`, byte for byte |
      | an answer with outer spaces      | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | an object `toolUseResult` answering it `" anyone, mostly "`                                             | one record whose answer is `" anyone, mostly "`, not trimmed               |
      | several questions in one call    | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who?`, `134/02 Q2 · when?` and `Which seam?` | an object `toolUseResult` answering all three                                                   | two records, `134/02 Q1` then `134/02 Q2`, both with toolUseId `toolu_01`  |
      | an untokened question            | an `AskUserQuestion` call `toolu_01` asking `Which seam should the reader hang off?`          | an object `toolUseResult` answering it                                                                  | no record                                                                  |
      | a token not at the head          | an `AskUserQuestion` call `toolu_01` asking `Is 134/02 Q1 settled?`                           | an object `toolUseResult` answering it                                                                  | no record                                                                  |
      | a refused call                   | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | the string `toolUseResult` `User rejected tool use`, with `is_error: true`                              | no record                                                                  |
      | an error with an object result   | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | an object `toolUseResult` answering it `anyone`, with `is_error: true`                                  | no record                                                                  |
      | a result for another tool        | a `Bash` call `toolu_01`                                                                      | a `tool_result` for `toolu_01` whose object `toolUseResult` answers `134/02 Q1 · who may borrow?`       | no record                                                                  |
      | a result with no asking block    | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | a `tool_result` for `toolu_02` whose object `toolUseResult` answers `134/02 Q1 · who may borrow?`       | no record                                                                  |
      | an answer to a question not asked | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                    | an object `toolUseResult` whose only `answers` key is `134/02 Q2 · who may lend?`                       | no record                                                                  |
      | an empty answer                  | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | an object `toolUseResult` answering it `""`                                                             | no record                                                                  |
      | an answer that is not a string   | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | an object `toolUseResult` answering it with the list `["a", "b"]`                                       | no record                                                                  |
      | a question still pending         | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | nothing yet: the transcript ends at the asking line                                                     | no record                                                                  |
      | asked again after a refusal      | two `AskUserQuestion` calls, `toolu_01` and `toolu_02`, each asking `134/02 Q1 · who may borrow?` | a refusal for `toolu_01`, then an object `toolUseResult` for `toolu_02` answering it `anyone`       | one record, with toolUseId `toolu_02`                                      |
      | a malformed line between         | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`, then the line `{not json` | an object `toolUseResult` answering it `anyone`                                                  | one record, token `134/02 Q1`                                              |
      | a line with no entrypoint        | an `AskUserQuestion` call `toolu_01` asking `134/02 Q1 · who may borrow?`                     | an object `toolUseResult` answering it `anyone`, on a line with no `entrypoint`                         | one record, with `entrypoint: null`                                        |

  Scenario: the record carries the token, the question, the answer and the channel that gave it
    Given a transcript in which the question `134/02 Q1 · who may borrow?` was answered `anyone with an account`
    When `readAnswers` reads the transcript
    Then the one record is `{ token, question, answer, toolUseId, sessionId, at, entrypoint }`
    And `token` is `134/02 Q1`, `toolUseId` is the asking block's id, and `sessionId`, `at` and `entrypoint` are the answering line's own `sessionId`, `timestamp` and `entrypoint`
    And no field names a person

  Scenario: the tool's name is read from its one home
    Given `HUMAN_INPUT_TOOL_NAMES` in `src/agent-session-driver.mjs` is replaced, for this test, by a list that does not hold `AskUserQuestion`
    When `readAnswers` reads a transcript holding an answered, tokened `AskUserQuestion` call
    Then it returns no record

  Scenario Outline: a transcript the reader cannot read yields nothing and never throws — <input>
    When `readAnswers` is given <input>
    Then it returns an empty list and does not throw

    Examples:
      | input                                             |
      | `null`                                            |
      | `undefined`                                       |
      | the empty string `""`                             |
      | the number `42`                                   |
      | the object `{}`                                   |
      | the text `{not json` and `}{` on two lines        |
      | a text of well-formed lines with no asking block  |

  Scenario: FF-13401 — the harness's answer has one reader in the source tree
    Given the comment-stripped text of every `src/**/*.mjs` module
    When the control `test/arch/examples/acd-example-answer-one-reader.test.mjs` scans it
    Then `toolUseResult` appears in `src/work-examples/answers.mjs` and in no other module
    And `answers.mjs` does not spell the string `AskUserQuestion`
    And `answers` is written onto a run's `brief` only inside `recordAnswers` in `src/run-store.mjs`, and by no other function or module
    And a planted second reader, a planted spelling of the tool name in `answers.mjs`, or a planted second writer of `brief.answers`, turns the control red
