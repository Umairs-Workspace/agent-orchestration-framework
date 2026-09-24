@executable @cli @work @work-stream
Feature: the last assistant turn is read once, in the transcript family, and the question is that turn's own words

  ADR-002 §1-§2. The last-assistant-record scan the driver runs privately today
  (`readTranscriptTerminalOutcome`, `src/agent-session-driver.mjs`) MOVES into
  `src/work/observe.mjs`, the module the driver already imports `claudeProjectsDir` from. Three
  exports land there. `readLastAssistantTurn(file, sinceOffset = 0)` is today's scan verbatim:
  the resume baseline cut, the partial-line drop, the reverse walk, `answeredAfterAssistant`, and
  the text blocks joined as today. It answers `null | { stopReason, text, humanInputTool, answered }`.
  `askQuestionFromTurn(turn)` is pure and answers the question as a string, or `null`.
  `readAskQuestion({ cwd, env, sessionId, sinceOffset })` composes the two and never throws. The
  driver's private scan becomes a mapping over `readLastAssistantTurn` that gives the same four
  answers it gives today, and it holds no `JSON.parse` walk of its own. The driver's export set
  stays the frozen seventeen (`53/FF-5302`).

  RULINGS (PO, 2026-09-23). (1) `humanInputTool` is the pending `tool_use` block, as
  `{ name, input }`, whose `name` is in `HUMAN_INPUT_TOOL_NAMES`, or `null`. The name list has ONE
  home. The driver keeps exporting the name, so the frozen seventeen do not move. (2) The joined
  `text` keeps today's form: each text block followed by one `\n`. A string `content` is taken as
  it is. (3) For a pending human-input tool, `askQuestionFromTurn` renders each question's
  `question` on its own line, followed by that question's option labels as `- <label>` lines, in
  input order, with one blank line between questions. (4) `readAskQuestion` reads
  `<claudeProjectsDir({ cwd, env })>/<sessionId>.jsonl`. It answers `null` after ONE
  `reportDegrade("ask-question-unreadable", …)` when the transcript cannot be read or holds no
  assistant turn after the baseline. A readable turn with nothing to ask answers `null` with no
  degrade. That is not a fault: the session asked nothing in words.

  RULINGS (PO, answering the developer, 2026-09-23). (5) `observe.mjs` may not import the driver,
  which imports it. So `NEEDS_INPUT_SENTINEL` moves to `observe.mjs` beside `HUMAN_INPUT_TOOL_NAMES`,
  and the driver re-exports both names. The frozen seventeen do not move, because FF-5302 compares
  the namespace keys, and `ensureWorktreeTrusted` is already a re-export. (6) The reader cases
  live in `test/session/agent-session-driver-transcript.test.mjs`, a registered suite.
  `test/work/lifecycle/work-observe.test.mjs` is an unregistered `node:test` baseline, and a case
  there would never gate.

  RULINGS (QA, 2026-09-23). (1) `text` is joined for EVERY stop reason, not only `end_turn`, and
  an absent `stop_reason` reads `stopReason: null`. (2) A sentinel line is a line whose `trim()`
  equals the sentinel, the driver's own test. Every other line is kept verbatim, CR included, and
  only the ends of the whole are trimmed. (3) `askQuestionFromTurn` answers `null`, and never
  throws, for anything that is neither an `end_turn` nor an unanswered human-input tool, and for a
  tool input with no usable `questions` array. A question with no `options` renders its line alone.

  Background:
    Given a fixture transcript directory under an isolated `CLAUDE_CONFIG_DIR`, and a session id `S`
    And the degrade sink is the injected test sink (`setDegradeSinkForTest`), reset before every read
    And `A(<stop>, <content>)` is `{ type: "assistant", message: { stop_reason: <stop>, content: <content> } }`, a quoted content item is a `text` block, and `U` is `{ type: "user", message: { content: "ok" } }`
    And `Q` is `{ questions: [{ question: "Which store?", options: [{ label: "sqlite" }, { label: "json" }] }] }`, and records are joined by `\n` with a trailing `\n` unless a row says otherwise

  Scenario: an ended turn answers its stop reason and its joined text
    Given the transcript `S.jsonl` ends with an assistant record whose `stop_reason` is `"end_turn"` and whose content is the text blocks `"Decision needed: move the residue?"` and `"NEEDS_INPUT"`
    When `readLastAssistantTurn(<that file>)` is asked
    Then it answers `{ stopReason: "end_turn", text: "Decision needed: move the residue?\nNEEDS_INPUT\n", humanInputTool: null, answered: false }`

  Scenario: a pending human-input tool answers the tool block and not answered
    Given the transcript ends with an assistant record whose `stop_reason` is `"tool_use"` and whose content holds a `tool_use` block named `"AskUserQuestion"` with input `{ questions: [{ question: "Which store?", options: [{ label: "sqlite" }, { label: "json" }] }] }`
    When `readLastAssistantTurn(<that file>)` is asked
    Then it answers `stopReason: "tool_use"`, `humanInputTool: { name: "AskUserQuestion", input: <that input> }` and `answered: false`
    And with a `user` record appended after it, the same call answers `answered: true`

  Scenario Outline: the turn read from each transcript shape
    Given `S.jsonl` holds <transcript>
    When `readLastAssistantTurn(<that file>)` is asked
    Then it answers `stopReason` <stop>, `text` <text>, `humanInputTool` <tool> and `answered` <answered>

    Examples:
      | transcript                                                                                   | stop           | text              | tool                                      | answered |
      | `A("end_turn", ["Q", "NEEDS_INPUT"])`, records joined by `\r\n`                              | `"end_turn"`   | `"Q\nNEEDS_INPUT\n"` | `null`                                 | `false`  |
      | `A("end_turn", ["Q"])`, then the half-written line `{"type":"assistant","mess` with no `\n`  | `"end_turn"`   | `"Q\n"`           | `null`                                    | `false`  |
      | `A("end_turn", "plain string content")`                                                      | `"end_turn"`   | `"plain string content"` | `null`                             | `false`  |
      | `A("tool_use", ["Let me ask", <tool_use Bash>, <tool_use AskUserQuestion with input Q>])`    | `"tool_use"`   | `"Let me ask\n"`  | `{ name: "AskUserQuestion", input: Q }`   | `false`  |
      | `A("tool_use", [<tool_use Bash>])`                                                           | `"tool_use"`   | `""`              | `null`                                    | `false`  |
      | `A("tool_use", [<tool_use AskUserQuestion with input Q>])`, then a `{ type: "system" }` record | `"tool_use"` | `""`              | `{ name: "AskUserQuestion", input: Q }`   | `false`  |
      | `A("end_turn", ["one"])`, then `{ type: "assistant", message: "x" }`                         | `"end_turn"`   | `"one\n"`         | `null`                                    | `false`  |
      | `A("end_turn", ["old"])`, then `U`                                                           | `"end_turn"`   | `"old\n"`         | `null`                                    | `true`   |
      | `A("max_tokens", ["cut"])`                                                                   | `"max_tokens"` | `"cut\n"`         | `null`                                    | `false`  |
      | an assistant record with no `stop_reason` key and content `["streaming"]`                    | `null`         | `"streaming\n"`   | `null`                                    | `false`  |
      | `A("end_turn", ["a", { type: "text", text: 42 }, "b"])`                                      | `"end_turn"`   | `"a\nb\n"`        | `null`                                    | `false`  |

  Scenario: records at or before the resume baseline are not read
    Given the transcript holds an ended turn carrying the sentinel, and `B` is the file's byte size
    And one assistant record with `stop_reason: null` is then appended
    When `readLastAssistantTurn(<that file>, B)` is asked
    Then it answers `stopReason: null`, and the pre-baseline ended turn is not what it read

  Scenario: an absent or empty transcript answers null
    When `readLastAssistantTurn` is asked of a path that does not exist, and of a zero-byte file
    Then each answers `null`, and no error is thrown

  Scenario Outline: a transcript with no other assistant turn to read answers null
    Given the path `S.jsonl` <state>
    When `readLastAssistantTurn(<that path>)` is asked
    Then it answers `null`, and no error is thrown

    Examples:
      | state                                    |
      | holds only `U` records                   |
      | holds only the unparseable line `{ nope` |
      | is a directory                           |

  Scenario Outline: the resume baseline keeps a record that starts on it and drops a line it cuts
    Given `S.jsonl` is `A("end_turn", ["one"])`, <sep>, `A("end_turn", ["two"])`, <sep>, where `E1` is the byte offset of the second record's first byte and `N` is the file's size
    When `readLastAssistantTurn(<that file>, <offset>)` is asked
    Then it answers <answer>

    Examples:
      | sep    | offset   | answer                                    |
      | `\n`   | `0`      | the turn with `text: "two\n"`             |
      | `\n`   | `5`      | the turn with `text: "two\n"`             |
      | `\n`   | `E1 - 1` | the turn with `text: "two\n"`             |
      | `\n`   | `E1`     | the turn with `text: "two\n"`             |
      | `\n`   | `E1 + 1` | `null`                                    |
      | `\n`   | `N`      | `null`                                    |
      | `\n`   | `N + 10` | `null`                                    |
      | `\r\n` | `E1 - 1` | the turn with `text: "two\n"`             |
      | `\r\n` | `E1`     | the turn with `text: "two\n"`             |
      | `\r\n` | `N`      | `null`                                    |

  Scenario: the question of an ended turn is its text without the sentinel line
    When `askQuestionFromTurn({ stopReason: "end_turn", text: "Decision needed: X\nOptions: a, b\n  NEEDS_INPUT  \nafter\n", humanInputTool: null, answered: false })` is asked
    Then it answers `"Decision needed: X\nOptions: a, b\nafter"`, with the sentinel line gone and the ends trimmed

  Scenario: the question of a pending AskUserQuestion is its questions and option labels
    When `askQuestionFromTurn` is asked of the turn in the pending human-input scenario above
    Then it answers `"Which store?\n- sqlite\n- json"`

  Scenario Outline: the question is the turn's own words, and nothing else
    Given `end(<t>)` is `{ stopReason: "end_turn", text: <t>, humanInputTool: null, answered: false }` and `ask(<i>)` is `{ stopReason: "tool_use", text: "", humanInputTool: { name: "AskUserQuestion", input: <i> }, answered: false }`
    When `askQuestionFromTurn(<turn>)` is asked
    Then it answers <question>, and no error is thrown

    Examples:
      | turn                                                                                       | question                                  |
      | `end("Decision needed: X\nNEEDS_INPUT\n")`                                                 | `"Decision needed: X"`                    |
      | `end("Run NEEDS_INPUT now\nNEEDS_INPUT\n")`                                                | `"Run NEEDS_INPUT now"`                   |
      | `end("NEEDS_INPUT.\nNEEDS_INPUT_X\n")`                                                     | `"NEEDS_INPUT.\nNEEDS_INPUT_X"`           |
      | `end("A\r\nNEEDS_INPUT\r\nB\r\n")`                                                         | `"A\r\nB"`                                |
      | `end("done\n")`                                                                            | `"done"`                                  |
      | `end("NEEDS_INPUT\nNEEDS_INPUT\n")`                                                        | `null`                                    |
      | `end("")`                                                                                  | `null`                                    |
      | `end("  \n\t\n")`                                                                          | `null`                                    |
      | `ask(Q)` with `text: "preamble\n"`                                                         | `"Which store?\n- sqlite\n- json"`        |
      | `ask({ questions: [{ question: "Q1", options: [{ label: "a" }, { label: "b" }] }, { question: "Q2", options: [{ label: "c" }] }] })` | `"Q1\n- a\n- b\n\nQ2\n- c"` |
      | `ask({ questions: [{ question: "Q3" }] })`                                                 | `"Q3"`                                    |
      | `ask({})`                                                                                  | `null`                                    |
      | `ask({ questions: [] })`                                                                   | `null`                                    |
      | `ask({ questions: "Q" })`                                                                  | `null`                                    |
      | `ask(Q)` with `answered: true`                                                             | `null`                                    |
      | `{ stopReason: null, text: "x\n", humanInputTool: null, answered: false }`                 | `null`                                    |
      | `{ stopReason: "max_tokens", text: "cut\n", humanInputTool: null, answered: false }`       | `null`                                    |
      | `null`                                                                                     | `null`                                    |

  Scenario: readAskQuestion composes the home, the reader and the question
    Given `S.jsonl` sits in `claudeProjectsDir({ cwd: <C>, env: <E> })` and ends in an ended turn whose text is `"Decision needed: X\nNEEDS_INPUT"`
    When `readAskQuestion({ cwd: <C>, env: <E>, sessionId: "S", sinceOffset: 0 })` is awaited
    Then it answers `"Decision needed: X"`, and the degrade sink received nothing

  Scenario: readAskQuestion never throws, and a fault degrades by name
    When `readAskQuestion` is awaited for a session whose transcript does not exist
    Then it answers `null`
    And the degrade sink received exactly one event coded `"ask-question-unreadable"`

  Scenario Outline: readAskQuestion answers a fault once, and a turn with nothing to ask quietly
    Given `S.jsonl`, under `claudeProjectsDir({ cwd: <C>, env: <E> })`, <state>
    When `readAskQuestion({ cwd: <C>, env: <E>, sessionId: <id>, sinceOffset: <offset> })` is awaited
    Then it answers <answer>, and no error is thrown
    And the degrade sink received <degrades> coded `"ask-question-unreadable"`

    Examples:
      | state                                                              | id          | offset   | answer                             | degrades  |
      | ends in `A("tool_use", [<tool_use AskUserQuestion with input Q>])` | `"S"`       | `0`      | `"Which store?\n- sqlite\n- json"` | no event  |
      | ends in `A("end_turn", ["NEEDS_INPUT"])`                           | `"S"`       | `0`      | `null`                             | no event  |
      | ends in an assistant record with `stop_reason: null`               | `"S"`       | `0`      | `null`                             | no event  |
      | is a directory                                                     | `"S"`       | `0`      | `null`                             | one event |
      | holds only `U` records                                             | `"S"`       | `0`      | `null`                             | one event |
      | ends in `A("end_turn", ["Decision needed: X", "NEEDS_INPUT"])`     | `"S"`       | its size | `null`                             | one event |
      | ends in `A("end_turn", ["Decision needed: X", "NEEDS_INPUT"])`     | `undefined` | `0`      | `null`                             | one event |

  Scenario Outline: the driver's outcome for each last turn is the one it gives today
    Given `S.jsonl` ends in <turn>
    When the driver's transcript outcome is observed the way `test/session/agent-session-driver-transcript.test.mjs` observes it
    Then it is <outcome>

    Examples:
      | turn                                                                   | outcome                                                    |
      | `A("end_turn", ["Q", "NEEDS_INPUT"])`                                  | `{ outcome: "needs-input", declared: true }`               |
      | `A("end_turn", ["all done", "AOF_DIRECTIVE_COMPLETE"])`                | `{ outcome: "done", declared: true }`                      |
      | `A("end_turn", ["all done"])`                                          | `{ outcome: "done", declared: false }`                     |
      | `A("end_turn", ["say NEEDS_INPUT here"])`                              | `{ outcome: "done", declared: false }`                     |
      | `A("tool_use", [<tool_use AskUserQuestion with input Q>])`             | `{ outcome: "needs-input", declared: true, pending: true }` |
      | `A("tool_use", [<tool_use AskUserQuestion with input Q>])`, then `U`   | not settled (`null`)                                       |
      | `A("tool_use", [<tool_use Bash>])`                                     | not settled (`null`)                                       |
      | an assistant record with `stop_reason: null`                           | not settled (`null`)                                       |
      | `A("max_tokens", ["cut"])`                                             | not settled (`null`)                                       |

  Scenario: the driver's scan is a mapping over the one reader, and its answers are unchanged
    When `src/agent-session-driver.mjs` is read with its comments stripped
    Then it imports `readLastAssistantTurn` from `./work/observe.mjs`
    And it contains no `JSON.parse(` call inside a loop over transcript lines, and no other `src/**` module reads `stop_reason` from a parsed transcript line. The one other `stop_reason` read, `defaultSpawnRuntime` parsing the codex runtime's stdout result, is not a transcript scan and stays
    And its export names deep-equal the frozen seventeen of `53/FF-5302`
    And `test/session/agent-session-driver-transcript.test.mjs`'s existing outcome cases stay green without their assertions edited
